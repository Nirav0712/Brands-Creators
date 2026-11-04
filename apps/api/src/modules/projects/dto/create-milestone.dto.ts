import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { MilestoneStatus } from '@brands-creators/types';

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  order?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  order?: number;

  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  progress?: number;
}
