import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, Matches, IsArray } from 'class-validator';
import { UserRole } from '@brands-creators/types';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, { message: 'Username can only contain alphanumeric characters, underscores, dots and hyphens' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsEnum(UserRole, { message: 'Invalid primary role specified' })
  role: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or Username is required' })
  login: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;
}

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword?: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  token: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}

export class CompleteOnboardingDto {
  @IsOptional()
  @IsArray()
  selectedCategoryIds?: string[];

  @IsOptional()
  location?: {
    city: string;
    state?: string;
    country?: string;
    area?: string;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    isPublicAddress?: boolean;
    geoPoint?: {
      type: string;
      coordinates: [number, number];
    };
  };

  @IsOptional()
  customFieldValues?: Record<string, any>;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  studioName?: string;
}
