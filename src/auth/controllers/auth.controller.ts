import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { SignInResponse, SignInDto, RefreshTokenDto, RefreshTokenResponse } from '../dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  signIn(@Body() dto: SignInDto): Promise<SignInResponse> {
    return this.authService.signIn(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
