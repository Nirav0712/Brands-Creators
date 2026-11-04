import { IsOptional, IsString, IsEmail, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, EmailDeliveryStatus } from '@brands-creators/types';

export class AdminSendTestEmailDto {
  @IsEmail({}, { message: 'A valid email address is required for test delivery' })
  to: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class AdminAnnouncementDto {
  @IsString({ message: 'Announcement title is required' })
  title: string;

  @IsString({ message: 'Announcement message body is required' })
  message: string;

  @IsOptional()
  @IsEnum(UserRole)
  targetRole?: UserRole;
}

export class AdminDeliveryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
