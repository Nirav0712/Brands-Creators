import { Injectable, Logger } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { MessageReadEventPayload } from './messaging.types';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly gateway: MessagingGateway) {}

  notifyNewMessage(conversationId: string, message: any, participantUserIds: string[]) {
    try {
      this.gateway.emitNewMessage(conversationId, message, participantUserIds);
    } catch (err: any) {
      this.logger.error(`Failed to emit new message event: ${err.message}`);
    }
  }

  notifyMessageUpdated(conversationId: string, message: any) {
    try {
      this.gateway.emitMessageUpdated(conversationId, message);
    } catch (err: any) {
      this.logger.error(`Failed to emit message updated event: ${err.message}`);
    }
  }

  notifyMessageDeleted(conversationId: string, messageId: string) {
    try {
      this.gateway.emitMessageDeleted(conversationId, messageId);
    } catch (err: any) {
      this.logger.error(`Failed to emit message deleted event: ${err.message}`);
    }
  }

  notifyMessageRead(conversationId: string, payload: MessageReadEventPayload) {
    try {
      this.gateway.emitMessageRead(conversationId, payload);
    } catch (err: any) {
      this.logger.error(`Failed to emit message read event: ${err.message}`);
    }
  }
}
