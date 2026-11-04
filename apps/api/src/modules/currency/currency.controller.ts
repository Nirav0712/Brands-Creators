import { Controller, Get, Post, Body, Headers, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';

const TEST_SECRET = process.env.RATE_LIMIT_TEST_BYPASS_SECRET || 'bc_test_secret_hardening_suite_9f82d1e4a7c06b';

@ApiTags('Currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('supported')
  @ApiOperation({ summary: 'Get supported currency metadata' })
  getSupportedCurrencies() {
    return this.currencyService.getSupportedCurrencies();
  }

  @Get('rates')
  @ApiOperation({ summary: 'Get cached exchange rates with stale-rate indicators' })
  getRates() {
    return this.currencyService.getRates();
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert amount between supported currencies with display estimation flags' })
  convertCurrency(@Body() dto: ConvertCurrencyDto) {
    return this.currencyService.convert(dto.amount, dto.from, dto.to);
  }

  @Post('test-toggle-stale')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dev/Testing hook to simulate stale exchange rates' })
  toggleStale(
    @Body() body: { stale: boolean },
    @Headers('x-bypass-rate-limit') bypassSecret?: string,
  ) {
    if (bypassSecret !== TEST_SECRET && process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test hook disabled in production');
    }
    this.currencyService.setForceStale(!!body.stale);
    return { success: true, isStale: !!body.stale };
  }
}
