import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../schema/account.schema';
import { UpdateDisplayNameDto } from '../dto/account.dto';
import { AuthPayload } from '../../auth/interfaces/auth.interface';

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) {}

  async updateDisplayName(
    auth: AuthPayload,
    dto: UpdateDisplayNameDto,
  ): Promise<void> {
    const account = await this.accountModel.findById(auth.uid);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    account.displayName = dto.displayName;
    await account.save();
  }
}
