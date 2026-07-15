import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// [P1-1 2026-07-15] 评论/回复触发通知
import { NotificationService } from '../notification/notification.service';
import { NotificationEvent } from '../notification/notification-event';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

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
   *
   * [P2-06] V1.0 验收修复: 当 postId 不存在时应抛 NotFoundException (404)
   * 此前直接 prisma.comment.findMany, 即使 post 不存在也返回 200 + 空数组
   *   - 与同模块 create() 的行为不一致
   *   - 让前端难以区分"该帖无评论"与"该帖不存在"
   * 修复: 第一步先校验 post 存在 (与 create() 第 70-79 行同模式)
   * [C-P1-05] P1 修复: children include 显式过滤已软删 (status=1)
   * 中间件自动加 deletedAt:null, 行为已正确, 但 children 子查询 where 也加 status=0 保险
   */
  async findByPost(postId: bigint, options: { page?: number; pageSize?: number } = {}) {
    const { page = 1, pageSize = 20 } = options;

    // [P2-06] 校验 post 存在性, 与 create() 一致
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${postId} 不存在`);
    }
    if (post.status === 'deleted') {
      // 已删除帖返回空列表而非 404 — 与 create() 抛 BadRequest 不同
      // (create 是写操作,不允许;读操作允许空结果)
      return { list: [], total: 0, page, pageSize };
    }

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
            // [C-P1-05] 同时过滤 status=0 和 (中间件自动) deletedAt:null
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
   * [C-P1-02] P1 修复: parentId 仅允许指向顶级 (parent.parentId 必须为 null)
   * 限制嵌套深度 ≤ 2 层 (顶级 + 1 层回复), 防止无限嵌套刷屏/渲染性能问题
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
      select: { id: true, status: true, userId: true, title: true },
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
        select: { id: true, postId: true, parentId: true, status: true },
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
      // [C-P1-02] 深度限制: parentId 必须指向顶级 (parent.parentId = null)
      if (parent.parentId !== null) {
        throw new BadRequestException(
          '回复嵌套深度不能超过 2 层，请回复顶级留言',
        );
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

    // [P1-1 2026-07-15] 触发通知:
    //  - 顶级评论 → 通知帖子作者 (post.userId)
    //  - 回复评论 → 通知被回复者 (parent.userId)
    //  - 通知发送不阻塞响应, 失败仅 warn, 不影响评论创建
    //  - 跳过 self-notify (自己评论自己帖子/回复自己不发)
    this.fireCommentNotification({
      actorUserId: userId,
      actorNickname: comment.user?.nickname || '',
      postId,
      postTitle: post.title ?? '',
      commentId: comment.id,
      commentContent: content.slice(0, 50),
      parentId: parentId ?? null,
      postOwnerId: post.userId,
    }).catch((e) =>
      this.logger.warn(`评论通知发送失败: ${e?.message ?? e}`),
    );

    return comment;
  }

  /**
   * [P1-1 2026-07-15] 评论通知发射器
   * 规则:
   *  - 有 parentId → 通知被回复者 (parent.userId, 必须不是 actor 本身)
   *  - 无 parentId → 通知帖子作者 (post.userId, 必须不是 actor 本身)
   *  - 都不发: 父留言/帖子已软删
   */
  private async fireCommentNotification(input: {
    actorUserId: bigint;
    actorNickname: string;
    postId: bigint;
    postTitle: string;
    commentId: bigint;
    commentContent: string;
    parentId: bigint | null;
    postOwnerId: bigint;
  }) {
    let recipientId: bigint | null = null;
    let url = `/posts/${input.postId}`;
    let body = '';

    if (input.parentId) {
      // 回复: 通知被回复者
      const parent = await this.prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { userId: true, status: true },
      });
      if (!parent || parent.status === 1) return;
      if (parent.userId === input.actorUserId) return; // 自回复不发
      recipientId = parent.userId;
      body = `${input.actorNickname || '有人'} 回复了你: ${input.commentContent}`;
    } else {
      // 顶级评论: 通知帖子作者 (用入参 postOwnerId 避免再次查询)
      if (input.postOwnerId === input.actorUserId) return; // 自评自帖不发
      recipientId = input.postOwnerId;
      url = `/posts/${input.postId}#comment-${input.commentId}`;
      body = `${input.actorNickname || '有人'} 评论了你的帖子「${input.postTitle}」: ${input.commentContent}`;
    }

    if (!recipientId) return;

    await this.notificationService.emit({
      userId: recipientId,
      event: NotificationEvent.COMMENT,
      title: input.parentId ? '新回复' : '新评论',
      body,
      payload: {
        type: 'comment',
        id: input.commentId.toString(),
        postId: input.postId.toString(),
        url,
      },
      priority: input.parentId ? 2 : 3, // 回复 > 顶级评论
    });
  }

  /**
   * 删除留言
   * 权限：自己 / post 作者 / 管理员（V1 暂未实现 admin role）
   * [C-P1-01] P1 修复: 删除父留言时级联软删所有 children, 并相应递减 commentCount
   * 原: 仅软删父留言 + -1, 子留言 (status=0) 仍可见 → commentCount 漂移
   * 修复: 软删父留言 + 所有未删 children + commentCount - (1 + childrenCount)
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

    // [C-P1-01] 仅当删父留言 (parentId=null) 时级联 children
    const isTopLevel = comment.parentId === null;
    await this.prisma.$transaction(async (tx) => {
      let cascadeCount = 0;
      if (isTopLevel) {
        // 先查未删 children 数量
        const activeChildren = await tx.comment.count({
          where: { parentId: commentId, status: 0 },
        });
        cascadeCount = activeChildren;
        // 软删 children
        await tx.comment.updateMany({
          where: { parentId: commentId, status: 0 },
          data: { status: 1, updatedBy: userId },
        });
      }
      // 软删父留言本身 (如有 -1)
      await tx.comment.update({
        where: { id: commentId },
        data: { status: 1, updatedBy: userId },
      });
      // post.commentCount 总扣 (1 父 + childrenCount)
      const totalDecrement = 1 + cascadeCount;
      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: totalDecrement } },
      });
      return { cascadeCount };
    });

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
