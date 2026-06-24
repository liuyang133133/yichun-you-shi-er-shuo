import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemRoleCodes } from './enums/permission-codes';

/**
 * T-002: RBAC 核心服务
 *
 * 提供：
 *   - getUserPermissions(userId)  返回用户拥有的所有权限码（去重 + 排除已过期）
 *   - userHasPermission(userId, code)  校验是否拥有某权限
 *   - assignRole / revokeRole  用户-角色分配
 *   - listUserRoles / listRoleUsers  关联查询
 *
 * super_admin 特殊处理：直接拥有所有权限，不查 DB（性能优化）。
 */
@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列出用户的所有有效 UserRole（含角色信息）
   * 排除：软删 + expiresAt < now
   */
  async listUserRoles(userId: bigint) {
    const now = new Date();
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    return userRoles;
  }

  /**
   * 获取用户拥有的所有权限码（去重）
   * 性能考虑：用单次 join 查询所有 role → rolePermissions → permission
   * super_admin 直接返回 ['*'] 通配
   */
  async getUserPermissions(userId: bigint): Promise<string[]> {
    // 1) super_admin 短路
    const userRoles = await this.listUserRoles(userId);
    const isSuperAdmin = userRoles.some(
      (ur) => ur.role.code === SystemRoleCodes.SUPER_ADMIN && ur.role.deletedAt === null,
    );
    if (isSuperAdmin) {
      // 返回所有权限码（先从 DB 拿完整列表）
      const all = await this.prisma.permission.findMany({
        where: { deletedAt: null },
        select: { code: true },
      });
      return all.map((p) => p.code);
    }

    // 2) 普通用户：join 查询
    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length === 0) return [];

    const rolePerms = await this.prisma.rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
        deletedAt: null,
        role: { deletedAt: null },
        permission: { deletedAt: null },
      },
      include: { permission: { select: { code: true } } },
    });

    const codeSet = new Set<string>();
    for (const rp of rolePerms) codeSet.add(rp.permission.code);
    return Array.from(codeSet);
  }

  /**
   * 校验用户是否拥有指定权限
   */
  async userHasPermission(userId: bigint, code: string): Promise<boolean> {
    const codes = await this.getUserPermissions(userId);
    return codes.includes(code);
  }

  /**
   * 校验用户是否拥有任一权限
   */
  async userHasAnyPermission(userId: bigint, codes: string[]): Promise<boolean> {
    const owned = await this.getUserPermissions(userId);
    return codes.some((c) => owned.includes(c));
  }

  /**
   * 分配角色给用户
   * 幂等：unique(userId, roleId) 冲突时 update
   */
  async assignRole(
    userId: bigint,
    roleId: bigint,
    grantedBy: bigint,
    expiresAt?: Date | null,
  ) {
    // 检查 user 存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId, includeDeleted: true } as any,
    });
    if (!user) throw new Error(`用户 ${userId} 不存在`);

    // 检查 role 存在
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error(`角色 ${roleId} 不存在`);

    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {
        grantedBy,
        expiresAt: expiresAt ?? null,
        deletedAt: null,
        updatedBy: grantedBy,
      },
      create: {
        userId,
        roleId,
        grantedBy,
        expiresAt: expiresAt ?? null,
        createdBy: grantedBy,
        updatedBy: grantedBy,
      },
    });
  }

  /**
   * 撤销用户的角色（软删）
   */
  async revokeRole(userId: bigint, roleId: bigint, revokedBy: bigint) {
    return this.prisma.userRole.updateMany({
      where: { userId, roleId, deletedAt: null },
      data: { deletedAt: new Date(), deletedBy: revokedBy, updatedBy: revokedBy },
    });
  }

  /**
   * 列出角色的所有权限码
   */
  async listRolePermissions(roleId: bigint): Promise<string[]> {
    const rps = await this.prisma.rolePermission.findMany({
      where: {
        roleId,
        deletedAt: null,
        permission: { deletedAt: null },
      },
      include: { permission: { select: { code: true } } },
    });
    return rps.map((rp) => rp.permission.code);
  }

  /**
   * 给角色分配权限（批量，全量替换）
   * 流程：
   *   1) 软删该角色所有当前未删的 role_permission
   *   2) 恢复该角色所有「软删 + 目标 permissionId」的行（被取消的权限会重新出现）
   *   3) 插入全新的 role_permission 行
   * 用单事务保证原子性。
   */
  async setRolePermissions(roleId: bigint, permissionIds: bigint[], operatorId: bigint) {
    return this.prisma.$transaction(async (tx) => {
      // 1) 软删所有未删的
      await tx.rolePermission.updateMany({
        where: { roleId, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: operatorId, updatedBy: operatorId },
      });

      if (permissionIds.length === 0) return { count: 0 };

      // 2) 恢复（复活）已软删的对应行
      await tx.rolePermission.updateMany({
        where: {
          roleId,
          permissionId: { in: permissionIds },
          deletedAt: { not: null },
        },
        data: { deletedAt: null, deletedBy: null, updatedBy: operatorId },
      });

      // 3) 找出"现在未删的"已有 permissionId，避免重复插入
      const existing = await tx.rolePermission.findMany({
        where: { roleId, permissionId: { in: permissionIds }, deletedAt: null },
        select: { permissionId: true },
      });
      const existingSet = new Set(existing.map((e) => e.permissionId.toString()));
      const newPermIds = permissionIds.filter((pid) => !existingSet.has(pid.toString()));

      if (newPermIds.length === 0) return { count: existing.length };

      const data = newPermIds.map((pid) => ({
        roleId,
        permissionId: pid,
        createdBy: operatorId,
        updatedBy: operatorId,
      }));
      const result = await tx.rolePermission.createMany({ data });
      return { count: existing.length + result.count };
    });
  }
}
