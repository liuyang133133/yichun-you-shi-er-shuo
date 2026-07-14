import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: { post: { select: { id: true, userId: true, status: true, type: true } } },
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
    return this.prisma.jobApplication.create({
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
   */
  async updateStatus(userId: bigint, id: bigint, status: '已查看' | '已回复') {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);

    const app = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { postJob: { include: { post: { select: { userId: true } } } } },
    });
    if (!app) throw new NotFoundException(`投递 ID ${id} 不存在`);
    if (app.postJob.post.userId !== userId) {
      throw new BadRequestException('只有发布该职位的用户可修改投递状态');
    }
    return this.prisma.jobApplication.update({ where: { id }, data: { status } });
  }
}
