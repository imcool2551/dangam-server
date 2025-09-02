import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPayload } from '../interfaces/auth.interface';

export const Auth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthPayload;
  },
);
