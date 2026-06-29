import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * [P0-001] 写入口封禁检查
   * - auth.service 已拦截登录，但 access_token 在 7 天有效期内仍可调用
   * - 写操作必须在入口再校验一次，避免封禁用户在被封禁期间继续留言/删留言
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
   * 帖子留言列表（含回复）
   * 顶级留言按时间正序排，回复挂在 parent 下
   * GET /api/v1/posts/:postId/comments
   */
  async findByPost(postId: bigint, options: { page?: number; pageSize?: number } = {}) {
    const { page = 1, pageSize = 20 } = options;
    const where = { postId, status: 0, parentId: null }; // 只查顶级

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          children: {
            where: { status: 0 },
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, nickname: true, avatar: true } },
            },
          },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 发留言（顶级或回复）
   * POST /api/v1/posts/:postId/comments
   */
  async create(
    userId: bigint,
    postId: bigint,
    content: string,
    parentId?: bigint,
  ) {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);

    // 1. 校验 post
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${postId} 不存在`);
    }
    if (post.status === 'deleted') {
      throw new BadRequestException('不能给已删除的信息留言');
    }

    // 2. 校验 parent（如果有）
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, status: true },
      });
      if (!parent) {
        throw new NotFoundException(`父留言 ID ${parentId} 不存在`);
      }
      if (parent.postId !== postId) {
        throw new BadRequestException('父留言不属于当前帖子');
      }
      if (parent.status === 1) {
        throw new BadRequestException('父留言已隐藏');
      }
    }

    // 3. 事务：创建留言 + 增加 post 评论数
    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          userId,
          postId,
          parentId: parentId ?? null,
          content,
        },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    return comment;
  }

  /**
   * 删除留言
   * 权限：自己 / post 作者 / 管理员（V1 暂未实现 admin role）
   */
  async remove(userId: bigint, commentId: bigint) {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { userId: true } } },
    });
    if (!comment) {
      throw new NotFoundException(`留言 ID ${commentId} 不存在`);
    }

    const isAuthor = comment.userId === userId;
    const isPostOwner = comment.post.userId === userId;
    if (!isAuthor && !isPostOwner) {
      throw new ForbiddenException('只能删除自己的留言或自己帖子下的留言');
    }

    // 软删（status=1 隐藏）
    await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: commentId },
        data: { status: 1 },
      }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return { id: commentId.toString(), deleted: true };
  }

  /**
   * 查询单个
   */
  async findOne(id: bigint) {
    const c = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
    if (!c) {
      throw new NotFoundException(`留言 ID ${id} 不存在`);
    }
    return c;
  }
}
