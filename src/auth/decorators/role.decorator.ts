import { SetMetadata } from '@nestjs/common';
import { AccountRolesType } from '../interfaces/auth.interface';

export const ACCOUNT_ROLE_KEY = 'account-role';
export const Role = (role: AccountRolesType) => {
  return SetMetadata(ACCOUNT_ROLE_KEY, role);
};

export const PUBLIC_API_KEY = 'public-api';
export const PublicApi = () => {
  return SetMetadata(PUBLIC_API_KEY, true);
};
