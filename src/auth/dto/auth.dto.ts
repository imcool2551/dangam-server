import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { SsoType } from '../interfaces/sso.enum';

export class SignInDto {
  @IsEnum(SsoType)
  ssoType: SsoType;

  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class SignInResponse {
  uid: string;
  displayName: string;
  isNewUser: boolean;
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}
