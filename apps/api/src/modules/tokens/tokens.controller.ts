import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, TokenLedgerType, TokenLedgerDirection } from '@brands-creators/types';
import {
  SpendTokensDto,
  AdminGrantTokensDto,
  AdminDeductTokensDto,
  UpdateTokenReferenceRateDto,
  UpdateTokenActionCostDto,
} from './dto/tokens.dto';

@ApiTags('Tokens & Wallet')
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get('action-costs')
  @ApiOperation({ summary: 'Get current token cost rules for marketplace actions' })
  async getActionCosts() {
    return this.tokensService.getPricingRules();
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user token wallet' })
  async getMyWallet(@CurrentUser() user: any) {
    return this.tokensService.getWallet(user._id.toString());
  }

  @Get('ledger')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user token ledger transaction history' })
  async getMyLedger(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: TokenLedgerType,
    @Query('direction') direction?: TokenLedgerDirection,
  ) {
    return this.tokensService.getLedgerEntries({
      userId: user._id.toString(),
      page,
      limit,
      type,
      direction,
    });
  }

  @Post('spend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Spend tokens for an authorized marketplace action' })
  async spendTokens(@CurrentUser() user: any, @Body() dto: SpendTokensDto) {
    return this.tokensService.spendTokensForAction(user._id.toString(), dto);
  }

  // ================= ADMIN ENDPOINTS =================

  @Get('admin/wallets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all user token wallets (Admin)' })
  async getAllWallets(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tokensService.getAllWallets(page, limit);
  }

  @Post('admin/grant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin manual token grant with audit reason' })
  async adminGrantTokens(@CurrentUser() admin: any, @Body() dto: AdminGrantTokensDto) {
    return this.tokensService.adminGrantTokens(admin._id.toString(), dto);
  }

  @Post('admin/deduct')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin manual token deduction with audit reason' })
  async adminDeductTokens(@CurrentUser() admin: any, @Body() dto: AdminDeductTokensDto) {
    return this.tokensService.adminDeductTokens(admin._id.toString(), dto);
  }

  @Get('admin/ledger')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query full platform token ledger audit trail (Admin)' })
  async getAdminLedger(
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: TokenLedgerType,
    @Query('direction') direction?: TokenLedgerDirection,
  ) {
    return this.tokensService.getLedgerEntries({
      userId,
      page,
      limit,
      type,
      direction,
    });
  }

  @Post('admin/reconcile/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconcile wallet balance against all ledger entries (Admin)' })
  async reconcileWallet(@Param('userId') userId: string) {
    return this.tokensService.reconcileWallet(userId);
  }

  @Patch('admin/reference-rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure token reference value in INR (Admin)' })
  async updateReferenceRate(@Body() dto: UpdateTokenReferenceRateDto) {
    return this.tokensService.updateReferenceRate(dto.rateInInr);
  }

  @Put('admin/action-costs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure action cost rules in tokens (Admin)' })
  async updatePricingRule(@CurrentUser() admin: any, @Body() dto: UpdateTokenActionCostDto) {
    return this.tokensService.updatePricingRule(admin._id.toString(), dto);
  }
}

