import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentSettingsDto {
  @IsOptional()
  @IsBoolean()
  upiEnabled?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  upiId?: string;

  @IsOptional()
  @IsString()
  upiDisplayName?: string;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string;

  @IsOptional()
  @IsBoolean()
  bankTransferEnabled?: boolean;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  paymentInstructions?: string;

  @IsOptional()
  @IsString()
  verificationPolicy?: string;
}
