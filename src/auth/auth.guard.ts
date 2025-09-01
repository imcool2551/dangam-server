import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AccountRolesType, AuthPayload } from './auth.interface';
import { nanoid } from 'nanoid';

const MockUser: AuthPayload = {
  sub: '1',
  uid: nanoid(),
  displayName: 'tester',
  acl: {
    admin: AccountRolesType.nobody,
  },
};

export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    request.user = MockUser;

    return true;
  }
}
