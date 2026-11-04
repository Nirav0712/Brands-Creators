import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationType } from '@brands-creators/types';

export class QueryConversationsDto {
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @IsOptional()
  @IsString()
  status?: string; // 'ALL' | 'UNREAD' | 'ARCHIVED' | 'DIRECT' | 'APPLICATION' | 'PROJECT'

  @IsOptional()
  @IsString()
  search?: string;

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
  limit?: number = 30;
}
