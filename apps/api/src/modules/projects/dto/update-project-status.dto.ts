import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '@brands-creators/types';

export class UpdateProjectStatusDto {
  @IsEnum(ProjectStatus)
  @IsNotEmpty()
  status: ProjectStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CancelProjectDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class HoldProjectDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CompleteProjectDto {
  @IsString()
  @IsOptional()
  completionNotes?: string;
}
