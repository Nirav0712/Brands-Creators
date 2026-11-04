import { IsString, IsNotEmpty, ValidateNested, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class PushSubscriptionKeysDto {
  @IsString()
  @IsNotEmpty({ message: 'p256dh key is required' })
  p256dh: string;

  @IsString()
  @IsNotEmpty({ message: 'auth secret is required' })
  auth: string;
}

export class PushSubscribeDto {
  @IsString()
  @IsNotEmpty({ message: 'Push subscription endpoint URL is required' })
  endpoint: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class PushUnsubscribeDto {
  @IsString()
  @IsNotEmpty({ message: 'Push subscription endpoint URL is required' })
  endpoint: string;
}
