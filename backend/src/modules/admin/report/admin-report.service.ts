import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 举报列表
   */
  async findAll(query: { status?: string; page?: number; pageSize?: number }) {
    const { status, page = 1, pageSize = 20 } = query;
    const where: Prisma.ReportWhereInput = {};
    if (status) where.status = status;

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, nickname: true, phone: true } },
          post: { select: { id: true, title: true, type: true, status: true, userId: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 处理举报
   * POST /api/v1/admin/reports/:id/handle
   * body: { action: 'handled' | 'ignored', postAction?: 'down' }
   */
  async handle(
    adminId: bigint,
    reportId: bigint,
    action: 'handled' | 'ignored',
    postAction?: 'down' | null,
  ) {
    const r = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!r) throw new NotFoundException(`举报 ID ${reportId} 不存在`);
    if (r.status !== 'pending') {
      return r; // 幂等
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. 标记举报为已处理
      const updated = await tx.report.update({
        where: { id: reportId },
        data: {
          status: action === 'handled' ? 'handled' : 'ignored',
          handledBy: adminId,
          handledAt: new Date(),
        },
      });

      // 2. 如果选择 handled + postAction=down，下架被举报的 post
      if (action === 'handled' && postAction === 'down' && r.postId) {
        await tx.post.update({
          where: { id: r.postId },
          data: { status: 'rejected', auditStatus: 'rejected', auditReason: '被举报下架' },
        });
      }
      return updated;
    });
  }
}
