import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type SearchType = 'house' | 'secondhand' | 'job' | 'lifebiz';

/**
 * 全文搜索服务
 *
 * V1 简化版：LIKE 搜索（中文友好）
 * 数据库层用 FULLTEXT 索引（迁移后用 SQL 加）
 * V1.1 计划：换 Meilisearch / Elasticsearch
 *
 * API: GET /api/v1/search?q=xxx&type=house&page=1&pageSize=20
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: {
    q: string;
    type?: SearchType;
    areaId?: number;
    categoryId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { q, type, areaId, categoryId, page = 1, pageSize = 20 } = params;

    if (!q || !q.trim()) {
      throw new BadRequestException('搜索关键词 q 不能为空');
    }
    if (q.length > 100) {
      throw new BadRequestException('搜索关键词过长（限 100 字符）');
    }

    const where: Prisma.PostWhereInput = {
      status: 'active',
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        // 房屋 + 二手 + lifebiz 详情的特殊字段
        { house: { OR: [{ communityName: { contains: q } }, { address: { contains: q } }] } },
        { secondhand: { OR: [{ categoryName: { contains: q } }, { usageDuration: { contains: q } }] } },
        { job: { OR: [{ jobType: { contains: q } }, { industry: { contains: q } }, { workAddress: { contains: q } }] } },
        { lifebiz: { subCategory: { contains: q } } },
      ],
    };
    if (type) where.type = type;
    if (areaId) where.areaId = BigInt(areaId);
    if (categoryId) where.categoryId = BigInt(categoryId);

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          category: { select: { id: true, name: true, code: true } },
          area: { select: { id: true, name: true, level: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return { list, total, page, pageSize, query: q };
  }

  /**
   * 热门搜索词（V1 简化：从数据库聚合最近关键词）
   * 真实场景应放 Redis ZSET
   */
  async hotKeywords(limit = 10) {
    // V1 占位：从已存在的 title 提取最常出现的词
    const result = await this.prisma.$queryRaw<Array<{ word: string; count: bigint }>>`
      SELECT word, COUNT(*) as count
      FROM (
        SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(title, ' ', n.n), ' ', -1) AS word
        FROM posts,
        (SELECT 1 n UNION SELECT 2 UNION SELECT 3) n
        WHERE LENGTH(title) - LENGTH(REPLACE(title, ' ', '')) >= n.n - 1
      ) words
      WHERE CHAR_LENGTH(word) >= 2
      GROUP BY word
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    return result.map((r) => ({ keyword: r.word, count: Number(r.count) }));
  }
}
