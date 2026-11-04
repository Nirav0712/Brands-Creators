import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentProviderType } from '@brands-creators/types';

export class QueryPaymentsDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentProviderType })
  @IsOptional()
  @IsEnum(PaymentProviderType)
  provider?: PaymentProviderType;

  @ApiPropertyOptional({ description: 'Filter by Project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by Brand User ID' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ description: 'Filter by Professional User ID' })
  @IsOptional()
  @IsString()
  professionalId?: string;

  @ApiPropertyOptional({ description: 'Search term for paymentNumber or project' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
