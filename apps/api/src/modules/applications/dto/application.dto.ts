import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApplicationStatus } from '@brands-creators/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ApplicationFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  requirementId?: string;
}

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty({ message: 'Requirement ID is required' })
  requirementId: string;

  @ValidateIf((o) => !o.coverLetter)
  @IsNotEmpty({ message: 'Proposal pitch is required' })
  @IsString()
  proposal?: string;

  @ValidateIf((o) => !o.proposal)
  @IsNotEmpty({ message: 'Cover letter is required' })
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Offered price must be a positive number' })
  offeredPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Bid amount must be a positive number' })
  bidAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsString()
  estimatedDelivery?: string;

  @IsOptional()
  @IsString()
  proposedTimeline?: string;

  @IsOptional()
  @IsArray()
  selectedPortfolioItems?: Array<{
    title: string;
    mediaUrl: string;
    mediaType: string;
    coverImage?: string;
    clientBrand?: string;
  }>;

  @IsOptional()
  @IsString()
  additionalMessage?: string;
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus, { message: 'Valid application status is required' })
  status: ApplicationStatus;

  @IsOptional()
  @IsString()
  brandNotes?: string;
}
