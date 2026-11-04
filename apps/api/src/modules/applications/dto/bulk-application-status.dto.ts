import {
  IsArray,
  ArrayNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApplicationStatus } from '@brands-creators/types';

export class BulkApplicationStatusDto {
  @IsArray({ message: 'applicationIds must be an array of application IDs' })
  @ArrayNotEmpty({ message: 'At least one application ID must be provided' })
  @IsString({ each: true, message: 'Each application ID must be a valid string' })
  applicationIds: string[];

  @IsEnum(
    [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED],
    {
      message:
        'Bulk status update only supports SHORTLISTED or REJECTED status transitions',
    },
  )
  status: ApplicationStatus.SHORTLISTED | ApplicationStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Brand notes cannot exceed 500 characters' })
  brandNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}
