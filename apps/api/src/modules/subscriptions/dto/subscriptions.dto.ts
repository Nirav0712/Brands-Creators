import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { SubscriptionPlanDuration, UserRole } from '@brands-creators/types';

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(SubscriptionPlanDuration)
  duration: SubscriptionPlanDuration;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsInt()
  @Min(0)
  includedTokens: number;

  @IsOptional()
  @IsArray()
  entitlements?: string[];

  @IsOptional()
  @IsArray()
  allowedRoles?: UserRole[];

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateSubscriptionPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(SubscriptionPlanDuration)
  duration?: SubscriptionPlanDuration;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  includedTokens?: number;

  @IsOptional()
  @IsArray()
  entitlements?: string[];

  @IsOptional()
  @IsArray()
  allowedRoles?: UserRole[];

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class SubscribeFreeDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}

