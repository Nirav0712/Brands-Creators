import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { ConversationType } from '@brands-creators/types';

export class CreateConversationDto {
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantUserIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  requirementId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  initialMessage?: string;
}
