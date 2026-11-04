import { IsOptional, IsEnum, IsBoolean, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { NotificationType } from '@brands-creators/types';

export class NotificationQueryDto {
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
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
