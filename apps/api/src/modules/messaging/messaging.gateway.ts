import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { TypingEventPayload, MessageReadEventPayload } from './messaging.types';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId || payload.id;

      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.user = {
        userId: userId.toString(),
        email: payload.email,
        role: payload.role,
      };

      if (!this.userSockets.has(userId.toString())) {
        this.userSockets.set(userId.toString(), new Set());
      }
      this.userSockets.get(userId.toString())!.add(client.id);

      // Join user's personal notifications/presence room
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (err: any) {
      this.logger.warn(`Unauthorized socket connection attempt: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.user?.userId;
    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId)!;
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) return { success: false, error: 'Missing conversationId' };

    const userId = client.data?.user?.userId;
    const role = client.data?.user?.role;
    if (!userId) {
      return { success: false, error: 'Unauthorized socket session' };
    }

    if (Types.ObjectId.isValid(data.conversationId)) {
      const conv = await this.conversationModel.findById(data.conversationId).lean();
      if (!conv) {
        return { success: false, error: 'Conversation not found' };
      }
      const isParticipant = conv.participants?.some(
        (p: any) => p.userId?.toString() === userId.toString(),
      );
      const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
      if (!isParticipant && !isAdmin) {
        return { success: false, error: 'Forbidden: You are not a participant in this conversation' };
      }
    }

    client.join(`conversation:${data.conversationId}`);
    return { success: true, room: `conversation:${data.conversationId}` };
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) return { success: false, error: 'Missing conversationId' };
    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.user?.userId;
    if (!userId || !data?.conversationId) return;

    const payload: TypingEventPayload = {
      conversationId: data.conversationId,
      userId,
      isTyping: true,
    };
    client.to(`conversation:${data.conversationId}`).emit('typing:status', payload);
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.user?.userId;
    if (!userId || !data?.conversationId) return;

    const payload: TypingEventPayload = {
      conversationId: data.conversationId,
      userId,
      isTyping: false,
    };
    client.to(`conversation:${data.conversationId}`).emit('typing:status', payload);
  }

  // Server-side broadcasting helpers
  emitNewMessage(conversationId: string, message: any, participantUserIds: string[]) {
    if (this.server) {
      // Emit to room
      this.server.to(`conversation:${conversationId}`).emit('message:new', message);

      // Also notify individual users who may not have the active conversation room open
      participantUserIds.forEach((uid) => {
        this.server.to(`user:${uid}`).emit('conversation:updated', {
          conversationId,
          lastMessage: message,
          timestamp: new Date(),
        });
      });
    }
  }

  emitMessageUpdated(conversationId: string, message: any) {
    if (this.server) {
      this.server.to(`conversation:${conversationId}`).emit('message:updated', message);
    }
  }

  emitMessageDeleted(conversationId: string, messageId: string) {
    if (this.server) {
      this.server.to(`conversation:${conversationId}`).emit('message:deleted', {
        conversationId,
        messageId,
      });
    }
  }

  emitMessageRead(conversationId: string, payload: MessageReadEventPayload) {
    if (this.server) {
      this.server.to(`conversation:${conversationId}`).emit('message:read', payload);
    }
  }

  // Real-time Notification broadcasting helpers (Phase 07)
  emitNotification(userId: string, notification: any, unreadCount?: number) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification:new', notification);
      if (typeof unreadCount === 'number') {
        this.server.to(`user:${userId}`).emit('notification:unread-count', { unreadCount });
      }
    }
  }

  emitNotificationRead(userId: string, notificationId: string, unreadCount?: number) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification:read', { notificationId });
      if (typeof unreadCount === 'number') {
        this.server.to(`user:${userId}`).emit('notification:unread-count', { unreadCount });
      }
    }
  }

  emitNotificationReadAll(userId: string) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification:read-all', { success: true });
      this.server.to(`user:${userId}`).emit('notification:unread-count', { unreadCount: 0 });
    }
  }
}
