import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProviderType } from '@brands-creators/types';

export class CreatePaymentOrderDto {
  @ApiPropertyOptional({ enum: PaymentProviderType, default: PaymentProviderType.RAZORPAY })
  @IsOptional()
  @IsEnum(PaymentProviderType)
  provider?: PaymentProviderType;

  @ApiPropertyOptional({ description: 'Optional milestone ID for milestone-based payments' })
  @IsOptional()
  @IsString()
  milestoneId?: string;

  @ApiPropertyOptional({ description: 'Client-supplied idempotency key' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Client-supplied amount (ignored by server; derived from project budget)' })
  @IsOptional()
  amount?: number;
}
