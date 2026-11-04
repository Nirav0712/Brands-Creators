import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliverableType, DeliverableStatus } from '@brands-creators/types';

export class DeliverableFileDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  publicId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsNumber()
  @IsOptional()
  size?: number;
}

export class CreateDeliverableDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  milestoneId?: string;

  @IsEnum(DeliverableType)
  @IsOptional()
  type?: DeliverableType;
}

export class SubmitDeliverableDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliverableFileDto)
  @IsOptional()
  files?: DeliverableFileDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  links?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RequestRevisionDto {
  @IsString()
  @IsNotEmpty()
  feedback: string;
}

export class ApproveDeliverableDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
