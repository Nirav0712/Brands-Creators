import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Payout, PayoutSchema } from './schemas/payout.schema';
import { PaymentWebhook, PaymentWebhookSchema } from './schemas/payment-webhook.schema';
import { PaymentSettings, PaymentSettingsSchema } from './schemas/payment-settings.schema';
import { ManualPaymentRequest, ManualPaymentRequestSchema } from './schemas/manual-payment-request.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { PaymentsService } from './payments.service';
import { TransactionsService } from './transactions.service';
import { PayoutsService } from './payouts.service';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PaymentsController } from './payments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { ProjectsModule } from '../projects/projects.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Payout.name, schema: PayoutSchema },
      { name: PaymentWebhook.name, schema: PaymentWebhookSchema },
      { name: PaymentSettings.name, schema: PaymentSettingsSchema },
      { name: ManualPaymentRequest.name, schema: ManualPaymentRequestSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    NotificationsModule,
    PlatformSettingsModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => TokensModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    TransactionsService,
    PayoutsService,
    RazorpayProvider,
    StripeProvider,
  ],
  exports: [PaymentsService, TransactionsService, PayoutsService],
})
export class PaymentsModule {}
