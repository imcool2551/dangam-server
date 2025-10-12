import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Account, AccountDocument } from '../../account/schema/account.schema';
import { AccountRoles, AccountRolesDocument } from '../../account/schema/account-roles.schema';
import { Diary, DiaryDocument } from '../../diary/schema/diary.schema';
import { Group, GroupDocument } from '../../group/schemas/group.schema';
import {
  RefreshTokenResponse,
  SignInDto,
  SignInResponse,
} from '../dto/auth.dto';
import { SsoType } from '../interfaces/sso.enum';
import { AccountRolesType } from '../interfaces/auth.interface';

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
    private readonly accountRolesModel: Model<AccountRolesDocument>,
    @InjectModel(Diary.name)
    private readonly diaryModel: Model<DiaryDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
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

    const accessToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    const refreshToken = this.jwtService.sign(
      { uid: account._id },
      { expiresIn: '365d' },
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

  async deleteAccount(accountId: string): Promise<void> {
    // 사용자가 owner인 그룹이 있는지 확인 (삭제되지 않은 그룹만)
    const ownerRoles = await this.accountRolesModel.find({
      account: accountId,
      role: AccountRolesType.owner,
    });

    if (ownerRoles.length > 0) {
      // owner인 그룹들 중 삭제되지 않은 그룹 확인
      const groupIds = ownerRoles.map(role => role.group);
      const activeGroups = await this.groupModel.find({
        _id: { $in: groupIds },
        deleted: false,
      });

      if (activeGroups.length > 0) {
        throw new ConflictException(
          'Cannot delete account. You are the owner of one or more groups. Please transfer ownership or delete the groups first.',
        );
      }
    }

    // 사용자의 모든 일기 soft delete
    await this.diaryModel.updateMany(
      { account: accountId },
      { deleted: true },
    );

    // 사용자의 모든 그룹 멤버십 삭제
    await this.accountRolesModel.deleteMany({ account: accountId });

    // 계정 삭제
    await this.accountModel.findByIdAndDelete(accountId);
  }
}
