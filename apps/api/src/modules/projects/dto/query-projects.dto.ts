import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '@brands-creators/types';

export class QueryProjectsDto {
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}
