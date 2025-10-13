import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { AuthPayload } from '../auth/interfaces/auth.interface';
import {
  DeleteFcmTokenResponse,
  RegisterFcmTokenDto,
  RegisterFcmTokenResponse,
} from './dto/fcm.dto';
import { FcmService } from './fcm.service';

@Controller('fcm')
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerToken(
    @Auth() auth: AuthPayload,
    @Body() dto: RegisterFcmTokenDto,
  ): Promise<RegisterFcmTokenResponse> {
    await this.fcmService.registerToken(auth.uid, dto.fcmToken);

    return {
      success: true,
      message: 'Token registered successfully',
    };
  }

  @Delete('token')
  @HttpCode(HttpStatus.OK)
  async deleteToken(@Auth() auth: AuthPayload): Promise<DeleteFcmTokenResponse> {
    await this.fcmService.deleteToken(auth.uid);

    return {
      success: true,
    };
  }
}
