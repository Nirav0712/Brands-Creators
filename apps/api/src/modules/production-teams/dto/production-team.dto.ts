import { IsOptional, IsString, IsNumber, IsArray, ValidateNested, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { VerificationStatus, ProfileVisibility, PricingModel, AvailabilityStatus } from '@brands-creators/types';
import { AddPortfolioItemDto, ServiceOfferDto } from '../../creators/dto/creator.dto';

export class ProductionFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  minRate?: number;

  @IsOptional()
  @Type(() => Number)
  maxRate?: number;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibilityStatus?: ProfileVisibility;
}

export class ProductionClientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  projectTitle?: string;
}

export class UpdateProductionProfileDto {
  @IsOptional()
  @IsString()
  studioName?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  teamSize?: number;

  @IsOptional()
  @IsNumber()
  foundedYear?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentRoster?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceOfferDto)
  services?: ServiceOfferDto[];

  @IsOptional()
  location?: {
    city: string;
    state?: string;
    country: string;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceAreas?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  startingDayRate?: number;

  @IsOptional()
  @IsEnum(PricingModel)
  pricingModel?: PricingModel;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availability?: AvailabilityStatus;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibilityStatus?: ProfileVisibility;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionClientDto)
  previousClients?: ProductionClientDto[];
}
