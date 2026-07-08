import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 举报理由（V1 固定枚举）
 * 后续可改成 admin 后台配置
 */
export const REPORT_REASONS = [
  '虚假信息', // 信息与实际不符
  '违法违规', // 涉黄赌毒、违禁品
  '重复发布', // 同一信息多次发布
  '已售/已招', // 状态过期未更新
  '虚假联系方式', // 电话/微信联系不上
  '人身攻击', // 含人身攻击内容
  '其他', // 其他原因（用 description 补充）
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * [P0-001] 写入口封禁检查
   * - auth.service 已拦截登录，但 access_token 在 7 天有效期内仍可调用
   * - 写操作必须在入口再校验一次，避免封禁用户在被封禁期间继续举报
   */
  private async assertUserNotBanned(userId: bigint): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (user?.status === 1) {
      throw new ForbiddenException('账号已被封禁，无法操作');
    }
  }

  /**
   * 提交举报
   * POST /api/v1/reports
   * body: { postId, reason, description? }
   */
  async create(
    userId: bigint,
    postId: bigint,
    reason: string,
    description?: string,
  ) {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);

    // 1. 校验 reason
    if (!REPORT_REASONS.includes(reason as ReportReason)) {
      throw new BadRequestException(
        `无效的举报理由: ${reason}（可选: ${REPORT_REASONS.join('/')}）`,
      );
    }

    // 2. 校验 post 存在
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, userId: true },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${postId} 不存在`);
    }
    if (post.status === 'deleted') {
      throw new BadRequestException('不能举报已删除的信息');
    }

    // 3. 不能举报自己的
    if (post.userId === userId) {
      throw new ForbiddenException('不能举报自己发布的信息');
    }

    // 4. [C-P1-04] P1 修复: 防同一用户对同一 post 重复举报
    // 原: 同一用户可无限刷同 post 举报, 浪费 admin 审核时间 + 历史被覆盖
    // 修复: 检查该用户对该 post 是否已有未处理 (pending) 举报, 有则报错
    //      已处理的 (handled/rejected) 允许重新举报 (情况可能有变化)
    const existing = await this.prisma.report.findFirst({
      where: {
        userId,
        postId,
        status: 'pending',
        // 中间件自动加 deletedAt:null, 这里不再显式过滤
      },
      select: { id: true, createdAt: true },
    });
    if (existing) {
      throw new BadRequestException(
        `您已举报过该信息, 等待管理员处理中（举报 ID: ${existing.id}）`,
      );
    }

    // 5. 创建举报
    return this.prisma.report.create({
      data: {
        userId,
        postId,
        reason,
        description: description || null,
        status: 'pending',
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        post: { select: { id: true, title: true, type: true } },
      },
    });
  }

  /**
   * 我的举报记录（分页）
   */
  async findMyReports(
    userId: bigint,
    options: { page?: number; pageSize?: number } = {},
  ) {
    const { page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          post: { select: { id: true, title: true, type: true, status: true } },
        },
      }),
      this.prisma.report.count({ where: { userId } }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 查询单个
   */
  async findOne(id: bigint) {
    const r = await this.prisma.report.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        post: { select: { id: true, title: true, type: true } },
        handler: { select: { id: true, nickname: true } },
      },
    });
    if (!r) {
      throw new NotFoundException(`举报 ID ${id} 不存在`);
    }
    return r;
  }

  /**
   * 举报理由选项（前端下拉用）
   */
  getReasons() {
    return REPORT_REASONS;
  }

  /**
   * [C-P1-05] P1 修复: 用户撤回自己的举报 (软删)
   * 原: report 表 schema 有 deletedAt 但 service 无对应处理, 数据脏
   * 修复: 软删 + 提供 restore 端点 (admin 后台可恢复误删)
   */
  async remove(userId: bigint, reportId: bigint) {
    const r = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!r) throw new NotFoundException(`举报 ID ${reportId} 不存在`);
    if (r.userId !== userId) {
      throw new ForbiddenException('只能撤回自己的举报');
    }
    await this.prisma.report.update({
      where: { id: reportId },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
    });
    return { id: reportId.toString(), withdrawn: true };
  }

  /**
   * [C-P1-05] restore 端点 (admin 用, 误删恢复)
   */
  async restore(reportId: bigint) {
    const r = await this.prisma.report.findFirst({
      where: { id: reportId, includeDeleted: true } as any,
    });
    if (!r) throw new NotFoundException(`举报 ID ${reportId} 不存在`);
    if (!r.deletedAt) {
      return { id: reportId.toString(), alreadyActive: true };
    }
    await this.prisma.report.update({
      where: { id: reportId },
      data: { deletedAt: null, deletedBy: null },
    });
    return { id: reportId.toString(), restored: true };
  }
}
