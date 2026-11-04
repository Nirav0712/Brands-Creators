import { IsNotEmpty, IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewReportReason } from '@brands-creators/types';

export class ReportReviewDto {
  @ApiProperty({ enum: ReviewReportReason })
  @IsNotEmpty()
  @IsEnum(ReviewReportReason)
  reason: ReviewReportReason;

  @ApiPropertyOptional({ description: 'Detailed explanation for reporting this review' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class RespondReviewDto {
  @ApiProperty({ description: 'Public response text from reviewee' })
  @IsNotEmpty()
  @IsString()
  responseText: string;
}
