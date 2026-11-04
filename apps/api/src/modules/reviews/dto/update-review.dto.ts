import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewCriteriaDto } from './create-review.dto';

export class UpdateReviewDto {
  @ApiPropertyOptional({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Review title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Review comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ type: ReviewCriteriaDto })
  @IsOptional()
  @IsObject()
  criteria?: ReviewCriteriaDto;
}
