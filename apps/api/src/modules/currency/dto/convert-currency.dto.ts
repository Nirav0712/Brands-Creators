import { IsNumber, IsString, IsNotEmpty, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SupportedCurrency, SUPPORTED_CURRENCIES } from '@brands-creators/types';

export class ConvertCurrencyDto {
  @IsNumber({}, { message: 'amount must be a valid number' })
  @Min(0, { message: 'amount cannot be negative' })
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'from currency code is required' })
  @IsIn(SUPPORTED_CURRENCIES, {
    message: `from currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
  })
  from: SupportedCurrency;

  @IsString()
  @IsNotEmpty({ message: 'to currency code is required' })
  @IsIn(SUPPORTED_CURRENCIES, {
    message: `to currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
  })
  to: SupportedCurrency;
}
