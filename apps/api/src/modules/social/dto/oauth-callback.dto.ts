import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty({ message: 'OAuth authorization code is required' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'OAuth state parameter is required for CSRF protection' })
  state: string;

  @IsString()
  @IsNotEmpty({ message: 'redirectUri must match the authorization request' })
  redirectUri: string;
}
