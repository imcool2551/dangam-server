import { SetMetadata } from '@nestjs/common';
import { AccountRoles } from './auth.interface';

export const ACCOUNT_ROLE_KEY = 'account-role';
export const Role = (role: AccountRoles) => {
  return SetMetadata(ACCOUNT_ROLE_KEY, role);
};

export const Restricted = () => {
  return SetMetadata(ACCOUNT_ROLE_KEY, AccountRoles.admin);
};
