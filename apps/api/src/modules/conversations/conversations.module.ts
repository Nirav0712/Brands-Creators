import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Requirement, RequirementSchema } from '../requirements/schemas/requirement.schema';
import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Requirement.name, schema: RequirementSchema },
      { name: BrandProfile.name, schema: BrandProfileSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    MessagingModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
