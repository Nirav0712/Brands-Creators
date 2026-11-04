import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UserRole,
  ManualPaymentStatus,
  ManualPaymentTargetType,
  ManualPaymentMethod,
} from '@brands-creators/types';
import { PaymentsService } from './payments.service';
import { TransactionsService } from './transactions.service';
import { PayoutsService } from './payouts.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { CreateManualPaymentDto } from './dto/create-manual-payment.dto';
import { ReviewManualPaymentDto } from './dto/review-manual-payment.dto';

@ApiTags('Payments & Commercial Ledger')
@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly transactionsService: TransactionsService,
    private readonly payoutsService: PayoutsService,
  ) {}

  // =========================================================================
  // 1. Payment Orders & Verification
  // =========================================================================

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('payments/projects/:projectId/order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create server-authoritative payment order for project' })
  async createProjectOrder(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    return this.paymentsService.createProjectOrder(projectId, dto, req.user);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('payments/razorpay/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature server-side and capture funds' })
  async verifyRazorpayPayment(@Request() req: any, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyRazorpayPayment(dto, req.user);
  }

  @Post('payments/webhooks/razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process verified Razorpay webhook events idempotently' })
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(payload);
    return this.paymentsService.handleRazorpayWebhook(rawBody, signature || '', payload);
  }

  @Post('payments/webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process verified Stripe webhook events idempotently' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() payload: any,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(payload);
    return this.paymentsService.handleStripeWebhook(rawBody, signature || '', payload);
  }

  // =========================================================================
  // 2. Payments Listing & Details
  // =========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('payments')
  @ApiOperation({ summary: 'List payments for authenticated user or admin' })
  async getPayments(@Request() req: any, @Query() query: QueryPaymentsDto) {
    return this.paymentsService.findAll(req.user, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('payments/earnings/summary')
  @ApiOperation({ summary: 'Get current professional earnings and payout breakdown' })
  async getEarningsSummary(@Request() req: any) {
    const userId = req.user.userId || req.user._id?.toString() || req.user.id;
    return this.paymentsService.getEarningsSummary(userId);
  }

  // =========================================================================
  // Phase 22: Manual Payments & Settings (Declared before :id wildcard)
  // =========================================================================

  @Get('payments/settings')
  @ApiOperation({ summary: 'Get active payment methods and manual bank/UPI transfer instructions' })
  async getPaymentSettings() {
    return this.paymentsService.getPaymentSettings();
  }

  @Get('payments/token-packages')
  @ApiOperation({ summary: 'Get pre-configured token purchase packages' })
  async getTokenPackages() {
    return this.paymentsService.getTokenPackages();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('payments/manual-request')
  @ApiOperation({ summary: 'Create a manual payment verification request (UPI / Bank Transfer)' })
  async createManualPaymentRequest(@CurrentUser() user: any, @Body() dto: CreateManualPaymentDto) {
    return this.paymentsService.createManualPaymentRequest(user._id.toString(), dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('payments/manual-requests')
  @ApiOperation({ summary: 'Get current user manual payment verification requests' })
  async getUserManualPayments(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getUserManualPayments(user._id.toString(), page, limit);
  }

  // Admin endpoints
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('payments/admin/settings')
  @ApiOperation({ summary: 'Get full payment settings (Admin)' })
  async getAdminPaymentSettings() {
    return this.paymentsService.getPaymentSettings();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put('payments/admin/settings')
  @ApiOperation({ summary: 'Update payment settings (UPI, QR, Bank details) (Admin)' })
  async updateAdminPaymentSettings(@CurrentUser() admin: any, @Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentsService.updatePaymentSettings(admin._id.toString(), dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('payments/admin/manual-requests')
  @ApiOperation({ summary: 'Get all manual payment verification requests (Admin)' })
  async getAdminManualPayments(
    @Query('status') status?: ManualPaymentStatus,
    @Query('targetType') targetType?: ManualPaymentTargetType,
    @Query('paymentMethod') paymentMethod?: ManualPaymentMethod,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getAdminManualPayments({
      status,
      targetType,
      paymentMethod,
      search,
      page,
      limit,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('payments/admin/manual-requests/:id/review')
  @ApiOperation({ summary: 'Review and approve/reject a manual payment request (Admin)' })
  async reviewManualPayment(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ReviewManualPaymentDto,
  ) {
    return this.paymentsService.reviewManualPayment(admin._id.toString(), id, dto);
  }

  // =========================================================================
  // Parameterized payment routes
  // =========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('payments/:id')
  @ApiOperation({ summary: 'Get single payment details' })
  async getPaymentById(@Request() req: any, @Param('id') id: string) {
    return this.paymentsService.findById(id, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('payments/:id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process full or partial refund for a paid project' })
  async processRefund(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.processRefund(id, dto, req.user);
  }

  // =========================================================================
  // 3. Transactions Ledger
  // =========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  @ApiOperation({ summary: 'List financial ledger transactions' })
  async getTransactions(@Request() req: any, @Query() query: any) {
    return this.transactionsService.findAll(req.user, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction ledger details' })
  async getTransactionById(@Request() req: any, @Param('id') id: string) {
    return this.transactionsService.findById(id, req.user);
  }

  // =========================================================================
  // 4. Payouts
  // =========================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('payouts')
  @ApiOperation({ summary: 'List payout records for professional or admin' })
  async getPayouts(@Request() req: any, @Query() query: any) {
    return this.payoutsService.findAll(req.user, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('payouts/:id')
  @ApiOperation({ summary: 'Get single payout record details' })
  async getPayoutById(@Request() req: any, @Param('id') id: string) {
    return this.payoutsService.findById(id, req.user);
  }
}
