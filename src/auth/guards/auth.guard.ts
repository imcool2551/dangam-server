import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccountRoles,
  AccountRolesDocument,
} from '../../account/schema/account-roles.schema';
import {
  AccountRolesType,
  ACL,
  AuthPayload,
} from '../interfaces/auth.interface';
import { Reflector } from '@nestjs/core';
import { ACCOUNT_ROLE_KEY, PUBLIC_API_KEY } from '../decorators/role.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @InjectModel(AccountRoles.name)
    private readonly accountRolesModel: Model<AccountRolesDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        PUBLIC_API_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (isPublic) return true;

      const request = context.switchToHttp().getRequest();

      // Authorization 헤더에서 토큰 추출
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException(
          'Missing or invalid authorization header',
        );
      }

      const token = authHeader.substring(7); // "Bearer " 제거

      // JWT 토큰 검증
      const payload = this.jwtService.verify(token);

      if (!payload.uid) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // account-roles에서 ACL 조회
      const accountRoles = await this.accountRolesModel.find({
        account: payload.uid,
      });
      const acl: ACL = {};

      for (const roleDoc of accountRoles) {
        acl[roleDoc.group] = roleDoc.role;
      }

      // AuthPayload 생성하여 request.user에 설정
      const authPayload: AuthPayload = {
        uid: payload.uid,
        acl,
      };

      request.user = authPayload;

      // Role 기반 권한 체크
      const minimumRole = this.reflector.getAllAndOverride<AccountRolesType>(
        ACCOUNT_ROLE_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!minimumRole) return true;

      // Group 파라미터 체크
      const acceptableRoles = Object.values(AccountRolesType);
      const group = (request.params.group ?? '') as string;
      const groupRole = acl[group] ?? AccountRolesType.nobody;

      const hasRequiredRole = acceptableRoles.includes(groupRole) && groupRole.valueOf() >= minimumRole.valueOf();

      return hasRequiredRole;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
