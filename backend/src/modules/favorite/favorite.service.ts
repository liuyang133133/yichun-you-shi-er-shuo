import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * [P0-001] 写入口封禁检查
   * - auth.service 已拦截登录，但 access_token 在 7 天有效期内仍可调用
   * - 写操作必须在入口再校验一次，避免封禁用户在被封禁期间继续收藏/取消收藏
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
   * 收藏（幂等：重复收藏不报错）
   * [C-P1-06] P1 修复: 改用软删后, add 时支持"复活"已软删的收藏
   * 原: remove 硬删, 后 add 重新创建 → @@unique 没问题但违反 T-001 软删规范
   * 修复: remove 软删保留行 + add 优先复用(undelete), 仅新用户首收才创建
   */
  async add(userId: bigint, postId: bigint) {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);
    // 1. 校验 post 存在且未删除
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, userId: true },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${postId} 不存在`);
    }
    if (post.status === 'deleted') {
      throw new BadRequestException('不能收藏已删除的信息');
    }
    // [P1-8 2026-07-15] 禁止自收藏: 避免自己刷数据/排行榜作弊
    if (post.userId === userId) {
      throw new BadRequestException('不能收藏自己发布的信息');
    }

    // 2. 检查是否已收藏（活跃行 — 中间件自动过滤 deletedAt:null）
    // [P0-AUDIT-2026-07-15] 改用 findFirst + 显式 userId/postId 过滤
    // 原因: findUnique({ where: { userId_postId: {...} } }) 不能加 deletedAt: null
    //       即使软删中间件把 action 改写为 findFirst, where.userId_postId
    //       (compound unique input) 在 findFirst 上下文里也不合法 (Prisma 报 Unknown argument)
    //       解决: 直接用 findFirst + userId/postId 普通过滤, 跟软删中间件配合
    const existing = await this.prisma.favorite.findFirst({
      where: { userId, postId },
    });
    if (existing) {
      return { postId: postId.toString(), alreadyFavorited: true };
    }

    // 3. [C-P1-06] 检查是否有软删行可复活（绕过中间件显式查 deletedAt: not null）
    const softDeleted = await this.prisma.favorite.findFirst({
      where: {
        userId,
        postId,
        deletedAt: { not: null },
      },
      select: { id: true },
    });
    if (softDeleted) {
      // 复活旧行：count 不动（remove 时已 -1），仅清 soft-delete 标记
      await this.prisma.favorite.update({
        where: { id: softDeleted.id },
        data: { deletedAt: null, deletedBy: null, updatedBy: userId },
      });
      return { postId: postId.toString(), alreadyFavorited: false, restored: true };
    }

    // 4. 全新创建 + favoriteCount++
    await this.prisma.$transaction([
      this.prisma.favorite.create({
        data: { userId, postId, createdBy: userId, updatedBy: userId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { favoriteCount: { increment: 1 } },
      }),
    ]);

    return { postId: postId.toString(), alreadyFavorited: false };
  }

  /**
   * 取消收藏
   * [C-P1-06] P1 修复: 改为软删, 保留行供后续 add() 复活
   * [P0-AUDIT-2026-07-15] 同步改用 findFirst (与 add() 保持一致)
   */
  async remove(userId: bigint, postId: bigint) {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);

    // 1. 查活跃行（中间件自动加 deletedAt:null）
    const existing = await this.prisma.favorite.findFirst({
      where: { userId, postId },
    });
    if (!existing) {
      return { postId: postId.toString(), alreadyRemoved: true };
    }

    // 2. [C-P1-06] 软删行 + 减计数
    await this.prisma.$transaction([
      this.prisma.favorite.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);

    return { postId: postId.toString(), alreadyRemoved: false };
  }

  /**
   * 我的收藏（分页 + 含 post 信息）
   *
   * [P1-7 2026-07-15] 修复: where 增加 post 状态过滤, 排除已删/已拒帖子
   * 之前: 收藏的 post 即使被 admin 软删/审核拒绝, 仍会出现在 /me/favorites 列表
   * 修复: 只展示 post.status='active' && post.auditStatus='passed' 的收藏
   *       type 过滤 (如 'house') 合并到 post 子查询, 不冲突
   *       total 用同样的过滤, 与列表条目数一致
   */
  async findMyFavorites(
    userId: bigint,
    options: { page?: number; pageSize?: number; type?: string } = {},
  ) {
    const { page = 1, pageSize = 20, type } = options;
    const postFilter: any = { status: 'active', auditStatus: 'passed' };
    if (type) postFilter.type = type;
    const where: Prisma.FavoriteWhereInput = { userId, post: postFilter };

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: {
              user: { select: { id: true, nickname: true, avatar: true } },
              category: { select: { id: true, name: true, code: true } },
              area: { select: { id: true, name: true, level: true } },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 检查当前用户是否收藏了指定 post（用于详情页）
   * [P0-AUDIT-2026-07-15] 改用 findFirst (与 add()/remove() 保持一致)
   */
  async isFavorited(userId: bigint, postId: bigint): Promise<boolean> {
    const f = await this.prisma.favorite.findFirst({
      where: { userId, postId },
      select: { id: true },
    });
    return !!f;
  }

  /**
   * 我的收藏数量
   *
   * [P1-7 2026-07-15] 修复: 与 findMyFavorites 保持一致, 只统计活跃帖子
   * 否则 /me 页 "收藏:N" 包含已删帖, 与 /me/favorites 列表条目数对不上
   */
  async countMyFavorites(userId: bigint) {
    return this.prisma.favorite.count({
      where: {
        userId,
        post: { status: 'active', auditStatus: 'passed' },
      },
    });
  }
}
