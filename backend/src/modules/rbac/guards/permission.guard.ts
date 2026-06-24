import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * T-002: 细粒度权限守卫
 *
 * 用法：
 *   @UseGuards(AdminGuard, PermissionGuard)
 *   @RequirePermission('post.audit.pass', 'post.audit.batch')
 *   @Post(':id/audit')
 *   audit() { ... }
 *
 * 行为：
 *   1) 路由没标 @RequirePermission → 放行（仅 AdminGuard 校验登录 + @Roles）
 *   2) 路由标了 → 取 user.sub，查 RBAC，校验任一权限码
 *   3) super_admin 短路：自动通过
 *   4) 不通过 → 403 ForbiddenException
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const codes = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!codes || codes.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.sub) {
      throw new ForbiddenException('未登录');
    }
    const userId = BigInt(user.sub);

    const has = await this.rbac.userHasAnyPermission(userId, codes);
    if (!has) {
      this.logger.warn(
        `RBAC 拒绝: userId=${userId} 缺少权限 ${codes.join(' | ')} 访问 ${request.method} ${request.url}`,
      );
      throw new ForbiddenException(`需要权限: ${codes.join(' / ')}`);
    }
    return true;
  }
}
