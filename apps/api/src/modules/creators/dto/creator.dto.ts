import { IsOptional, IsString, IsNumber, IsEnum, IsArray, ValidateNested, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import {
  AvailabilityStatus,
  ServiceMode,
  VerificationStatus,
  PricingModel,
  ExperienceLevel,
  ProfileVisibility,
} from '@brands-creators/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreatorFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  serviceArea?: string;

  @IsOptional()
  @IsEnum(ServiceMode)
  serviceMode?: ServiceMode;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availability?: AvailabilityStatus;

  @IsOptional()
  @IsEnum(PricingModel)
  pricingModel?: PricingModel;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  minRating?: number;

  @IsOptional()
  @IsString()
  skills?: string; // Comma-separated

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibilityStatus?: ProfileVisibility;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  featured?: boolean;
}

export class ServiceOfferDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  startingPrice: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PricingModel)
  pricingModel?: PricingModel;

  @IsOptional()
  @IsNumber()
  deliveryDays?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class AddCollaborationDto {
  @IsString()
  brandName: string;

  @IsOptional()
  @IsString()
  brandLogo?: string;

  @IsString()
  campaignName: string;

  @IsString()
  role: string;

  @IsArray()
  @IsString({ each: true })
  services: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;
}

export class UpdateCreatorProfileDto {
  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsString()
  professionalType?: string;

  @IsOptional()
  @IsString()
  primaryCategoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

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
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsEnum(PricingModel)
  pricingModel?: PricingModel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  startingPrice?: number;

  @IsOptional()
  @IsBoolean()
  isCustomQuoteOnly?: boolean;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(ServiceMode)
  serviceMode?: ServiceMode;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availability?: AvailabilityStatus;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsNumber()
  experienceYears?: number;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibilityStatus?: ProfileVisibility;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceOfferDto)
  services?: ServiceOfferDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddCollaborationDto)
  brandCollaborations?: AddCollaborationDto[];
}

export class AddPortfolioItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['IMAGE', 'VIDEO', 'REEL', 'CASE_STUDY', 'PROJECT'])
  mediaType: string;

  @IsString()
  mediaUrl: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  externalVideoUrl?: string;

  @IsOptional()
  @IsString()
  projectUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  clientBrand?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicesProvided?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsUsed?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  projectDate?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

