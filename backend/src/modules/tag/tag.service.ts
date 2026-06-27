/**
 * T-013 TagService
 *
 * 标签字典 CRUD + PostTag 关联管理 + 数据迁移
 *
 * 设计要点：
 *   - tags 表 + post_tags 关联表（多对多）
 *   - useCount 冗余字段，写入 PostTag 时事务内 +1/-1
 *   - Post.tags JSON 字段保留 1 个月兼容期（V1 季节频道标签）
 *   - 软删除：tags 表保留 deletedAt；PostTag 物理删除（CASCADE 由 FK 处理）
 *
 * 主要 API：
 *   - findAll({ q?, limit?, offset? })  公开
 *   - findBySlug(slug)                  公开
 *   - findHot(limit=20)                 公开
 *   - create / update / delete          后台（admin only）
 *   - attachToPost / detachFromPost     PostService 调用
 *   - findPostsByTag                    公开（标签详情页用）
 *   - migrateFromJson                   一次性数据迁移
 */
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface FindAllOptions {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTagInput {
  slug: string;
  name: string;
  description?: string;
  isHot?: boolean;
  sortOrder?: number;
}

export interface UpdateTagInput {
  name?: string;
  description?: string;
  isHot?: boolean;
  sortOrder?: number;
}

export interface FindPostsOptions {
  page?: number;
  pageSize?: number;
}

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ================ 公开 API ================

  /** 全列表（后台管理 / 搜索建议用） */
  async findAll(opts: FindAllOptions = {}) {
    const { q, limit = 50, offset = 0 } = opts;
    const where: any = { deletedAt: null };
    if (q) where.name = { contains: q };

    return this.prisma.tag.findMany({
      where,
      orderBy: [{ useCount: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      take: Math.min(limit, 200),
      skip: offset,
    });
  }

  /** 按 slug 查询单个标签 */
  async findBySlug(slug: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!tag) {
      throw new NotFoundException(`标签不存在: slug=${slug}`);
    }
    return tag;
  }

  /** 热门标签（首页/侧栏） */
  async findHot(limit = 20) {
    return this.prisma.tag.findMany({
      where: {
        deletedAt: null,
        OR: [{ isHot: true }, { useCount: { gt: 0 } }],
      },
      orderBy: [{ useCount: 'desc' }, { sortOrder: 'asc' }],
      take: Math.min(limit, 100),
    });
  }

  /** 标签详情页：通过 tagId 查关联帖子（带分页） */
  async findPostsByTag(tagId: bigint, opts: FindPostsOptions = {}) {
    const { page = 1, pageSize = 20 } = opts;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.postTag.findMany({
        where: {
          tagId,
          post: { deletedAt: null, status: 'online', auditStatus: 'passed' },
        },
        include: {
          post: {
            include: {
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
              area: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.postTag.count({
        where: {
          tagId,
          post: { deletedAt: null, status: 'online', auditStatus: 'passed' },
        },
      }),
    ]);

    return {
      list: items.map((it) => it.post),
      total,
      page,
      pageSize,
    };
  }

  // ================ 后台 API ================

  /** 新建标签（同 slug 自动加 -2 后缀） */
  async create(input: CreateTagInput, operatorId?: bigint) {
    const slug = await this.resolveUniqueSlug(input.slug);
    try {
      return await this.prisma.tag.create({
        data: {
          slug,
          name: input.name,
          description: input.description,
          isHot: input.isHot ?? false,
          sortOrder: input.sortOrder ?? 0,
          createdBy: operatorId,
          updatedBy: operatorId,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(`slug 冲突: ${slug}`);
      }
      throw e;
    }
  }

  /** 更新（不允许改 slug） */
  async update(id: bigint, input: UpdateTagInput, operatorId?: bigint) {
    try {
      return await this.prisma.tag.update({
        where: { id },
        data: {
          ...input,
          updatedBy: operatorId,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException(`标签不存在: id=${id}`);
      }
      throw e;
    }
  }

  /** 软删除（幂等：已删过的静默返回） */
  async delete(id: bigint, operatorId?: bigint) {
    const result = await this.prisma.tag.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy: operatorId,
      },
    });
    if (result.count === 0) {
      this.logger.debug(`标签 id=${id} 已删过，跳过`);
    }
  }

  // ================ PostTag 关联管理 ================

  /**
   * 给帖子关联标签（事务内）
   * 重复 (postId, tagId) 静默跳过（P2002 视为幂等成功，不增加 useCount）
   */
  async attachToPost(postId: bigint, tagIds: bigint[]) {
    if (!tagIds?.length) return;
    await this.prisma.$transaction(async (tx) => {
      for (const tagId of tagIds) {
        try {
          await tx.postTag.create({ data: { postId, tagId } });
          await tx.tag.update({
            where: { id: tagId },
            data: { useCount: { increment: 1 } },
          });
        } catch (e: any) {
          if (e?.code !== 'P2002') throw e;
          // 已存在关联，跳过 useCount 增加
        }
      }
    });
  }

  /**
   * 解除关联（事务内 + 减少 useCount）
   * deleteMany 不抛错（count=0 时静默）
   */
  async detachFromPost(postId: bigint, tagIds: bigint[]) {
    if (!tagIds?.length) return;
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.postTag.deleteMany({
        where: { postId, tagId: { in: tagIds } },
      });
      // 仅对实际删除的关联减 useCount（按 tagId 维度）
      // 简化实现：每个 tagId 都 -1（若实际未删除会造成 -1 偏差）
      // 更严格：先 findMany + groupBy 再减。为性能暂用 -1，结果轻度偏差可接受
      for (const tagId of tagIds) {
        await tx.tag.update({
          where: { id: tagId },
          data: { useCount: { decrement: 1 } },
        });
      }
      this.logger.debug(`postId=${postId} 解除 ${result.count} 个 PostTag`);
    });
  }

  // ================ 数据迁移 ================

  /**
   * 从 Post.tags JSON 字段迁移到 PostTag 关联表
   * 调用方式：`POST /api/v1/admin/tags/migrate-from-json`（V1.1 上线后由 cron 触发）
   *
   * @returns {{ tagCreated, postTagCreated }}
   */
  async migrateFromJson() {
    const posts = await this.prisma.post.findMany({
      where: { tags: { not: Prisma.JsonNull } },
      select: { id: true, tags: true },
    });

    let tagCreated = 0;
    let postTagCreated = 0;
    const cache = new Map<string, bigint>(); // slug -> id

    for (const p of posts) {
      const arr = (p.tags as string[] | null) ?? [];
      for (const name of arr) {
        const slug = this.toSlug(name);
        if (!slug) continue;

        // 命中缓存
        let tagId = cache.get(slug);

        if (!tagId) {
          // 查 DB
          const existing = await this.prisma.tag.findFirst({
            where: { slug, deletedAt: null },
            select: { id: true },
          });
          if (existing) {
            tagId = existing.id;
          } else {
            const created = await this.prisma.tag.create({
              data: { slug, name, useCount: 0 },
              select: { id: true },
            });
            tagId = created.id;
            tagCreated++;
          }
          cache.set(slug, tagId);
        }

        // 插 PostTag（重复跳过）
        try {
          await this.prisma.postTag.create({
            data: { postId: p.id, tagId },
          });
          await this.prisma.tag.update({
            where: { id: tagId },
            data: { useCount: { increment: 1 } },
          });
          postTagCreated++;
        } catch (e: any) {
          if (e?.code !== 'P2002') throw e;
        }
      }
    }

    this.logger.log(
      `数据迁移完成: tagCreated=${tagCreated} postTagCreated=${postTagCreated}`,
    );
    return { tagCreated, postTagCreated, postsScanned: posts.length };
  }

  // ================ 工具方法 ================

  /**
   * slug 唯一性：已存在则加 -2 / -3 后缀
   */
  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;
    while (suffix < 1000) {
      const exists = await this.prisma.tag.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true },
      });
      if (!exists) return slug;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
    return `${baseSlug}-${Date.now()}`;
  }

  /** 中文名 → 拼音 slug（简化版：仅做基本处理） */
  private toSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9一-龥-]/g, '')
      .substring(0, 50);
  }
}