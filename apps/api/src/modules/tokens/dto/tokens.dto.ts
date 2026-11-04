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
import { TokenActionCostKey } from '@brands-creators/types';

export class SpendTokensDto {
  @IsEnum(TokenActionCostKey)
  @IsNotEmpty()
  actionKey: TokenActionCostKey;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdminGrantTokensDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class AdminDeductTokensDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class UpdateTokenReferenceRateDto {
  @IsNumber()
  @IsPositive()
  rateInInr: number;
}

export class UpdateTokenActionCostDto {
  @IsEnum(TokenActionCostKey)
  @IsNotEmpty()
  actionKey: TokenActionCostKey;

  @IsInt()
  @Min(0)
  costTokens: number;

  @IsOptional()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

