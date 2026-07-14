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
      select: { id: true, status: true },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${postId} 不存在`);
    }
    if (post.status === 'deleted') {
      throw new BadRequestException('不能收藏已删除的信息');
    }

    // 2. 检查是否已收藏（活跃行 — 中间件自动过滤 deletedAt:null）
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId } },
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
   * - 中间件默认查询 deletedAt:null, 因此 findUnique 时只能拿到活跃行
   * - 改为 soft delete 后, 用户再次收藏走 add() 的"复活"路径, favoriteCount 保持一致
   */
  async remove(userId: bigint, postId: bigint) {
    // ===== [P0-001] 封禁检查 =====
    await this.assertUserNotBanned(userId);

    // 1. 查活跃行（中间件自动加 deletedAt:null）
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId } },
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
   */
  async findMyFavorites(
    userId: bigint,
    options: { page?: number; pageSize?: number; type?: string } = {},
  ) {
    const { page = 1, pageSize = 20, type } = options;
    const where: Prisma.FavoriteWhereInput = { userId };
    if (type) where.post = { type };

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
   */
  async isFavorited(userId: bigint, postId: bigint): Promise<boolean> {
    const f = await this.prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    return !!f;
  }

  /**
   * 我的收藏数量
   */
  async countMyFavorites(userId: bigint) {
    return this.prisma.favorite.count({ where: { userId } });
  }
}
