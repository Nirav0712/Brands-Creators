import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { TokenWallet, TokenWalletSchema } from './schemas/token-wallet.schema';
import { TokenLedgerEntry, TokenLedgerEntrySchema } from './schemas/token-ledger-entry.schema';
import { TokenPricingRule, TokenPricingRuleSchema } from './schemas/token-pricing-rule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TokenWallet.name, schema: TokenWalletSchema },
      { name: TokenLedgerEntry.name, schema: TokenLedgerEntrySchema },
      { name: TokenPricingRule.name, schema: TokenPricingRuleSchema },
    ]),
  ],
  controllers: [TokensController],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}

