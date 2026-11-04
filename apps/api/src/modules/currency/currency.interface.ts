import { SupportedCurrency } from '@brands-creators/types';

export interface ExchangeRatesResult {
  base: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  asOf: string;
  isStale: boolean;
  isFallback: boolean;
  provider: string;
}

export interface CurrencyConversionResult {
  originalAmount: number;
  originalCurrency: SupportedCurrency;
  targetCurrency: SupportedCurrency;
  convertedAmount: number;
  exchangeRate: number;
  asOf: string;
  isStale: boolean;
  isEstimated: true;
  isFallback: boolean;
}

export interface CurrencyMetadata {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  decimalPlaces: number;
}
