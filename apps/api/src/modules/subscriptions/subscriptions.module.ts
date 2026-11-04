import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlan, SubscriptionPlanSchema } from './schemas/subscription-plan.schema';
import { UserSubscription, UserSubscriptionSchema } from './schemas/user-subscription.schema';
import { TokensModule } from '../tokens/tokens.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
    ]),
    TokensModule,
    forwardRef(() => NotificationsModule),
    ConfigModule,
    JwtModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

