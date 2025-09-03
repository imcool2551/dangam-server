import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Account, AccountDocument } from '../../account/schema/account.schema';
import { AccountRoles } from '../../account/schema/account-roles.schema';
import {
  RefreshTokenResponse,
  SignInDto,
  SignInResponse,
} from '../dto/auth.dto';
import { SsoType } from '../interfaces/sso.enum';

interface KakaoIdTokenPayload {
  iss: string;
  aud: string;
  sub: string;
  iat: number;
  exp: number;
  auth_time: number;
  nickname?: string;
}

@Injectable()
export class AuthService {
  private readonly KAKAO_JWKS_URI =
    'https://kauth.kakao.com/.well-known/jwks.json';
  private readonly KAKAO_ISSUER = 'https://kauth.kakao.com';
  private kakaoJWKS = createRemoteJWKSet(new URL(this.KAKAO_JWKS_URI));

  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(AccountRoles.name)
    private readonly jwtService: JwtService,
  ) {}

  async signIn(dto: SignInDto): Promise<SignInResponse> {
    switch (dto.ssoType) {
      case SsoType.KAKAO: {
        return this.kakaoSignIn(dto.idToken);
      }
      default: {
        throw new BadRequestException('Unsupported sign in type');
      }
    }
  }

  private async kakaoSignIn(idToken: string): Promise<SignInResponse> {
    try {
      // JWKS를 사용한 ID 토큰 검증
      const { payload } = await jwtVerify(idToken, this.kakaoJWKS, {
        issuer: this.KAKAO_ISSUER,
        algorithms: ['RS256'],
      });

      const kakaoPayload = payload as unknown as KakaoIdTokenPayload;

      if (!kakaoPayload.sub) {
        throw new UnauthorizedException('Invalid subject in ID token');
      }

      const kakaoUserId = kakaoPayload.sub;
      const displayName = kakaoPayload.nickname || 'Unknown User';

      // 기존 계정 찾기
      const existingAccount = await this.accountModel.findOne({
        ssoType: SsoType.KAKAO,
        ssoId: kakaoUserId,
      });

      if (existingAccount) {
        // 기존 사용자 - 로그인
        const tokens = this.generateTokens(existingAccount);
        return {
          uid: existingAccount._id,
          displayName: existingAccount.displayName,
          isNewUser: false,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      } else {
        // 신규 사용자 - 회원가입
        const newAccount = new this.accountModel({
          ssoType: SsoType.KAKAO,
          ssoId: kakaoUserId,
          displayName: displayName,
        });

        const savedAccount = await newAccount.save();
        const tokens = this.generateTokens(savedAccount);

        return {
          uid: savedAccount._id,
          displayName: savedAccount.displayName,
          isNewUser: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      }
    } catch (error) {
      console.error('Kakao ID token validation failed:', error);
      if (error.code === 'ERR_JWT_EXPIRED') {
        throw new UnauthorizedException('ID token expired');
      } else if (error.code === 'ERR_JWS_INVALID') {
        throw new UnauthorizedException('Invalid ID token signature');
      }
      throw new UnauthorizedException('Kakao authentication failed');
    }
  }

  private generateTokens(account: AccountDocument) {
    const payload = {
      uid: account._id,
      displayName: account.displayName,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(
      { uid: account._id },
      { expiresIn: '30d' },
    );

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    // refresh token 검증
    const payload = this.jwtService.verify(refreshToken);

    if (!payload.uid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 사용자 조회
    const account = await this.accountModel.findById(payload.uid);
    if (!account) {
      throw new UnauthorizedException('User not found');
    }

    // 새로운 토큰 생성
    const tokens = this.generateTokens(account);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
