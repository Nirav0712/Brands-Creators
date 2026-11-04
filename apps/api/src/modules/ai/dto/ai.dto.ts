import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export enum ProposalTone {
  PROFESSIONAL = 'PROFESSIONAL',
  CREATIVE = 'CREATIVE',
  CONFIDENT = 'CONFIDENT',
  CONCISE = 'CONCISE',
}

export class SemanticMatchDto {
  @IsString()
  @IsNotEmpty()
  requirementId: string;

  @IsString()
  @IsNotEmpty()
  applicantId: string;
}

export class ProposalPitchDto {
  @IsString()
  @IsNotEmpty()
  requirementId: string;

  @IsOptional()
  @IsEnum(ProposalTone)
  tone?: ProposalTone = ProposalTone.PROFESSIONAL;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Custom notes must not exceed 1000 characters' })
  customNotes?: string;
}

export class OptimizeBriefDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorySlug?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetBudget?: number;
}
