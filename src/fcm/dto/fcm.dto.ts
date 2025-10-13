import { IsString, IsIn } from 'class-validator';

export class RegisterFcmTokenDto {
  @IsString()
  fcmToken: string;

  @IsString()
  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';
}

export class RegisterFcmTokenResponse {
  success: boolean;
  message: string;
}

export class DeleteFcmTokenResponse {
  success: boolean;
}
