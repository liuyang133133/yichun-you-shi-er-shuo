import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * 封禁用户 DTO
 * POST /api/v1/admin/users/:id/ban
 * body: { reason: string }
 *
 * [P0-fix] reason 限 255 字符 (匹配 AuditLog.reason @db.VarChar(500))
 */
export class AdminUserBanDto {
  @IsString()
  @MaxLength(255, { message: '封禁理由不能超过 255 字符' })
  reason!: string;
}

/**
 * 分配角色 DTO
 * POST /api/v1/admin/users/:id/roles
 * body: { roleId: number; expiresAt?: string }
 *
 * 注意: roleId 是 number, 用 @Type(Number) 由 service 处理 bigint
 */
export class AssignRoleDto {
  roleId!: number;
  expiresAt?: string;
}