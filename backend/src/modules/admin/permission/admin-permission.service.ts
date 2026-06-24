import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/admin/permissions
   * 列出所有权限码（按 module 分组）
   * query: module?, includeDeleted?
   */
  async findAll(query: { module?: string; includeDeleted?: boolean }) {
    const { module, includeDeleted = false } = query;
    const where: any = { includeDeleted: includeDeleted || undefined };
    if (module) where.module = module;

    const list = await this.prisma.permission.findMany({
      where,
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    return { list, total: list.length };
  }

  /**
   * GET /api/v1/admin/permissions/modules
   * 列出所有模块名（用于前端分组渲染）
   */
  async listModules() {
    const groups = await this.prisma.permission.groupBy({
      by: ['module'],
      _count: { module: true },
      where: { deletedAt: null },
      orderBy: { module: 'asc' },
    });
    return groups.map((g) => ({ module: g.module, count: g._count.module }));
  }
}
