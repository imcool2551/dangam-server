import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AccountRoles,
  AccountRolesSchema,
} from './schema/account-roles.schema';
import { Account, AccountSchema } from './schema/account.schema';

const AccountMongooseModule = MongooseModule.forFeature([
  {
    name: Account.name,
    schema: AccountSchema,
  },
  {
    name: AccountRoles.name,
    schema: AccountRolesSchema,
  },
]);

@Module({
  imports: [AccountMongooseModule],
  exports: [AccountMongooseModule],
})
export class AccountModule {}
