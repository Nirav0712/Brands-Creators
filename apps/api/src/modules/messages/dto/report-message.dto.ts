import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MessageReportReason } from '@brands-creators/types';

export class ReportMessageDto {
  @IsEnum(MessageReportReason)
  reason: MessageReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
