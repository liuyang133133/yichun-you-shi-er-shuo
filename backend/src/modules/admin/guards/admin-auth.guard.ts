import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

/**
 * Admin 守卫
 * - 必须已登录（被全局 JwtAuthGuard 拦截过）
 * - @Roles('admin') 标记的路由：要求 payload.role 匹配
 * - 没有标记：默认任何登录用户都能进（业务层自己判断）
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true; // 没标 @Roles 视为通用（业务层自己判）
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) {
      throw new ForbiddenException('未登录');
    }
    if (!required.includes(user.role || 'user')) {
      throw new ForbiddenException(`需要角色: ${required.join('/')}`);
    }
    return true;
  }
}
