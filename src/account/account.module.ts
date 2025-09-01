import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AccountRoles,
  AccountRolesSchema,
} from './schema/account-roles.schema';
import { Account, AccountSchema } from './schema/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Account.name,
        schema: AccountSchema,
      },
      {
        name: AccountRoles.name,
        schema: AccountRolesSchema,
      },
    ]),
  ],
})
export class AccountModule {}
