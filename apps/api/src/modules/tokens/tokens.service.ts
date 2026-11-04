import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TokenWallet, TokenWalletDocument } from './schemas/token-wallet.schema';
import { TokenLedgerEntry, TokenLedgerEntryDocument } from './schemas/token-ledger-entry.schema';
import { TokenPricingRule, TokenPricingRuleDocument } from './schemas/token-pricing-rule.schema';
import {
  TokenLedgerType,
  TokenLedgerDirection,
  TokenActionCostKey,
} from '@brands-creators/types';
import {
  SpendTokensDto,
  AdminGrantTokensDto,
  AdminDeductTokensDto,
  UpdateTokenActionCostDto,
} from './dto/tokens.dto';

@Injectable()
export class TokensService implements OnModuleInit {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    @InjectModel(TokenWallet.name) private readonly walletModel: Model<TokenWalletDocument>,
    @InjectModel(TokenLedgerEntry.name) private readonly ledgerModel: Model<TokenLedgerEntryDocument>,
    @InjectModel(TokenPricingRule.name) private readonly ruleModel: Model<TokenPricingRuleDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPricingRules();
  }

  private async seedDefaultPricingRules() {
    const defaults: Array<{ actionKey: TokenActionCostKey; name: string; cost: number; desc: string }> = [
      {
        actionKey: TokenActionCostKey.REQUIREMENT_POST,
        name: 'Post Marketplace Requirement',
        cost: 2,
        desc: 'Tokens charged to brands when publishing a campaign brief.',
      },
      {
        actionKey: TokenActionCostKey.PROPOSAL_SUBMIT,
        name: 'Submit Creator Proposal',
        cost: 1,
        desc: 'Tokens charged to creators applying for opportunities.',
      },
      {
        actionKey: TokenActionCostKey.DIRECT_MESSAGE,
        name: 'Initiate Direct Inbound Message',
        cost: 1,
        desc: 'Tokens for starting a new direct thread outside active projects.',
      },
      {
        actionKey: TokenActionCostKey.CONTACT_UNLOCK,
        name: 'Unlock Verified Contact Dossier',
        cost: 5,
        desc: 'Tokens to view full phone/portfolio dossier of unshortlisted profiles.',
      },
      {
        actionKey: TokenActionCostKey.FEATURED_BOOST,
        name: 'Featured Marketplace Spotlight',
        cost: 10,
        desc: 'Tokens to spotlight profile or campaign on the explore showcase.',
      },
      {
        actionKey: TokenActionCostKey.PORTFOLIO_EXPANSION,
        name: 'Extended Portfolio Slot',
        cost: 3,
        desc: 'Tokens to add extra high-resolution 4K project reels.',
      },
    ];

    for (const d of defaults) {
      const existing = await this.ruleModel.findOne({ actionKey: d.actionKey });
      if (!existing) {
        await this.ruleModel.create({
          actionKey: d.actionKey,
          name: d.name,
          costTokens: d.cost,
          isEnabled: true,
          description: d.desc,
          updatedBy: 'SYSTEM',
        });
      }
    }
    this.logger.log('Token pricing action rules initialized.');
  }

  async getOrCreateWallet(userId: string | Types.ObjectId): Promise<TokenWalletDocument> {
    const uId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    let wallet = await this.walletModel.findOne({ userId: uId });
    if (!wallet) {
      try {
        wallet = await this.walletModel.create({
          userId: uId,
          balance: 0,
          totalReceived: 0,
          totalSpent: 0,
          currencyReferenceRate: 10,
        });
      } catch (err: any) {
        if (err.code === 11000) {
          wallet = await this.walletModel.findOne({ userId: uId });
        } else {
          throw err;
        }
      }
    }
    return wallet!;
  }

  async getWallet(userId: string): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      _id: wallet._id,
      userId: wallet.userId,
      balance: wallet.balance,
      totalReceived: wallet.totalReceived,
      totalSpent: wallet.totalSpent,
      currencyReferenceRate: wallet.currencyReferenceRate,
      referenceValueInInr: wallet.balance * (wallet.currencyReferenceRate || 10),
      lastTransactionAt: wallet.lastTransactionAt,
      updatedAt: (wallet as any).updatedAt,
    };
  }

  async creditTokens(params: {
    userId: string | Types.ObjectId;
    amount: number;
    type: TokenLedgerType;
    reason: string;
    sourceRefId?: string;
    performedBy?: string;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
  }): Promise<{ wallet: TokenWalletDocument; entry: TokenLedgerEntryDocument }> {
    const { userId, amount, type, reason, sourceRefId, performedBy = 'SYSTEM', idempotencyKey, metadata } = params;

    if (amount <= 0) {
      throw new BadRequestException('Credit amount must be greater than zero.');
    }

    const uId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    // Idempotency check
    if (idempotencyKey) {
      const existingEntry = await this.ledgerModel.findOne({ idempotencyKey });
      if (existingEntry) {
        const wallet = await this.getOrCreateWallet(uId);
        return { wallet, entry: existingEntry };
      }
    }

    // Atomic increment
    const updatedWallet = await this.walletModel.findOneAndUpdate(
      { userId: uId },
      {
        $inc: { balance: amount, totalReceived: amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, upsert: true },
    );

    const entry = await this.ledgerModel.create({
      userId: uId,
      walletId: updatedWallet._id,
      amount,
      balanceAfter: updatedWallet.balance,
      type,
      direction: TokenLedgerDirection.CREDIT,
      sourceRefId,
      performedBy,
      reason,
      idempotencyKey,
      metadata,
    });

    return { wallet: updatedWallet, entry };
  }

  async deductTokens(params: {
    userId: string | Types.ObjectId;
    amount: number;
    type: TokenLedgerType;
    reason: string;
    sourceRefId?: string;
    performedBy?: string;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
  }): Promise<{ wallet: TokenWalletDocument; entry: TokenLedgerEntryDocument }> {
    const { userId, amount, type, reason, sourceRefId, performedBy = 'SYSTEM', idempotencyKey, metadata } = params;

    if (amount <= 0) {
      throw new BadRequestException('Deduction amount must be greater than zero.');
    }

    const uId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    // Idempotency check
    if (idempotencyKey) {
      const existingEntry = await this.ledgerModel.findOne({ idempotencyKey });
      if (existingEntry) {
        const wallet = await this.getOrCreateWallet(uId);
        return { wallet, entry: existingEntry };
      }
    }

    // Atomic conditional decrement: prevents race condition / negative balance
    const updatedWallet = await this.walletModel.findOneAndUpdate(
      { userId: uId, balance: { $gte: amount } },
      {
        $inc: { balance: -amount, totalSpent: amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true },
    );

    if (!updatedWallet) {
      const current = await this.getOrCreateWallet(uId);
      throw new BadRequestException(
        `Insufficient token balance. Action requires ${amount} tokens, but you only have ${current.balance}.`,
      );
    }

    const entry = await this.ledgerModel.create({
      userId: uId,
      walletId: updatedWallet._id,
      amount,
      balanceAfter: updatedWallet.balance,
      type,
      direction: TokenLedgerDirection.DEBIT,
      sourceRefId,
      performedBy,
      reason,
      idempotencyKey,
      metadata,
    });

    return { wallet: updatedWallet, entry };
  }

  async spendTokensForAction(userId: string, dto: SpendTokensDto) {
    const rule = await this.ruleModel.findOne({ actionKey: dto.actionKey });
    if (!rule || !rule.isEnabled) {
      return { success: true, tokensDeducted: 0, message: 'Action is currently free.' };
    }

    if (rule.costTokens === 0) {
      return { success: true, tokensDeducted: 0, message: 'Action cost is 0 tokens.' };
    }

    const idempotencyKey = dto.idempotencyKey || `spend-${userId}-${dto.actionKey}-${dto.referenceId || Date.now()}`;

    const { wallet, entry } = await this.deductTokens({
      userId,
      amount: rule.costTokens,
      type: TokenLedgerType.SPEND,
      reason: `Spent for ${rule.name}${dto.note ? `: ${dto.note}` : ''}`,
      sourceRefId: dto.referenceId,
      performedBy: userId,
      idempotencyKey,
      metadata: { actionKey: dto.actionKey, referenceId: dto.referenceId },
    });

    return {
      success: true,
      actionKey: dto.actionKey,
      tokensDeducted: rule.costTokens,
      newBalance: wallet.balance,
      transactionId: entry._id,
      referenceValueInInr: wallet.balance * (wallet.currencyReferenceRate || 10),
    };
  }

  async refundTokens(params: {
    userId: string;
    originalIdempotencyKey: string;
    reason: string;
    performedBy?: string;
  }) {
    const { userId, originalIdempotencyKey, reason, performedBy = 'SYSTEM' } = params;
    const originalEntry = await this.ledgerModel.findOne({ idempotencyKey: originalIdempotencyKey });
    if (!originalEntry) {
      throw new NotFoundException('Original token spending record not found.');
    }

    const refundIdempotencyKey = `refund-${originalIdempotencyKey}`;
    return this.creditTokens({
      userId,
      amount: originalEntry.amount,
      type: TokenLedgerType.REFUND,
      reason: `Refund: ${reason}`,
      sourceRefId: originalEntry._id.toString(),
      performedBy,
      idempotencyKey: refundIdempotencyKey,
    });
  }

  async adminGrantTokens(adminUserId: string, dto: AdminGrantTokensDto) {
    return this.creditTokens({
      userId: dto.userId,
      amount: dto.amount,
      type: TokenLedgerType.ADMIN_BONUS,
      reason: `Admin Grant: ${dto.reason}`,
      performedBy: adminUserId,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  async adminDeductTokens(adminUserId: string, dto: AdminDeductTokensDto) {
    return this.deductTokens({
      userId: dto.userId,
      amount: dto.amount,
      type: TokenLedgerType.ADJUSTMENT,
      reason: `Admin Adjustment: ${dto.reason}`,
      performedBy: adminUserId,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  async getLedgerEntries(filter: {
    userId?: string;
    type?: TokenLedgerType;
    direction?: TokenLedgerDirection;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filter.userId && Types.ObjectId.isValid(filter.userId)) {
      query.userId = new Types.ObjectId(filter.userId);
    }
    if (filter.type) query.type = filter.type;
    if (filter.direction) query.direction = filter.direction;

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.ledgerModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.ledgerModel.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reconcileWallet(userId: string) {
    const uId = new Types.ObjectId(userId);
    const wallet = await this.getOrCreateWallet(uId);

    const entries = await this.ledgerModel.find({ userId: uId }).lean();
    let calculatedBalance = 0;
    let totalCredits = 0;
    let totalDebits = 0;

    for (const e of entries) {
      if (e.direction === TokenLedgerDirection.CREDIT) {
        calculatedBalance += e.amount;
        totalCredits += e.amount;
      } else if (e.direction === TokenLedgerDirection.DEBIT) {
        calculatedBalance -= e.amount;
        totalDebits += e.amount;
      }
    }

    const isReconciled = wallet.balance === calculatedBalance;
    const discrepancy = wallet.balance - calculatedBalance;

    return {
      userId,
      walletBalance: wallet.balance,
      calculatedBalance,
      totalCredits,
      totalDebits,
      totalEntries: entries.length,
      isReconciled,
      discrepancy,
    };
  }

  async getAllWallets(page = 1, limit = 20) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (p - 1) * l;

    const [wallets, total] = await Promise.all([
      this.walletModel
        .find()
        .populate('userId', 'fullName email username roles')
        .sort({ balance: -1 })
        .skip(skip)
        .limit(l)
        .lean()
        .exec(),
      this.walletModel.countDocuments(),
    ]);

    return {
      items: wallets,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }

  async getPricingRules(): Promise<TokenPricingRuleDocument[]> {
    return this.ruleModel.find().sort({ costTokens: 1 }).exec();
  }

  async updatePricingRule(adminUserId: string, dto: UpdateTokenActionCostDto) {
    const updated = await this.ruleModel.findOneAndUpdate(
      { actionKey: dto.actionKey },
      {
        $set: {
          costTokens: dto.costTokens,
          ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
          ...(dto.description && { description: dto.description }),
          updatedBy: adminUserId,
        },
      },
      { new: true, upsert: true },
    );
    return updated;
  }

  async updateReferenceRate(rateInInr: number) {
    if (rateInInr <= 0) {
      throw new BadRequestException('Reference rate must be positive.');
    }
    await this.walletModel.updateMany({}, { $set: { currencyReferenceRate: rateInInr } });
    return { success: true, rateInInr };
  }
}

