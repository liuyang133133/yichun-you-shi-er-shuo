import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { NotificationEvent } from '../../notification/notification-event';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminReportService {
  private readonly logger = new Logger(AdminReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 通知发送失败不应阻塞举报处理主流程（业务侧已写库成功）
   * 仅记录 warn 日志，便于排查
   */
  private swallowNotificationError(e: any, action: string, userId: bigint) {
    this.logger.warn(
      `通知发送失败 [${action}] user=${userId}: ${e?.message ?? e}`,
    );
  }

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
    const r = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        post: { select: { id: true, title: true, userId: true } },
      },
    });
    if (!r) throw new NotFoundException(`举报 ID ${reportId} 不存在`);
    if (r.status !== 'pending') {
      return r; // 幂等
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. 标记举报为已处理
      const u = await tx.report.update({
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
      return u;
    });

    // 3. 双向通知：举报人 + 被举报人
    const actionText = action === 'handled'
      ? (postAction === 'down' ? '已下架违规内容' : '已处理（核实违规）')
      : '已忽略（未达违规）';

    // 3a) 通知举报人：您的举报已处理
    await this.notificationService.emit({
      userId: r.userId,
      event: NotificationEvent.APPEAL,
      title: '举报已处理',
      body: `您举报的帖子已被管理员处理：${actionText}`,
      payload: {
        type: 'report',
        id: reportId.toString(),
        url: `/posts/${r.postId ?? ''}`,
        action,
        postAction: postAction ?? null,
      },
      priority: 3,
    }).catch((e) => this.swallowNotificationError(e, 'report_handle_reporter', r.userId));

    // 3b) 通知被举报人：您的帖子被举报并被处理（仅当帖子存在且举报成立）
    if (r.post && r.post.userId) {
      await this.notificationService.emit({
        userId: r.post.userId,
        event: NotificationEvent.APPEAL,
        title: '您的帖子被举报',
        body: `您的帖子"${r.post.title}"被举报，管理员处理结果：${actionText}`,
        payload: {
          type: 'report',
          id: reportId.toString(),
          url: `/posts/${r.post.id}`,
          action,
          postAction: postAction ?? null,
        },
        priority: action === 'handled' ? 4 : 3,
      }).catch((e) => this.swallowNotificationError(e, 'report_handle_target', r.post!.userId));
    }

    return updated;
  }
}
