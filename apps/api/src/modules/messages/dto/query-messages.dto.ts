import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMessagesDto {
  @IsOptional()
  @IsString()
  before?: string; // Cursor: message ID or ISO timestamp

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
