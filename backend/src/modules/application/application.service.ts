import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// [P1-2 2026-07-15] 投递/状态变更触发通知
import { NotificationService } from '../notification/notification.service';
import { NotificationEvent } from '../notification/notification-event';

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * [P0-001] 写入口封禁检查
   * - auth.service 已拦截登录，但 access_token 在 7 天有效期内仍可调用
   * - 写操作必须在入口再校验一次，避免封禁用户在被封禁期间继续投递/改状态
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
   * 投递简历到职位
   * POST /api/v1/applications
   * 自动取当前用户的 resume（必须有）
   */
  async apply(userId: bigint, postJobId: bigint, coverLetter?: string) {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);
    // 1. 校验 post_job 存在
    const postJob = await this.prisma.postJob.findUnique({
      where: { id: postJobId },
      include: { post: { select: { id: true, userId: true, status: true, type: true, title: true } } },
    });
    if (!postJob) throw new NotFoundException(`职位 ID ${postJobId} 不存在`);
    if (postJob.post.type !== 'job' || postJob.post.status !== 'active') {
      throw new BadRequestException('该职位不可投递');
    }
    if (postJob.post.userId === userId) {
      throw new BadRequestException('不能投递自己发布的职位');
    }

    // 2. 校验当前用户有简历
    const resume = await this.prisma.resume.findUnique({ where: { userId } });
    if (!resume) {
      throw new BadRequestException('请先创建简历（PUT /resumes/me）');
    }

    // 3. 防重复投递（唯一索引）
    const existing = await this.prisma.jobApplication.findUnique({
      where: { postJobId_resumeId: { postJobId, resumeId: resume.id } },
    });
    if (existing) {
      throw new ConflictException('已经投递过该职位');
    }

    // 4. [D-P0-01] P0 修复: 招满拦截 — 活跃投递数 >= recruitCount 即拒
    const activeCount = await this.prisma.jobApplication.count({
      where: {
        postJobId,
        status: { in: ['已投递', '已查看', '已回复'] },
      },
    });
    if (activeCount >= postJob.recruitCount) {
      throw new ConflictException(
        `该职位已招满（${activeCount}/${postJob.recruitCount}），无法投递`,
      );
    }

    // 5. 创建投递记录
    const application = await this.prisma.jobApplication.create({
      data: {
        postJobId,
        resumeId: resume.id,
        userId,
        coverLetter,
        status: '已投递',
      },
      include: {
        postJob: { include: { post: { select: { id: true, title: true } } } },
        resume: { select: { id: true, name: true, expectedPosition: true } },
      },
    });

    // [P1-2 2026-07-15] 通知职位发布者
    this.fireApplicationNotification({
      recipientId: postJob.post.userId,
      type: 'received',
      postId: postJob.post.id,
      postTitle: postJob.post.title,
      applicationId: application.id,
      applicantName: resume.name || '求职者',
    }).catch((e) =>
      this.logger.warn(`投递通知发送失败: ${e?.message ?? e}`),
    );

    return application;
  }

  /**
   * 我的投递记录
   * GET /api/v1/applications/me
   */
  async findMyApplications(userId: bigint, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;

    const list = await this.prisma.jobApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        postJob: {
          include: {
            post: { select: { id: true, title: true, status: true } },
            company: { select: { id: true, name: true, logo: true } },
          },
        },
      },
    });
    return { list, total: list.length };
  }

  /**
   * 某职位收到的简历（HR 端）
   * GET /api/v1/applications/post-job/:id
   * 只有 post 作者可看
   */
  async findByPostJob(userId: bigint, postJobId: bigint) {
    const postJob = await this.prisma.postJob.findUnique({
      where: { id: postJobId },
      include: { post: { select: { userId: true } } },
    });
    if (!postJob) throw new NotFoundException(`职位 ID ${postJobId} 不存在`);
    if (postJob.post.userId !== userId) {
      throw new BadRequestException('只有发布该职位的用户可查看收到的简历');
    }

    return this.prisma.jobApplication.findMany({
      where: { postJobId },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: true,
        user: { select: { id: true, nickname: true, avatar: true, phone: true } },
      },
    });
  }

  /**
   * 标记投递状态（已查看/已回复）— HR 端
   * PATCH /api/v1/applications/:id/status
   * [P1-2 2026-07-15] 状态变更后通知投递者
   */
  async updateStatus(userId: bigint, id: bigint, status: '已查看' | '已回复') {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);

    const app = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { postJob: { include: { post: { select: { id: true, title: true, userId: true } } } } },
    });
    if (!app) throw new NotFoundException(`投递 ID ${id} 不存在`);
    if (app.postJob.post.userId !== userId) {
      throw new BadRequestException('只有发布该职位的用户可修改投递状态');
    }
    const updated = await this.prisma.jobApplication.update({ where: { id }, data: { status } });

    // [P1-2 2026-07-15] 通知投递者
    this.fireApplicationNotification({
      recipientId: app.userId,
      type: 'status_changed',
      postId: app.postJob.post.id,
      postTitle: app.postJob.post.title,
      applicationId: id,
      newStatus: status,
    }).catch((e) =>
      this.logger.warn(`投递状态通知发送失败: ${e?.message ?? e}`),
    );

    return updated;
  }

  /**
   * [P1-2 2026-07-15] 投递相关通知发射器
   * - type=received → 通知 HR (有人投递了)
   * - type=status_changed → 通知求职者 (HR 已查看/已回复)
   */
  private async fireApplicationNotification(input: {
    recipientId: bigint;
    type: 'received' | 'status_changed';
    postId: bigint;
    postTitle: string;
    applicationId: bigint;
    applicantName?: string;
    newStatus?: '已查看' | '已回复';
  }) {
    let title = '';
    let body = '';
    let priority = 3;

    if (input.type === 'received') {
      title = '收到新简历';
      body = `${input.applicantName || '求职者'} 投递了「${input.postTitle}」`;
      priority = 3;
    } else {
      title = input.newStatus === '已回复' ? 'HR 已回复' : 'HR 已查看';
      body = `你投递的「${input.postTitle}」状态变更为 ${input.newStatus}`;
      priority = input.newStatus === '已回复' ? 2 : 4; // 已回复 > 已查看
    }

    await this.notificationService.emit({
      userId: input.recipientId,
      event: NotificationEvent.ORDER, // 复用 order 事件码 (业务上"订单状态变化"语义相近)
      title,
      body,
      payload: {
        type: 'application',
        id: input.applicationId.toString(),
        postId: input.postId.toString(),
        url: `/applications/me`,
      },
      priority,
    });
  }
}
