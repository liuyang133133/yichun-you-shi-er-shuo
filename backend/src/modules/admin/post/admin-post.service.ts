import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { NotificationEvent } from '../../notification/notification-event';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminPostService {
  private readonly logger = new Logger(AdminPostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 通知发送失败不应阻塞审核主流程（业务侧已写库成功）
   * 仅记录 warn 日志，便于排查
   */
  private swallowNotificationError(e: any, action: string, userId: bigint) {
    this.logger.warn(
      `通知发送失败 [${action}] user=${userId}: ${e?.message ?? e}`,
    );
  }

  /**
   * 帖子列表（带审核状态过滤）
   * GET /api/v1/admin/posts
   * T-001: 支持 includeDeleted=true 查看已软删的帖子
   */
  async findAll(query: {
    auditStatus?: string;
    type?: string;
    page?: number;
    pageSize?: number;
    includeDeleted?: boolean;
  }) {
    const { auditStatus, type, page = 1, pageSize = 20, includeDeleted = false } = query;
    // T-001: includeDeleted 会被中间件识别并删除（Prisma 类型系统未知此字段，故 as any）
    const where: any = { includeDeleted: includeDeleted || undefined };
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
    return { list, total, page, pageSize, includeDeleted };
  }

  /**
   * T-001: 恢复已软删的帖子
   * POST /api/v1/admin/posts/:id/restore
   * - 仅当 deletedAt 非空时才能恢复
   * - 恢复后 status 回到 'active'（业务状态）
   * - 写 AuditLog
   */
  async restore(adminId: bigint, postId: bigint) {
    // 1) 预查：需绕过中间件，includeDeleted=true
    const post = await this.prisma.post.findFirst({
      where: { id: postId, includeDeleted: true } as any,
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (!post.deletedAt) {
      throw new BadRequestException('该信息未被软删，无需恢复');
    }

    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        data: {
          deletedAt: null,
          deletedBy: null,
          status: 'active',
          // [B-P0-02] P0 修复: 强制重置 auditStatus='pending' 防止违规帖借 restore 复活
          // 列表默认 auditStatus='passed' 过滤, 帖子在公开列表隐藏, 需 admin 重新审核
          auditStatus: 'pending',
          updatedBy: adminId,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'post',
          action: 'restore',
          targetType: 'post',
          targetId: postId,
          reason: `从 ${post.deletedAt.toISOString()} 软删恢复 (强制重审)`,
          metadata: { previousDeletedBy: post.deletedBy?.toString() ?? null },
        },
      }),
    ]);

    return this.prisma.post.findUnique({ where: { id: postId } });
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

    // 通知帖主：审核通过
    await this.notificationService.emit({
      userId: post.userId,
      event: NotificationEvent.AUDIT,
      title: '审核通过',
      body: `您的帖子"${post.title}"已通过审核`,
      payload: { type: 'post', id: postId.toString(), url: `/posts/${postId}` },
      priority: 3,
    }).catch((e) => this.swallowNotificationError(e, 'audit_pass', post.userId));

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

    // 通知帖主：审核未通过
    await this.notificationService.emit({
      userId: post.userId,
      event: NotificationEvent.AUDIT,
      title: '审核未通过',
      body: `您的帖子"${post.title}"未通过审核：${reason}`,
      payload: { type: 'post', id: postId.toString(), url: `/posts/${postId}`, reason },
      priority: 4,
    }).catch((e) => this.swallowNotificationError(e, 'audit_reject', post.userId));

    return this.prisma.post.findUnique({ where: { id: postId } });
  }

  /**
   * 强制下架（MUST-25 修复：单事务 + AuditLog + T-001 软删）
   */
  async offline(adminId: bigint, postId: bigint, reason: string) {
    if (!reason) throw new BadRequestException('下架时必须填写理由');
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);

    const reasonText = `[强制下架] ${reason}`;

    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        // 修复:offline 应设 status=deleted (PRD §4.2), 30 天后硬清 cron (line 266) 才能匹配
        // 此前写 'rejected' 会让强制下架的帖子永远不被清理
        // T-001: 同时写 deletedAt/deletedBy/updatedBy 走软删除中间件
        data: {
          status: 'deleted',
          auditStatus: 'rejected',
          auditReason: reasonText,
          deletedAt: new Date(),
          deletedBy: adminId,
          updatedBy: adminId,
        },
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

    // 通知帖主：帖子被强制下架
    await this.notificationService.emit({
      userId: post.userId,
      event: NotificationEvent.AUDIT,
      title: '帖子已下架',
      body: `您的帖子"${post.title}"已被下架：${reason}`,
      payload: { type: 'post', id: postId.toString(), url: `/posts/${postId}`, reason },
      priority: 4,
    }).catch((e) => this.swallowNotificationError(e, 'offline', post.userId));

    return this.prisma.post.findUnique({ where: { id: postId } });
  }

  /**
   * 批量审核（SHOULD-27）
   * POST /api/v1/admin/posts/audit-batch
   * body: { ids: string[]; action: 'pass' | 'reject'; reason?: string }
   * 只对 auditStatus=pending 生效；事务: updateMany + 单条 audit_log (metadata.ids)
   */
  async auditBatch(
    adminId: bigint,
    ids: bigint[],
    action: 'pass' | 'reject',
    reason?: string,
  ) {
    if (ids.length === 0) {
      throw new BadRequestException('ids 不能为空');
    }
    if (ids.length > 200) {
      throw new BadRequestException('单次最多 200 条');
    }
    if (action === 'reject' && (!reason || !reason.trim())) {
      throw new BadRequestException('批量拒绝时必须填写理由');
    }

    // 预查:只对 auditStatus=pending 的生效
    const targets = await this.prisma.post.findMany({
      where: { id: { in: ids }, auditStatus: 'pending' },
      select: { id: true },
    });
    if (targets.length === 0) {
      throw new BadRequestException('没有可审核的帖子(可能已审核或不存在)');
    }
    const targetIds = targets.map((t) => t.id);

    const op = action === 'pass'
      ? { auditStatus: 'passed', status: 'active', auditReason: reason ? `[batch pass] ${reason}` : null }
      : { auditStatus: 'rejected', status: 'rejected', auditReason: reason! };

    const updateOp = this.prisma.post.updateMany({
      where: { id: { in: targetIds } },
      data: op,
    });

    const logOp = this.prisma.auditLog.create({
      data: {
        adminUserId: adminId,
        module: 'post',
        action: action === 'pass' ? 'audit_pass_batch' : 'audit_reject_batch',
        targetType: 'post',
        targetId: null,
        reason: reason || null,
        metadata: { ids: targetIds.map(String), count: targetIds.length },
      },
    });

    await this.prisma.$transaction([updateOp, logOp]);
    return { success: targetIds.length };
  }

  /**
   * 批量下架（SHOULD-27）
   * POST /api/v1/admin/posts/offline-batch
   * body: { ids: string[]; reason: string }
   * 不限状态,强制下架;事务: updateMany + 单条 audit_log (metadata.ids)
   */
  async offlineBatch(adminId: bigint, ids: bigint[], reason: string) {
    if (ids.length === 0) {
      throw new BadRequestException('ids 不能为空');
    }
    if (ids.length > 200) {
      throw new BadRequestException('单次最多 200 条');
    }
    if (!reason || !reason.trim()) {
      throw new BadRequestException('必须填写下架理由');
    }

    // 强制下架:不限制状态
    const targets = await this.prisma.post.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (targets.length === 0) {
      throw new BadRequestException('没有可下架的帖子');
    }
    const targetIds = targets.map((t) => t.id);

    const updateOp = this.prisma.post.updateMany({
      where: { id: { in: targetIds } },
      data: {
        // 同 offline 单条修复:status=deleted 让 30 天硬清 cron 命中
        // T-001: 同时写 deletedAt/deletedBy/updatedBy
        status: 'deleted',
        auditStatus: 'rejected',
        auditReason: `[强制下架] ${reason}`,
        deletedAt: new Date(),
        deletedBy: adminId,
        updatedBy: adminId,
      },
    });

    const logOp = this.prisma.auditLog.create({
      data: {
        adminUserId: adminId,
        module: 'post',
        action: 'offline_batch',
        targetType: 'post',
        targetId: null,
        reason,
        metadata: { ids: targetIds.map(String), count: targetIds.length },
      },
    });

    await this.prisma.$transaction([updateOp, logOp]);
    return { success: targetIds.length };
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
