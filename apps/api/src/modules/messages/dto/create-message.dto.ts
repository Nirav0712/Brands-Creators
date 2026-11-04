import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '@brands-creators/types';

export class MessageAttachmentDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  mimeType: string;

  @IsString()
  fileName: string;

  @IsNumber()
  size: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;
}

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType = MessageType.TEXT;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];

  @IsOptional()
  @IsString()
  replyToMessageId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
