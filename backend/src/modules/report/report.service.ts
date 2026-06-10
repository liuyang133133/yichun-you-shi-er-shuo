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

    // 4. 创建举报
    return this.prisma.report.create({
      data: {
        userId,
        postId,
        reason,
        description: description || null,
        status: 'pending',
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
}
