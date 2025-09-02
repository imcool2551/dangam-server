import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { SsoType } from '../interfaces/sso.enum';

export class SignInDto {
  @IsEnum(SsoType)
  ssoType: SsoType;

  @IsString()
  @IsNotEmpty()
  ssoId: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class SignInResponse {
  uid: string;
  displayName: string;
  isNewUser: boolean;
}