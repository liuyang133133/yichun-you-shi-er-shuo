import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * 标记路由需要的角色
 * 用法：
 *   @Roles('admin')
 *   @Get('admin/posts')
 *   list() { ... }
 *
 * AdminGuard 会检查 JWT payload.role 是否在列表里
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
