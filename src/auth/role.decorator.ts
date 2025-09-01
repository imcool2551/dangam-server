import { SetMetadata } from '@nestjs/common';
import { AccountRolesType } from './auth.interface';

export const ACCOUNT_ROLE_KEY = 'account-role';
export const Role = (role: AccountRolesType) => {
  return SetMetadata(ACCOUNT_ROLE_KEY, role);
};

export const Restricted = () => {
  return SetMetadata(ACCOUNT_ROLE_KEY, AccountRolesType.admin);
};
