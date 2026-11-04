import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessageReport, MessageReportSchema } from './schemas/message-report.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: MessageReport.name, schema: MessageReportSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    MessagingModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
