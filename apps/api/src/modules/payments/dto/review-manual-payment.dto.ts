import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ManualPaymentStatus } from '@brands-creators/types';

export class ReviewManualPaymentDto {
  @IsEnum(ManualPaymentStatus)
  @IsNotEmpty()
  status: ManualPaymentStatus; // APPROVED or REJECTED

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

