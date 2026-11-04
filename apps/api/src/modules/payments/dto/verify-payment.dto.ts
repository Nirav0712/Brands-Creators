import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Internal Payment ID or Payment Number' })
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'Razorpay / Gateway Order ID' })
  @IsNotEmpty()
  @IsString()
  razorpay_order_id: string;

  @ApiProperty({ description: 'Razorpay / Gateway Payment ID' })
  @IsNotEmpty()
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty({ description: 'Razorpay / Gateway Signature' })
  @IsNotEmpty()
  @IsString()
  razorpay_signature: string;
}
