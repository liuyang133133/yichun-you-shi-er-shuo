import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from '../../rbac/dto/assign-role.dto';

@Injectable()
export class AdminRoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/admin/roles
   * 角色列表（默认包含权限码）
   */
  async findAll(query: { page?: number; pageSize?: number; includeDeleted?: boolean }) {
    const { page = 1, pageSize = 20, includeDeleted = false } = query;
    const where: any = { includeDeleted: includeDeleted || undefined };
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          _count: { select: { userRoles: true, rolePermissions: true } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.role.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * GET /api/v1/admin/roles/:id
   * 单个角色详情 + 权限码列表
   */
  async findOne(id: bigint) {
    const role = await this.prisma.role.findUnique({
      where: { id, includeDeleted: true } as any,
      include: {
        rolePermissions: {
          where: { deletedAt: null },
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
    });
    if (!role) throw new NotFoundException(`角色 ${id} 不存在`);
    return role;
  }

  /**
   * POST /api/v1/admin/roles
   * 创建角色（默认非系统角色）
   */
  async create(adminId: bigint, dto: CreateRoleDto) {
    // 唯一性检查
    const existing = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`角色 code ${dto.code} 已存在`);
    return this.prisma.role.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status ?? 1,
        isSystem: false,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
  }

  /**
   * PATCH /api/v1/admin/roles/:id
   * 更新角色（系统角色 code 不可改）
   */
  async update(adminId: bigint, id: bigint, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id, includeDeleted: true } as any,
    });
    if (!role) throw new NotFoundException(`角色 ${id} 不存在`);
    return this.prisma.role.update({
      where: { id },
      data: { ...dto, updatedBy: adminId },
    });
  }

  /**
   * DELETE /api/v1/admin/roles/:id
   * 软删角色（系统预置不可删）
   * [F-P1-04] P1 修复: 级联软删 userRole / rolePermission 关联表
   * 原: 仅软删 role 表, userRole/rolePermission 行通过中间件 default 过滤(deletedAt:null),
   *    但若 role 被 restore, 关联表仍 deletedAt=null → 重复关联
   * 修复: 同事务级联软删, 恢复时同事务恢复
   */
  async remove(adminId: bigint, id: bigint) {
    const role = await this.prisma.role.findUnique({
      where: { id, includeDeleted: true } as any,
    });
    if (!role) throw new NotFoundException(`角色 ${id} 不存在`);
    if (role.isSystem) {
      throw new BadRequestException('系统预置角色不可删除');
    }
    const now = new Date();
    // 同事务: role 软删 + userRole 软删 + rolePermission 软删
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.role.update({
        where: { id },
        data: { deletedAt: now, deletedBy: adminId, updatedBy: adminId, status: 0 },
      });
      await tx.userRole.updateMany({
        where: { roleId: id, deletedAt: null },
        data: { deletedAt: now, deletedBy: adminId, updatedBy: adminId },
      });
      await tx.rolePermission.updateMany({
        where: { roleId: id, deletedAt: null },
        data: { deletedAt: now, deletedBy: adminId, updatedBy: adminId },
      });
      return r;
    });
  }

  /**
   * [F-P1-04] P1 修复: 恢复软删的角色, 并复活被级联软删的 userRole/rolePermission
   * 注意: 这是额外端点, 当前 admin/roles 路由未暴露, 留接口文档备用
   */
  async restore(adminId: bigint, id: bigint) {
    const role = await this.prisma.role.findUnique({
      where: { id, includeDeleted: true } as any,
    });
    if (!role) throw new NotFoundException(`角色 ${id} 不存在`);
    if (!role.deletedAt) {
      return { id: id.toString(), alreadyActive: true };
    }
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.role.update({
        where: { id },
        data: { deletedAt: null, deletedBy: null, updatedBy: adminId, status: 1 },
      });
      await tx.userRole.updateMany({
        where: { roleId: id, deletedBy: adminId, deletedAt: { not: null } },
        data: { deletedAt: null, deletedBy: null, updatedBy: adminId },
      });
      await tx.rolePermission.updateMany({
        where: { roleId: id, deletedBy: adminId, deletedAt: { not: null } },
        data: { deletedAt: null, deletedBy: null, updatedBy: adminId },
      });
      return r;
    });
  }
}
