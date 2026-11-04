import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ManualPaymentMethod, ManualPaymentTargetType } from '@brands-creators/types';

export class CreateManualPaymentDto {
  @IsEnum(ManualPaymentTargetType)
  @IsNotEmpty()
  targetType: ManualPaymentTargetType;

  @IsOptional()
  @IsString()
  targetPlanId?: string;

  @IsOptional()
  @IsString()
  tokenPackageId?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  tokenPackageQuantity?: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(ManualPaymentMethod)
  @IsNotEmpty()
  paymentMethod: ManualPaymentMethod;

  @IsString()
  @IsNotEmpty({ message: 'Transaction Reference or UTR is required' })
  transactionReference: string;

  @IsOptional()
  @IsString()
  senderIdentifier?: string;

  @IsOptional()
  @IsString()
  proofImageUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

