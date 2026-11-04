import { IsOptional, IsBoolean, IsString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChannelPreferencesDto {
  @IsOptional()
  @IsBoolean()
  applications?: boolean;

  @IsOptional()
  @IsBoolean()
  projects?: boolean;

  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @IsOptional()
  @IsBoolean()
  payments?: boolean;

  @IsOptional()
  @IsBoolean()
  reviews?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  inApp?: ChannelPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  email?: ChannelPreferencesDto;

  @IsOptional()
  @IsEnum(['INSTANT', 'DAILY', 'WEEKLY', 'NONE'])
  digestFrequency?: 'INSTANT' | 'DAILY' | 'WEEKLY' | 'NONE';

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
