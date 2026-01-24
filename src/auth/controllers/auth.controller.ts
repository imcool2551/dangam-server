import { Body, Controller, Post, Delete, Get, Query } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import {
  SignInResponse,
  SignInDto,
  RefreshTokenDto,
  RefreshTokenResponse,
  SignUpDto,
  CheckEmailResponse,
} from '../dto/auth.dto';
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

  @Post('sign-up')
  @PublicApi()
  signUp(@Body() dto: SignUpDto): Promise<SignInResponse> {
    return this.authService.signUp(dto);
  }

  @Get('check-email')
  @PublicApi()
  checkEmail(@Query('email') email: string): Promise<CheckEmailResponse> {
    return this.authService.checkEmailExists(email);
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
