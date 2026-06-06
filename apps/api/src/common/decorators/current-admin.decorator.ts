import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminContext } from '../guards/admin-jwt.guard';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AdminContext;
  },
);
