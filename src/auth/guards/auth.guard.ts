import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AccountRolesType, AuthPayload } from '../interfaces/auth.interface';

const MockUser: AuthPayload = {
  uid: 'frKUMGRJqXRD824qScf-P',
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
