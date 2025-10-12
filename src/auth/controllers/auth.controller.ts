import { Body, Controller, Post, Delete, HttpCode } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { SignInResponse, SignInDto, RefreshTokenDto, RefreshTokenResponse } from '../dto/auth.dto';
import { PublicApi } from '../decorators/role.decorator';
import { Auth } from '../decorators/auth.decorator';
import { AuthPayload } from '../interfaces/auth.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  @PublicApi()
  signIn(@Body() dto: SignInDto): Promise<SignInResponse> {
    return this.authService.signIn(dto);
  }

  @Post('refresh')
  @PublicApi()
  refresh(@Body() dto: RefreshTokenDto): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Delete('account')
  deleteAccount(@Auth() auth: AuthPayload): Promise<void> {
    return this.authService.deleteAccount(auth.uid);
  }
}
