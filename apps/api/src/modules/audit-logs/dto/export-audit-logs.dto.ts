import { IsOptional, IsString, IsIn, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportAuditLogsDto {
  @IsOptional()
  @IsIn(['csv', 'json'], { message: 'format must be either csv or json' })
  format?: 'csv' | 'json';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number;
}
