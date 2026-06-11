import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminPostService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 帖子列表（带审核状态过滤）
   * GET /api/v1/admin/posts
   */
  async findAll(query: {
    auditStatus?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { auditStatus, type, page = 1, pageSize = 20 } = query;
    const where: Prisma.PostWhereInput = {};
    if (auditStatus) where.auditStatus = auditStatus;
    if (type) where.type = type;

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, nickname: true, phone: true } },
          category: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 审核通过（MUST-25 修复：合并为单事务 + 写 AuditLog）
   * POST /api/v1/admin/posts/:id/audit
   * body: { action: 'pass', reason?: '' }
   */
  async pass(adminId: bigint, postId: bigint, reason?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.auditStatus !== 'pending') {
      throw new BadRequestException(`当前状态 ${post.auditStatus}，无需重复审核`);
    }

    const reasonText = reason ? `[pass] ${reason}` : null;

    // 合并为一个事务：post 更新 + audit_log 写入
    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        data: {
          auditStatus: 'passed',
          status: 'active',
          auditReason: reasonText,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'post',
          action: 'audit_pass',
          targetType: 'post',
          targetId: postId,
          reason: reason || null,
        },
      }),
    ]);

    return this.prisma.post.findUnique({ where: { id: postId } });
  }

  /**
   * 审核拒绝（MUST-25 修复：单事务 + AuditLog）
   */
  async reject(adminId: bigint, postId: bigint, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('拒绝时必须填写理由');
    }
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.auditStatus !== 'pending') {
      throw new BadRequestException(`当前状态 ${post.auditStatus}，无需重复审核`);
    }

    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        data: { auditStatus: 'rejected', status: 'rejected', auditReason: reason },
      }),
      this.prisma.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'post',
          action: 'audit_reject',
          targetType: 'post',
          targetId: postId,
          reason,
        },
      }),
    ]);

    return this.prisma.post.findUnique({ where: { id: postId } });
  }

  /**
   * 强制下架（MUST-25 修复：单事务 + AuditLog）
   */
  async offline(adminId: bigint, postId: bigint, reason: string) {
    if (!reason) throw new BadRequestException('下架时必须填写理由');
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);

    const reasonText = `[强制下架] ${reason}`;

    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        data: { status: 'rejected', auditStatus: 'rejected', auditReason: reasonText },
      }),
      this.prisma.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'post',
          action: 'offline',
          targetType: 'post',
          targetId: postId,
          reason: reasonText,
        },
      }),
    ]);

    return this.prisma.post.findUnique({ where: { id: postId } });
  }

  /**
   * 硬清 30 天前软删的 post（SHOULD-15）
   * POST /api/v1/admin/posts/purge
   * body: { daysOld?: number } 默认 30
   * 返回：{ deleted: N }
   */
  async purgeOldDeleted(adminId: bigint, daysOld = 30) {
    if (daysOld < 7) {
      throw new BadRequestException('daysOld 至少 7 天(避免误操作)');
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const targets = await this.prisma.post.findMany({
      where: { status: 'deleted', updatedAt: { lt: cutoff } },
      select: { id: true },
    });
    if (targets.length === 0) {
      return { deleted: 0, scanned: 0, cutoff };
    }

    const ids = targets.map((p) => p.id);
    const [result] = await this.prisma.$transaction([
      this.prisma.post.deleteMany({ where: { id: { in: ids } } }),
      this.prisma.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'post',
          action: 'purge_old_deleted',
          targetType: 'post',
          targetId: null,
          reason: `硬清 ${daysOld} 天前软删 ${ids.length} 条 post`,
          metadata: { count: ids.length, daysOld, cutoff: cutoff.toISOString() },
        },
      }),
    ]);
    return { deleted: result.count, scanned: targets.length, cutoff };
  }
}
