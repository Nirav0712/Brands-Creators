import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as mongoose from 'mongoose';
import configuration from './config/configuration';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ProductionTeamsModule } from './modules/production-teams/production-teams.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ShortlistsModule } from './modules/shortlists/shortlists.module';
import { SocialModule } from './modules/social/social.module';
import { MediaModule } from './modules/media/media.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { PlatformSettingsModule } from './modules/platform-settings/platform-settings.module';
import { AdminModule } from './modules/admin/admin.module';
import { MatchingModule } from './modules/matching/matching.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AiModule } from './modules/ai/ai.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { HealthModule } from './modules/health/health.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';

import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120, // 120 requests per minute rate-limit window
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        let uri = configService.get<string>('database.uri') || 'mongodb://127.0.0.1:27017/brands_creators_dev';

        if (uri.startsWith('mongodb+srv://') || uri.includes('mongodb.net')) {
          try {
            logger.log('Testing connection to MongoDB Atlas Cluster...');
            const testConn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 2500 }).asPromise();
            await testConn.close();
            logger.log('✅ Connected to MongoDB Atlas successfully.');
          } catch (err: any) {
            logger.warn(`⚠️ MongoDB Atlas unreachable (${err.message}). Falling back to local MongoDB daemon.`);
            uri = 'mongodb://127.0.0.1:27017/brands_creators_dev';
          }
        } else {
          logger.log(`Connecting to MongoDB instance at: ${uri}`);
        }

        return {
          uri,
          autoIndex: true,
          serverSelectionTimeoutMS: 5000,
          retryAttempts: 2,
          retryDelay: 1000,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    CreatorsModule,
    BrandsModule,
    ProductionTeamsModule,
    RequirementsModule,
    ApplicationsModule,
    ShortlistsModule,
    SocialModule,
    MediaModule,
    AuditLogsModule,
    PlatformSettingsModule,
    AdminModule,
    MatchingModule,
    NotificationsModule,
    ConversationsModule,
    MessagesModule,
    MessagingModule,
    ProjectsModule,
    PaymentsModule,
    ReviewsModule,
    AiModule,
    CurrencyModule,
    HealthModule,
    TokensModule,
    SubscriptionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
