import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../../account/schema/account.schema';
import { SignInDto, SignInResponse } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) {}

  async signIn(dto: SignInDto): Promise<SignInResponse> {
    // SSO Type과 ID로 기존 계정 찾기
    const existingAccount = await this.accountModel.findOne({
      ssoType: dto.ssoType,
      ssoId: dto.ssoId,
    });

    if (existingAccount) {
      // 기존 사용자 - 로그인
      return {
        uid: existingAccount._id,
        displayName: existingAccount.displayName,
        isNewUser: false,
      };
    } else {
      // 신규 사용자 - 회원가입
      const newAccount = new this.accountModel({
        ssoType: dto.ssoType,
        ssoId: dto.ssoId,
        displayName: dto.displayName,
      });

      const savedAccount = await newAccount.save();

      return {
        uid: savedAccount._id,
        displayName: savedAccount.displayName,
        isNewUser: true,
      };
    }
  }
}
