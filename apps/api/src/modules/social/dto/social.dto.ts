import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SocialPlatform } from '@brands-creators/types';

export class SocialMetricsInputDto {
  @IsOptional()
  @IsNumber()
  followers?: number;

  @IsOptional()
  @IsNumber()
  subscribers?: number;

  @IsOptional()
  @IsNumber()
  postsCount?: number;

  @IsOptional()
  @IsNumber()
  engagementRate?: number;
}

export class AddSocialAccountDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsString()
  @IsNotEmpty()
  profileUrl: string;

  @IsOptional()
  @IsString()
  handle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMetricsInputDto)
  metrics?: SocialMetricsInputDto;
}

export class RequestVerificationDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}

