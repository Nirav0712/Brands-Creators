import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ConversationStatus } from '@brands-creators/types';

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
