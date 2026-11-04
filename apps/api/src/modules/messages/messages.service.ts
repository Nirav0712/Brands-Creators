import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { MessageReport, MessageReportDocument } from './schemas/message-report.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import {
  MessageType,
  MessageStatus,
  NotificationType,
  UserRole,
  MessageReportStatus,
} from '@brands-creators/types';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(MessageReport.name)
    private readonly messageReportModel: Model<MessageReportDocument>,
    @InjectModel('User')
    private readonly userModel: Model<any>,
    private readonly notificationsService: NotificationsService,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * Send a new message within a conversation
   */
  async sendMessage(
    conversationId: string,
    dto: CreateMessageDto,
    senderUserId: string,
    senderUserRole: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    if (!dto.text?.trim() && (!dto.attachments || dto.attachments.length === 0)) {
      throw new BadRequestException('Message must contain text or at least one attachment');
    }

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Authorization: verify sender is a participant or admin
    const senderObjId = new Types.ObjectId(senderUserId);
    const isParticipant = conversation.participants.some(
      (p) => p.userId.toString() === senderUserId.toString(),
    );
    const isAdmin = senderUserRole === UserRole.ADMIN || senderUserRole === UserRole.SUPER_ADMIN;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Verify replyToMessageId if provided
    let replyMsgDoc: any = null;
    if (dto.replyToMessageId) {
      if (!Types.ObjectId.isValid(dto.replyToMessageId)) {
        throw new BadRequestException('Invalid replyToMessageId');
      }
      replyMsgDoc = await this.messageModel.findById(dto.replyToMessageId);
      if (!replyMsgDoc) {
        throw new NotFoundException('Referenced reply message not found');
      }
      if (replyMsgDoc.conversationId.toString() !== conversation._id.toString()) {
        throw new BadRequestException(
          'Cannot reply to a message from a different conversation',
        );
      }
    }

    // Create message document
    const message = new this.messageModel({
      conversationId: conversation._id,
      senderId: senderObjId,
      messageType: dto.messageType || MessageType.TEXT,
      text: dto.text?.trim() || '',
      attachments: dto.attachments || [],
      replyToMessageId: replyMsgDoc ? replyMsgDoc._id : undefined,
      metadata: dto.metadata,
      status: MessageStatus.SENT,
      readBy: [{ userId: senderObjId, readAt: new Date() }],
    });

    const savedMessage = await message.save();

    // Update conversation metadata
    const previewText =
      dto.text?.trim()?.slice(0, 200) ||
      (dto.attachments?.length ? `[Attachment: ${dto.attachments[0].fileName}]` : 'Message');

    const now = new Date();
    await this.conversationModel.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessageId: savedMessage._id,
        lastMessageAt: now,
        lastMessagePreview: previewText,
        'participants.$[elem].lastReadAt': now,
      },
      $inc: { messageCount: 1 },
    }, {
      arrayFilters: [{ 'elem.userId': senderObjId }],
    });

    // Populate sender info for return and realtime broadcast
    const populated = await this.messageModel
      .findById(savedMessage._id)
      .populate('senderId', 'fullName email avatarUrl username roles')
      .populate('replyToMessageId', 'text messageType senderId status')
      .lean();

    // Realtime broadcast via WebSocket
    const participantUserIds = conversation.participants.map((p) => p.userId.toString());
    this.messagingService.notifyNewMessage(
      conversation._id.toString(),
      populated,
      participantUserIds,
    );

    // Dispatch in-app notifications to other participants
    const senderUser = await this.userModel.findById(senderUserId);
    const senderName = senderUser?.fullName || 'Someone';

    const otherParticipants = conversation.participants.filter(
      (p) => p.userId.toString() !== senderUserId.toString() && !p.muted,
    );

    for (const p of otherParticipants) {
      await this.notificationsService.create({
        userId: p.userId,
        type: NotificationType.NEW_MESSAGE,
        title: `New message from ${senderName}`,
        message: previewText,
        link: `/inbox?conversationId=${conversation._id}`,
        metadata: {
          conversationId: conversation._id.toString(),
          messageId: savedMessage._id.toString(),
        },
      });
    }

    return populated;
  }

  /**
   * Retrieve paginated messages for a conversation
   */
  async getMessages(
    conversationId: string,
    query: QueryMessagesDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Authorization check
    const isParticipant = conversation.participants.some(
      (p) => p.userId.toString() === userId.toString(),
    );
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('You do not have access to this conversation history');
    }

    const filter: Record<string, any> = {
      conversationId: new Types.ObjectId(conversationId),
    };

    if (query.before && Types.ObjectId.isValid(query.before)) {
      filter._id = { $lt: new Types.ObjectId(query.before) };
    } else if (query.after && Types.ObjectId.isValid(query.after)) {
      filter._id = { $gt: new Types.ObjectId(query.after) };
    }

    const limit = Math.min(query.limit || 50, 100);

    const messages = await this.messageModel
      .find(filter)
      .populate('senderId', 'fullName email avatarUrl username roles brandProfileId creatorProfileId')
      .populate('replyToMessageId', 'text messageType senderId status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Return in chronological order
    const ordered = messages.reverse();

    return {
      items: ordered,
      count: ordered.length,
      nextCursor: messages.length > 0 ? messages[0]._id : null,
      prevCursor: messages.length > 0 ? messages[messages.length - 1]._id : null,
    };
  }

  /**
   * Edit a sent message
   */
  async editMessage(
    messageId: string,
    dto: UpdateMessageDto,
    userId: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID');
    }

    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    if (message.status === MessageStatus.DELETED) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    message.text = dto.text.trim();
    message.status = MessageStatus.EDITED;
    message.editedAt = new Date();

    await message.save();

    const populated = await this.messageModel
      .findById(message._id)
      .populate('senderId', 'fullName email avatarUrl username roles')
      .populate('replyToMessageId', 'text messageType senderId status')
      .lean();

    this.messagingService.notifyMessageUpdated(
      message.conversationId.toString(),
      populated,
    );

    return populated;
  }

  /**
   * Soft-delete a message
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    userRole: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID');
    }

    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isSender = message.senderId.toString() === userId.toString();
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (!isSender && !isAdmin) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.status = MessageStatus.DELETED;
    message.deletedAt = new Date();
    message.deletedBy = new Types.ObjectId(userId);
    message.text = 'This message was deleted';
    message.attachments = [];

    await message.save();

    this.messagingService.notifyMessageDeleted(
      message.conversationId.toString(),
      message._id.toString(),
    );

    return { success: true, messageId: message._id.toString() };
  }

  /**
   * Report an inappropriate or fraudulent message
   */
  async reportMessage(
    messageId: string,
    dto: ReportMessageDto,
    userId: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID');
    }

    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const existing = await this.messageReportModel.findOne({
      messageId: message._id,
      reportedBy: new Types.ObjectId(userId),
    });

    if (existing) {
      return existing;
    }

    const report = new this.messageReportModel({
      messageId: message._id,
      conversationId: message.conversationId,
      reportedBy: new Types.ObjectId(userId),
      reason: dto.reason,
      description: dto.description,
      status: MessageReportStatus.PENDING,
    });

    return report.save();
  }

  /**
   * Admin: List all reported messages
   */
  async getReportsForAdmin(status?: string): Promise<any[]> {
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    return this.messageReportModel
      .find(filter)
      .populate('messageId')
      .populate('reportedBy', 'fullName email username roles')
      .populate('resolvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Admin: Resolve a message report
   */
  async resolveReport(
    reportId: string,
    status: MessageReportStatus,
    adminUserId: string,
  ): Promise<any> {
    const report = await this.messageReportModel.findByIdAndUpdate(
      reportId,
      {
        $set: {
          status,
          resolvedAt: new Date(),
          resolvedBy: new Types.ObjectId(adminUserId),
        },
      },
      { new: true },
    );

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }
}
