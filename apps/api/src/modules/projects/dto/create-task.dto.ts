import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '@brands-creators/types';

export class CreateProjectTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  milestoneId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateProjectTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class CreateProjectFileDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  publicId?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  milestoneId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
