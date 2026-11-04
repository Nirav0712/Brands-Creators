import { IsOptional, IsString, IsNumber, IsArray, ValidateNested, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { VerificationStatus, ProfileVisibility, BrandTeamRole } from '@brands-creators/types';

export class BrandFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibilityStatus?: ProfileVisibility;
}

export class BrandCampaignDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  budgetRange?: string;
}

export class UpdateBrandProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsNumber()
  foundedYear?: number;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

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
  teamSize?: number;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibilityStatus?: ProfileVisibility;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrandCampaignDto)
  previousCampaigns?: BrandCampaignDto[];
}

export class InviteBrandTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsEnum(BrandTeamRole)
  role?: BrandTeamRole = BrandTeamRole.COLLABORATOR;
}

export class AcceptBrandTeamInvitationDto {
  @IsString()
  @IsNotEmpty()
  inviteToken: string;
}


