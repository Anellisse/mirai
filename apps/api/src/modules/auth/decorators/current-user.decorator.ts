import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
