import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

/**
 * T-002: 细粒度权限装饰器
 *
 * 用法：
 *   @RequirePermission('post.audit.pass')
 *   @Post(':id/audit')
 *   audit() { ... }
 *
 * PermissionGuard 会读此 metadata 校验：
 *   1) super_admin 自动通过
 *   2) 否则查询 userId 对应的 UserRole → RolePermission 链路
 *   3) 任何一个 active role 拥有任一 permission code 即放行
 *
 * 兼容期：T-003 阶段会保留 @Roles() 注解；T-002 先把数据基础打好。
 */
export const RequirePermission = (...codes: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, codes);
