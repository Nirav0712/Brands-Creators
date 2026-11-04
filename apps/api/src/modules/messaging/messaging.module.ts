import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret') || 'dev_jwt_access_secret_brands_creators_2026',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MessagingGateway, MessagingService],
  exports: [MessagingGateway, MessagingService],
})
export class MessagingModule {}
