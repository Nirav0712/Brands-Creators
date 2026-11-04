import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({ description: 'Reason for refund' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Optional partial refund amount. If omitted, full amount is refunded.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;
}
