import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  MinLength,
} from 'class-validator';
import { SsoType } from '../interfaces/sso.enum';

export class SignInDto {
  @IsEnum(SsoType)
  ssoType: SsoType;

  @IsString()
  @IsOptional()
  idToken?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;
}

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class CheckEmailResponse {
  exists: boolean;
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
