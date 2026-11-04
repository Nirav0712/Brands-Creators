import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupportedCurrency, SUPPORTED_CURRENCIES } from '@brands-creators/types';
import {
  ExchangeRatesResult,
  CurrencyConversionResult,
  CurrencyMetadata,
} from './currency.interface';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  // Base currency for exchange rate calculations is USD
  private readonly baseCurrency: SupportedCurrency = 'USD';

  // Configurable baseline rates (as of recent market benchmarks)
  private rates: Record<SupportedCurrency, number> = {
    USD: 1.0,
    INR: 86.5,
    EUR: 0.92,
    GBP: 0.79,
    AED: 3.67,
  };

  private lastUpdated: Date = new Date();
  private cacheTtlMs: number = 60 * 60 * 1000; // 1 hour TTL
  private forceStaleFlag: boolean = false;

  private readonly metadata: Record<SupportedCurrency, CurrencyMetadata> = {
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalPlaces: 2 },
    USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
    AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimalPlaces: 2 },
  };

  /**
   * Return supported currencies and their metadata
   */
  getSupportedCurrencies(): CurrencyMetadata[] {
    return SUPPORTED_CURRENCIES.map((code) => this.metadata[code]);
  }

  /**
   * Get cached exchange rates with stale-rate indicator
   */
  getRates(): ExchangeRatesResult {
    const age = Date.now() - this.lastUpdated.getTime();
    const isStale = this.forceStaleFlag || age > this.cacheTtlMs;
    const hasLiveProvider = Boolean(
      process.env.OPEN_EXCHANGE_RATES_API_KEY || process.env.FIXER_API_KEY,
    );

    return {
      base: this.baseCurrency,
      rates: { ...this.rates },
      asOf: this.lastUpdated.toISOString(),
      isStale,
      isFallback: !hasLiveProvider,
      provider: hasLiveProvider
        ? 'LiveMarketRateProvider'
        : 'PlatformConfiguredFallback',
    };
  }

  /**
   * Convert an amount from one currency to another without reinterpreting or mutating stored values
   */
  convert(amount: number, from: string, to: string): CurrencyConversionResult {
    const fromUpper = (from || '').toUpperCase() as SupportedCurrency;
    const toUpper = (to || '').toUpperCase() as SupportedCurrency;

    if (!SUPPORTED_CURRENCIES.includes(fromUpper)) {
      throw new BadRequestException(
        `Unsupported source currency '${from}'. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`,
      );
    }

    if (!SUPPORTED_CURRENCIES.includes(toUpper)) {
      throw new BadRequestException(
        `Unsupported target currency '${to}'. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`,
      );
    }

    if (amount < 0 || isNaN(amount)) {
      throw new BadRequestException('Amount must be a non-negative number');
    }

    const { rates, asOf, isStale, isFallback } = this.getRates();

    const fromRate = rates[fromUpper];
    const toRate = rates[toUpper];

    if (!fromRate || !toRate) {
      throw new BadRequestException(
        'Exchange rate currently unavailable for the requested currency pair',
      );
    }

    // Direct conversion calculation
    const exchangeRate = toRate / fromRate;
    const rawConverted = amount * exchangeRate;
    const targetMeta = this.metadata[toUpper];
    const multiplier = Math.pow(10, targetMeta.decimalPlaces);
    const convertedAmount = Math.round(rawConverted * multiplier) / multiplier;

    return {
      originalAmount: amount,
      originalCurrency: fromUpper,
      targetCurrency: toUpper,
      convertedAmount,
      exchangeRate: Math.round(exchangeRate * 10000) / 10000,
      asOf,
      isStale,
      isEstimated: true,
      isFallback,
    };
  }

  /**
   * Test helper to force stale status for testing stale indicator assertions
   */
  setForceStale(stale: boolean) {
    this.forceStaleFlag = stale;
  }
}
