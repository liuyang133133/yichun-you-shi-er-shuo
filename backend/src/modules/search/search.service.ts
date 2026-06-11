import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type SearchType = 'house' | 'secondhand' | 'job' | 'lifebiz';

/**
 * 全文搜索服务
 *
 * V1.0: 用 MySQL FULLTEXT 索引（ngram parser，支持中文 2 字以上）+ LIKE 兜底
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

    // 过滤条件
    const extraWhere: string[] = ['p.status = \'active\''];
    const params2: any[] = [];
    if (type) {
      extraWhere.push('p.type = ?');
      params2.push(type);
    }
    if (areaId) {
      extraWhere.push('p.area_id = ?');
      params2.push(BigInt(areaId));
    }
    if (categoryId) {
      extraWhere.push('p.category_id = ?');
      params2.push(BigInt(categoryId));
    }
    const whereSql = extraWhere.join(' AND ');

    // 使用 FULLTEXT 搜索主表 title + description
    // 用 BOOLEAN MODE 支持中文短语（ngram parser 自动分词）
    const skip = (page - 1) * pageSize;
    const ftQuery = `+${q.trim().split(/\s+/).join('* +')}*`; // 通配符模式

    // 主搜索：FULLTEXT 匹配 + 子详情 LIKE 兜底（社区/地址/职位等）
    const sql = `
      SELECT DISTINCT p.id, p.user_id, p.category_id, p.area_id, p.type, p.title, p.description,
             p.price, p.price_unit, p.contact_name, p.status, p.audit_status, p.view_count,
             p.favorite_count, p.comment_count, p.created_at, p.updated_at,
             MATCH(p.title, p.description) AGAINST (? IN BOOLEAN MODE) AS _score
      FROM posts p
      LEFT JOIN post_houses h ON h.post_id = p.id
      LEFT JOIN post_secondhands sh ON sh.post_id = p.id
      LEFT JOIN post_jobs j ON j.post_id = p.id
      LEFT JOIN post_lifebizs lb ON lb.post_id = p.id
      WHERE ${whereSql}
        AND (
          MATCH(p.title, p.description) AGAINST (? IN BOOLEAN MODE)
          OR h.community_name LIKE ?
          OR h.address LIKE ?
          OR sh.category_name LIKE ?
          OR sh.usage_duration LIKE ?
          OR j.industry LIKE ?
          OR j.work_address LIKE ?
          OR lb.sub_category LIKE ?
        )
      ORDER BY _score DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const like = `%${q}%`;
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      sql,
      // 顺序:whereSql 占位(type/areaId/categoryId) → MATCH(SELECT) → MATCH(OR) → 7 LIKE → LIMIT/OFFSET
      // F-3 附带修复:预存 bug — params2 构建后从未 spread,带 type/areaId/categoryId 过滤时 500
      ...params2,
      ftQuery, ftQuery, like, like, like, like, like, like, like,
      Number(pageSize), skip,
    );

    // 总数（同 WHERE 但去 LIMIT）
    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM posts p
      LEFT JOIN post_houses h ON h.post_id = p.id
      LEFT JOIN post_secondhands sh ON sh.post_id = p.id
      LEFT JOIN post_jobs j ON j.post_id = p.id
      LEFT JOIN post_lifebizs lb ON lb.post_id = p.id
      WHERE ${whereSql}
        AND (
          MATCH(p.title, p.description) AGAINST (? IN BOOLEAN MODE)
          OR h.community_name LIKE ?
          OR h.address LIKE ?
          OR sh.category_name LIKE ?
          OR sh.usage_duration LIKE ?
          OR j.industry LIKE ?
          OR j.work_address LIKE ?
          OR lb.sub_category LIKE ?
        )
    `;
    const countResult = await this.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
      countSql,
      // 顺序:whereSql 占位 → MATCH(OR) → 7 LIKE(无 SELECT 中的 MATCH,无 LIMIT/OFFSET)
      ...params2,
      ftQuery, like, like, like, like, like, like, like,
    );
    const total = Number(countResult[0]?.total || 0);

    // 关联 user / category / area
    const ids = rows.map((r) => r.id);
    const [users, categories, areas] = await Promise.all([
      ids.length
        ? this.prisma.user.findMany({
            where: { id: { in: rows.map((r) => r.user_id) } },
            select: { id: true, nickname: true, avatar: true },
          })
        : [],
      ids.length
        ? this.prisma.category.findMany({
            where: { id: { in: rows.map((r) => r.category_id) } },
            select: { id: true, name: true, code: true },
          })
        : [],
      ids.length
        ? this.prisma.area.findMany({
            where: { id: { in: rows.map((r) => r.area_id).filter(Boolean) } },
            select: { id: true, name: true, level: true },
          })
        : [],
    ]);

    const userMap = new Map(users.map((u) => [u.id.toString(), u]));
    const catMap = new Map(categories.map((c) => [c.id.toString(), c]));
    const areaMap = new Map(areas.map((a) => [a.id.toString(), a]));

    const list = rows.map((r) => {
      // 显式列出字段 + 转换所有 BigInt,避免 ...r spread 保留原始 BigInt 字段
      // 触发 JSON.stringify("Do not know how to serialize a BigInt")
      return {
        id: r.id.toString(),
        userId: r.user_id.toString(),
        categoryId: r.category_id.toString(),
        areaId: r.area_id != null ? r.area_id.toString() : null,
        type: r.type,
        title: r.title,
        description: r.description,
        price: r.price,
        priceUnit: r.price_unit,
        contactName: r.contact_name,
        status: r.status,
        auditStatus: r.audit_status,
        viewCount: r.view_count,
        favoriteCount: r.favorite_count,
        commentCount: r.comment_count,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        // _score 在某些 MySQL 配置下会被 Prisma 推断为 BigInt,加 Number() 防御
        _score: Number(r._score),
        user: userMap.get(r.user_id.toString()) || null,
        category: catMap.get(r.category_id.toString()) || null,
        area: r.area_id ? areaMap.get(r.area_id.toString()) || null : null,
      };
    });

    return { list, total, page, pageSize, query: q };
  }

  /**
   * 热门搜索词（V1 简化：从数据库聚合最近关键词）
   * 真实场景应放 Redis ZSET
   */
  async hotKeywords(limit = 10) {
    const clampedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    // 使用 $queryRaw tag（参数化绑定安全）
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
      LIMIT ${clampedLimit}
    `;
    return result.map((r) => ({ keyword: r.word, count: Number(r.count) }));
  }
}
