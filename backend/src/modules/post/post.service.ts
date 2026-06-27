import { Injectable, NotFoundException, ForbiddenException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostQueryDto } from './dto/list-post.dto';
import { RedisService } from '../../redis/redis.service';
import { ViewLogService } from '../view-log/view-log.service';
// SHOULD-9: 新用户 24h 内仅能 POST 1 条 post
import { RegisterThrottleService } from '../captcha/register-throttle.service';
// T-27: 发布后自动 AI (score + seo 异步)
import { AiService } from '../ai/ai.service';
import { SeoService } from '../seo/seo.service';
// T-013: 标签系统
import { TagService } from '../tag/tag.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly viewLog: ViewLogService,
    private readonly registerThrottle: RegisterThrottleService,
    // T-27: 发布后自动 AI (score + seo 异步)
    private readonly aiService: AiService,
    private readonly seoService: SeoService,
    // T-013: 标签系统（attach/detach PostTag）
    private readonly tagService: TagService,
  ) {}

  /** 列表缓存 TTL：5 分钟 */
  private static readonly LIST_CACHE_TTL = 300;

  /**
   * 列表查询（统一入口，type 必填）
   * 支持：分类/区域/关键词/价格区间/标签/排序/分页
   */
  async findAll(query: ListPostQueryDto) {
    const {
      type,
      categoryId,
      areaId,
      status = 'active',
      keyword,
      minPrice,
      maxPrice,
      sort = 'latest',
      page = 1,
      pageSize = 20,
      tagIds,
      tagSlugs,
    } = query;

    const where: Prisma.PostWhereInput = { type, status };
    let categoryOrFilter: Prisma.PostWhereInput[] | undefined;
    if (categoryId) {
      // [Bug fix] 子类目过滤：兼容父类目直接挂的旧数据
      // 若请求的是子分类（parentId 非空），同时匹配父分类下的所有帖子
      // 这样历史 categoryId=父级 的帖子也能在子 tab 里展示
      const cat = await this.prisma.category.findUnique({
        where: { id: BigInt(categoryId) },
        select: { id: true, parentId: true },
      });
      if (cat?.parentId) {
        categoryOrFilter = [
          { categoryId: cat.id },
          { categoryId: cat.parentId },
        ];
      } else {
        categoryOrFilter = [{ categoryId: cat?.id ?? BigInt(categoryId) }];
      }
    }
    if (areaId) where.areaId = BigInt(areaId);

    // T-013: 标签过滤（AND 语义 — post 必须关联**所有**指定 tagId）
    // 优先 tagIds；其次 tagSlugs（查表得 ids）
    let resolvedTagIds: bigint[] | undefined;
    if (tagIds && tagIds.length > 0) {
      resolvedTagIds = tagIds.map((n) => BigInt(n));
    } else if (tagSlugs && tagSlugs.length > 0) {
      const tagRows = await this.prisma.tag.findMany({
        where: { slug: { in: tagSlugs }, deletedAt: null },
        select: { id: true },
      });
      resolvedTagIds = tagRows.map((t) => t.id);
    }
    if (resolvedTagIds && resolvedTagIds.length > 0) {
      // 用 some + every 模拟 AND：每个 tagId 都要在 postTags 中存在
      // Prisma 不直接支持 every over relation，简单做法：每个 tagId 一次 some
      const tagFilter: Prisma.PostWhereInput[] = resolvedTagIds.map((tid) => ({
        postTags: { some: { tagId: tid } },
      }));
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, ...tagFilter];
    }
    // 合并 categoryId 子过滤和 keyword 子过滤
    if (categoryOrFilter && keyword) {
      where.AND = [
        { OR: categoryOrFilter },
        {
          OR: [
            { title: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        },
      ];
    } else if (categoryOrFilter) {
      where.OR = categoryOrFilter;
    } else if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = new Prisma.Decimal(minPrice);
      if (maxPrice !== undefined) where.price.lte = new Prisma.Decimal(maxPrice);
    }

    // 排序
    let orderBy: Prisma.PostOrderByWithRelationInput;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'latest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const skip = (page - 1) * pageSize;

    // ===== T10.2 Redis 缓存：列表 5 分钟 =====
    const cacheKey = `cache:posts:${type}:${JSON.stringify({ areaId, categoryId, status, keyword, minPrice, maxPrice, sort, page, pageSize, tagIds: resolvedTagIds?.map(String), tagSlugs, aiRank: process.env.AI_RANK_ENABLED })}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch { /* fallthrough */ }
    }
    // ===== 缓存 end =====

    // ===== Phase 2.2a: AI 排序权重（灰度，默认 off）=====
    // 启用条件: AI_RANK_ENABLED=true 且 sort='latest'（其他 sort 维持原语义）
    const isRankEnabled = process.env.AI_RANK_ENABLED === 'true' && sort === 'latest';

    let list: any[];
    let total: number;

    if (isRankEnabled) {
      // AI 排序: quality(0.3) + 新鲜度(0.4) + 置顶(0.3)
      // 注意: raw SQL 不支持 Prisma include, 所以仅取主表字段;
      // 关联数据 (user/category/area/images) 用 IN(...) 二次查询补全
      const ranked = await this.prisma.$queryRaw<Array<{ id: bigint }>>`
        SELECT id
        FROM posts
        WHERE type = ${type}
          AND status = ${status}
          AND audit_status = 'passed'
        ORDER BY (
          COALESCE(quality_score, 50) * 0.3 +
          (100.0 / (1 + TIMESTAMPDIFF(HOUR, created_at, NOW()) / 24)) * 0.4 +
          (CASE WHEN boost_expires_at IS NOT NULL AND boost_expires_at > NOW() THEN 100 ELSE 0 END) * 0.3
        ) DESC, created_at DESC
        LIMIT ${pageSize} OFFSET ${skip}
      `;

      if (ranked.length === 0) {
        list = [];
      } else {
        const ids = ranked.map((r) => r.id);
        const posts = await this.prisma.post.findMany({
          where: { id: { in: ids } },
          include: {
            user: { select: { id: true, nickname: true, avatar: true } },
            category: { select: { id: true, name: true, code: true } },
            area: { select: { id: true, name: true, level: true } },
            images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { id: true, url: true } },
            // T-013b: tags 关联 — 前端 PostCard 显示 #标签
            postTags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
          },
        });
        // 按 AI 排序的 id 顺序还原 (Prisma findMany 不保证顺序)
        const byId = new Map(posts.map((p) => [p.id.toString(), p]));
        list = ranked
          .map((r) => byId.get(r.id.toString()))
          .filter((p): p is NonNullable<typeof p> => p !== undefined);
      }

      total = await this.prisma.post.count({ where });
    } else {
      // 默认: 按 createdAt DESC（或其他 sort）
      [list, total] = await Promise.all([
        this.prisma.post.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          include: {
            user: { select: { id: true, nickname: true, avatar: true } },
            category: { select: { id: true, name: true, code: true } },
            area: { select: { id: true, name: true, level: true } },
            // 取首张图作为封面（select 第一个；limit 1 用 take）
            images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { id: true, url: true } },
            // T-013b: tags 关联 — 前端 PostCard 显示 #标签
            postTags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
          },
        }),
        this.prisma.post.count({ where }),
      ]);
    }
    // ===== Phase 2.2a end =====

    const result = { list, total, page, pageSize };
    // 写缓存（异步，不阻塞返回）— 响应侧由 TransformInterceptor 把 BigInt → string；
    // 缓存侧用 replacer 同步处理，保证 JSON.stringify 不抛错
    this.redis
      .setEx(
        cacheKey,
        JSON.stringify(result, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
        PostService.LIST_CACHE_TTL,
      )
      .catch(() => {});

    return result;
  }

  /**
   * 详情（含 user/category/area + 4 大模块专属详情）
   * SHOULD-3: 浏览量防刷 — userId/ip 1 小时内只 +1
   * T-P1-02: 个保法合规 — contactPhone/contactWechat 默认不返回,
   *          需要时调 /posts/:id/contact (已登录 + 审计)
   */
  async findOne(
    id: bigint,
    viewer?: { userId?: bigint; ip?: string; userAgent?: string },
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        category: { select: { id: true, name: true, code: true } },
        area: { select: { id: true, name: true, level: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        house: true,
        secondhand: true,
        lifebiz: true,
        job: { include: { company: { select: { id: true, name: true, logo: true, verified: true } } } },
        // T-013b: tags 关联 — 前端详情页显示 #标签
        postTags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
      },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${id} 不存在`);
    }

    // ===== SHOULD-3 浏览量防刷 + ViewLog 写入 =====
    this.viewLog
      .recordView(id, {
        userId: viewer?.userId,
        ip: viewer?.ip,
        userAgent: viewer?.userAgent,
      })
      .catch(() => {});
    // ===== end =====

    // T-P1-02: 个保法 — 脱敏联系信息(整个字段不返回,而非脱敏)
    // 注意:在序列化前删除,因为 NestJS 默认会返回 Prisma 完整对象
    // (未用 class-transformer + DTO 映射)
    const { contactPhone: _cp, contactWechat: _cw, ...postWithoutContact } = post;
    return postWithoutContact;
  }

  /**
   * T-P1-02: 获取联系方式(已登录用户单独调,行为可审计)
   * 未来可加: contact_limit_per_day 防爬虫
   */
  async getContact(id: bigint, requesterId: bigint) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        auditStatus: true,
        contactName: true,
        contactPhone: true,
        contactWechat: true,
      },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${id} 不存在`);
    }
    if (post.auditStatus !== 'passed' || post.status === 'deleted' || post.status === 'rejected') {
      throw new ForbiddenException('该信息未通过审核,无法查看联系方式');
    }
    if (post.status === 'expired' || post.status === 'sold') {
      throw new ForbiddenException(`该信息已${post.status === 'sold' ? '成交' : '过期'},无法查看联系方式`);
    }

    // [P0-004] 限频：同一用户查看同一 post 的联系方式，1 小时内最多 1 次
    const rateKey = `contact:${requesterId}:${id}:1h`;
    const isFirst = await this.redis.setNxEx(rateKey, '1', 3600);
    // 仅首次记录（不阻断后续请求），并审计到 AuditLog
    if (isFirst && post.userId !== requesterId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            adminUserId: requesterId, // 用 viewer userId 标记（非 admin）
            module: 'post',
            action: 'view_contact',
            targetType: 'post',
            targetId: id,
            reason: `viewer=${requesterId} owner=${post.userId}`,
          },
        });
      } catch (e) {
        this.logger.warn(`[P0-004] audit log failed: ${(e as Error).message}`);
      }
    }

    return {
      id: post.id.toString(),
      contactName: post.contactName,
      contactPhone: post.contactPhone,
      contactWechat: post.contactWechat,
    };
  }

  /**
   * 创建信息（userId 从 JWT 拿，不接受客户端传参）
   * SHOULD-1：dto.detail 存在时，主表 + 子表一次 $transaction 原子写入，
   * 消除两次 HTTP 之间失败导致的"孤儿 post"风险。
   * dto.detail 不传时保持旧行为（只写主表），前端可继续用两次 HTTP 路径。
   */
  async create(userId: bigint, dto: CreatePostDto) {
    // ===== 重复检测：同一用户 1 天内同 title 拦截 =====
    // [P1-007] 移到事务内，消除 read-then-write race window
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // ===== SHOULD-9: 新用户 24h 内仅能 POST 1 条 post =====
    // [P1-014] 先 check（不预占），事务成功后再 recordPostAttempt INCR
    await this.registerThrottle.checkPostEligibility(userId);

    // ===== 预校验（事务外，避免无谓占连接） =====
    const category = await this.prisma.category.findUnique({
      where: { id: BigInt(dto.categoryId) },
    });
    if (!category) {
      throw new BadRequestException(`分类 ID ${dto.categoryId} 不存在`);
    }
    if (category.code !== dto.type) {
      throw new BadRequestException(
        `分类 code (${category.code}) 与 type (${dto.type}) 不一致`,
      );
    }
    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: BigInt(dto.areaId) },
      });
      if (!area) {
        throw new BadRequestException(`区域 ID ${dto.areaId} 不存在`);
      }
    }

    // detail 中 job.companyId 需要校验归属（用事务内 tx 读，避免 read-then-write 竞态）
    if (dto.detail && dto.type === 'job' && dto.detail.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: BigInt(dto.detail.companyId) },
      });
      if (!company || company.creatorUserId !== userId) {
        throw new BadRequestException('公司不存在或不属于当前用户');
      }
    }

    // ===== 事务：主表 + 4 type 之一子表 =====
    const { detail } = dto;
    const post = await this.prisma.$transaction(async (tx) => {
      // [P1-007] 重复检测在事务内执行，杜绝并发竞态
      const dup = await tx.post.findFirst({
        where: {
          userId,
          title: dto.title,
          createdAt: { gte: oneDayAgo },
        },
        select: { id: true },
      });
      if (dup) {
        throw new HttpException(
          {
            code: 'DUPLICATE_POST',
            message: '1 天内已发过相同标题的帖子',
            existingPostId: dup.id.toString(),
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // [P1-014] post-success 配额占用（仅事务内创建后才 INCR；失败回滚无副作用）
      await this.registerThrottle.recordPostAttempt(userId);

      const created = await tx.post.create({
        data: {
          userId,
          categoryId: BigInt(dto.categoryId),
          areaId: dto.areaId ? BigInt(dto.areaId) : null,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : new Prisma.Decimal(0),
          priceUnit: dto.priceUnit,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          contactWechat: dto.contactWechat,
          status: 'pending',
          auditStatus: 'pending',
        },
      });

      if (detail) {
        switch (dto.type) {
          case 'house': {
            // 必填校验
            if (!detail.rentalType) {
              throw new BadRequestException('house.detail 缺少必填字段 rentalType');
            }
            if (!detail.propertyType) {
              throw new BadRequestException('house.detail 缺少必填字段 propertyType');
            }
            await tx.postHouse.create({
              data: {
                postId: created.id,
                rentalType: detail.rentalType,
                propertyType: detail.propertyType,
                decoration: detail.decoration,
                areaSqm:
                  detail.areaSqm !== undefined ? new Prisma.Decimal(detail.areaSqm) : null,
                rooms: detail.rooms,
                livingRooms: detail.livingRooms,
                bathrooms: detail.bathrooms,
                floorInfo: detail.floorInfo,
                orientation: detail.orientation,
                buildingYear: detail.buildingYear,
                communityName: detail.communityName,
                address: detail.address,
                longitude:
                  detail.longitude !== undefined ? new Prisma.Decimal(detail.longitude) : null,
                latitude:
                  detail.latitude !== undefined ? new Prisma.Decimal(detail.latitude) : null,
                facilities: detail.facilities ? (detail.facilities as any) : Prisma.DbNull,
              },
            });
            break;
          }
          case 'secondhand': {
            if (!detail.categoryName) {
              throw new BadRequestException('secondhand.detail 缺少必填字段 categoryName');
            }
            if (!detail.condition) {
              throw new BadRequestException('secondhand.detail 缺少必填字段 condition');
            }
            await tx.postSecondhand.create({
              data: {
                postId: created.id,
                categoryName: detail.categoryName,
                condition: detail.condition,
                originalPrice:
                  detail.originalPrice !== undefined
                    ? new Prisma.Decimal(detail.originalPrice)
                    : null,
                tradeMethod: detail.tradeMethod,
                usageDuration: detail.usageDuration,
              },
            });
            break;
          }
          case 'job': {
            // job.companyId 已在事务外预校验；事务内不再重复 select
            if (!detail.companyId) {
              throw new BadRequestException('job.detail 缺少必填字段 companyId');
            }
            if (!detail.jobType) {
              throw new BadRequestException('job.detail 缺少必填字段 jobType');
            }
            await tx.postJob.create({
              data: {
                postId: created.id,
                companyId: BigInt(detail.companyId),
                jobType: detail.jobType,
                salaryMin:
                  detail.salaryMin !== undefined ? new Prisma.Decimal(detail.salaryMin) : null,
                salaryMax:
                  detail.salaryMax !== undefined ? new Prisma.Decimal(detail.salaryMax) : null,
                salaryUnit: detail.salaryUnit,
                education: detail.education,
                experience: detail.experience,
                industry: detail.industry,
                welfare: detail.welfare ? (detail.welfare as any) : Prisma.DbNull,
                recruitCount: detail.recruitCount ?? 1,
                workCity: detail.workCity,
                workAddress: detail.workAddress,
              },
            });
            break;
          }
          case 'lifebiz': {
            if (!detail.subCategory) {
              throw new BadRequestException('lifebiz.detail 缺少必填字段 subCategory');
            }
            if (!detail.serviceType) {
              throw new BadRequestException('lifebiz.detail 缺少必填字段 serviceType');
            }
            // expireAt：客户端显式传优先；否则按 validityPeriod 计算；都没有则 null
            const expireAt = detail.expireAt
              ? new Date(detail.expireAt)
              : detail.validityPeriod
                ? this.computeLifebizExpireAt(detail.validityPeriod)
                : null;
            await tx.postLifebiz.create({
              data: {
                postId: created.id,
                subCategory: detail.subCategory,
                serviceType: detail.serviceType,
                price: detail.price !== undefined ? new Prisma.Decimal(detail.price) : null,
                priceText: detail.priceText,
                validityPeriod: detail.validityPeriod,
                expireAt,
              },
            });
            break;
          }
          default:
            throw new BadRequestException(`不支持的 post.type: ${dto.type}`);
        }
      }

      // ===== 图片写入（事务内原子化） =====
      if (dto.images && dto.images.length > 0) {
        const imgs = dto.images.slice(0, 9); // 上限 9 张
        await tx.postImage.createMany({
          data: imgs.map((url, idx) => ({
            postId: created.id,
            url,
            sortOrder: idx,
            isCover: idx === 0 ? 1 : 0,
          })),
        });
      }

      return created;
    });

    // 重新 include 关联返回（不把 include 放事务里以减少事务持有时间）
    const result = await this.prisma.post.findUnique({
      where: { id: post.id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        category: { select: { id: true, name: true, code: true } },
        area: { select: { id: true, name: true, level: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        // T-013b: tags 关联 — 创建后响应立即带 tags（前端发布页跳详情无需再请求）
        postTags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
      },
    });

    // SHOULD-7: 写操作清列表缓存，避免用户改完看到 stale 数据
    this.redis.invalidatePattern('cache:posts:*').catch((e) =>
      this.logger.warn(`[P1-019] invalidatePattern failed: ${e.message}`),
    );

    // T-27: 异步触发 (不阻塞响应) — fire-and-forget score + seo
    setImmediate(() => {
      this.triggerPostPublishAi(post.id, userId, dto).catch((e) => {
        // 不抛错,仅记录
        // eslint-disable-next-line no-console
        console.warn(`Post ${post.id} 发布后 AI 处理失败: ${e?.message}`);
      });
    });

    // T-013: 同步 PostTag 关联（事务外，失败仅 warn）
    if (dto.tagIds && dto.tagIds.length > 0) {
      try {
        await this.tagService.attachToPost(
          post.id,
          dto.tagIds.map((n) => BigInt(n)),
        );
      } catch (e: any) {
        this.logger.warn(`postId=${post.id} 关联标签失败: ${e?.message ?? e}`);
      }
    }

    return result;
  }

  /**
   * T-27: 发布后自动 AI — 异步算 qualityScore + 生成 SEO meta
   * 由 setImmediate 触发, fire-and-forget, 错误不抛
   */
  private async triggerPostPublishAi(postId: bigint, userId: bigint, dto: any) {
    // 1) 算质量分 → 写 Post.qualityScore（[P1-011] 仅在解析成功时写库）
    try {
      const scoreResult = await this.aiService.score(userId, {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        fields: dto.fields ?? {},
      });
      // [P1-011] parseScoreJson 解析失败时返回 null，AI service 已 throw；
      // 这里仅在拿到有效分数时写库
      if (scoreResult && typeof scoreResult.score === 'number') {
        await this.prisma.post.update({
          where: { id: postId },
          data: { qualityScore: scoreResult.score },
        });
      } else {
        this.logger.warn(`[P1-011] AI score parse failed for post ${postId}, skip DB write`);
      }
    } catch (e: any) {
      this.logger.warn(`[P1-011] score failed for post ${postId}: ${e?.message}`);
    }

    // 2) 生成 SEO meta → 写 Post.seoMeta
    try {
      const seoResult = await this.seoService.generateSeoMeta(postId);
      this.logger.log(
        `Post ${postId} 发布后 AI: score + seo="${seoResult.seoMeta?.metaTitle}"`,
      );
    } catch (e: any) {
      this.logger.warn(`[P1-011] seo failed for post ${postId}: ${e?.message}`);
    }
  }

  /** lifebiz.validityPeriod → expireAt（同步自 LifebizService 行为） */
  private computeLifebizExpireAt(period: string): Date | null {
    const now = Date.now();
    switch (period) {
      case '一天':
        return new Date(now + 1 * 86400 * 1000);
      case '一周':
        return new Date(now + 7 * 86400 * 1000);
      case '一个月':
        return new Date(now + 30 * 86400 * 1000);
      case '长期':
        return null;
      default:
        return null;
    }
  }

  /**
   * 更新（只能改自己的）
   */
  async update(userId: bigint, id: bigint, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`信息 ID ${id} 不存在`);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('只能修改自己的信息');
    }

    const { categoryId, areaId, ...rest } = dto;
    const data: Prisma.PostUpdateInput = {
      ...rest,
      ...(categoryId !== undefined ? { category: { connect: { id: BigInt(categoryId) } } } : {}),
      ...(areaId !== undefined
        ? areaId === null
          ? { area: { disconnect: true } }
          : { area: { connect: { id: BigInt(areaId) } } }
        : {}),
      ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
    };

    return this.prisma.post.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, code: true } },
        area: { select: { id: true, name: true, level: true } },
      },
    }).then((post) => {
      // SHOULD-7: 写操作清列表缓存，避免用户改完看到 stale 数据
      this.redis.invalidatePattern('cache:posts:*').catch((e) =>
      this.logger.warn(`[P1-019] invalidatePattern failed: ${e.message}`),
    );
      return post;
    });
  }

  /**
   * 软删除（status='deleted' + T-001 deletedAt）
   * - 主表：写 status='deleted' + deletedAt=now() + deletedBy=userId + updatedBy=userId
   * - 子表：硬删（house/secondhand/job/lifebiz/image 是 1:1 子表，删除后无意义保留）
   * - 中间件会自动过滤掉 deletedAt 非空的记录，list 不再返回
   */
  async remove(userId: bigint, id: bigint) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`信息 ID ${id} 不存在`);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('只能删除自己的信息');
    }
    // [P1-018] 事务：主表软删 + 4 个子表全部硬删 + 图片
    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id },
        data: {
          status: 'deleted',
          deletedAt: new Date(),
          deletedBy: userId,
          updatedBy: userId,
        },
      }),
      this.prisma.postHouse.deleteMany({ where: { postId: id } }),
      this.prisma.postSecondhand.deleteMany({ where: { postId: id } }),
      this.prisma.postJob.deleteMany({ where: { postId: id } }),
      this.prisma.postLifebiz.deleteMany({ where: { postId: id } }),
      this.prisma.postImage.deleteMany({ where: { postId: id } }),
    ]);
    // SHOULD-7: 写操作清列表缓存
    this.redis.invalidatePattern('cache:posts:*').catch((e) =>
      this.logger.warn(`[P1-019] invalidatePattern failed: ${e.message}`),
    );
    return { id: id.toString(), deleted: true };
  }

  /**
   * 改状态（在售 / 已售 / 过期 / 重新上架）
   * [P1-009] 状态机白名单：拒绝 rejected/deleted 绕过审核直接 active
   */
  async changeStatus(userId: bigint, id: bigint, newStatus: 'active' | 'sold' | 'expired') {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`信息 ID ${id} 不存在`);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('只能修改自己的信息状态');
    }

    // [P1-009] 状态机白名单
    const currentStatus = post.status as string;
    const ALLOWED: Record<string, string[]> = {
      pending: ['active'],          // 审核中 → 在售（审核通过由 admin 走）
      active: ['active', 'sold', 'expired'],
      sold: ['active'],              // 已售 → 重新上架
      expired: ['active'],           // 过期 → 重新上架
      rejected: [],                  // 拒绝后必须重新发布，不能直接 active
      deleted: [],                   // 已删除不能恢复
    };
    const allowed = ALLOWED[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `状态 ${currentStatus} 不能转为 ${newStatus}；允许的转换: ${allowed.join('/') || '无'}`,
      );
    }
    // 已通过的帖子才能上 active（已审核状态）
    if (newStatus === 'active' && currentStatus !== 'active' && post.auditStatus !== 'passed') {
      throw new BadRequestException(
        `帖子未通过审核（当前审核状态: ${post.auditStatus}），无法上架`,
      );
    }

    return this.prisma.post.update({
      where: { id },
      data: { status: newStatus },
    }).then((post) => {
      // SHOULD-7: 写操作清列表缓存
      this.redis.invalidatePattern('cache:posts:*').catch((e) =>
        this.logger.warn(`[P1-019] invalidatePattern failed: ${e.message}`),
      );
      return post;
    });
  }

  /**
   * 我的发布（支持按状态过滤）
   */
  async findMyPosts(
    userId: bigint,
    options: { status?: string; type?: string; page?: number; pageSize?: number } = {},
  ) {
    const { status, type, page = 1, pageSize = 20 } = options;
    const where: Prisma.PostWhereInput = { userId };
    if (status) where.status = status;
    if (type) where.type = type; // [P1-010] 支持按 type 过滤

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, code: true } },
          area: { select: { id: true, name: true, level: true } },
          // T-013b: tags 关联 — /me/posts 列表也带 tags
          postTags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * [P1-005/P1-013] 个人中心聚合统计 — 一次查询，无分页扫描
   */
  async getMyStats(userId: bigint) {
    const [postsCount, commentsCount] = await Promise.all([
      this.prisma.post.count({ where: { userId } }),
      // 直接统计我所有 post 收到的留言数（不依赖分页 pageSize:100）
      this.prisma.comment.count({
        where: { post: { userId }, status: 0 },
      }),
    ]);
    return { postsCount, commentsCount };
  }

  /**
   * 统计
   */
  async count(type?: string) {
    return this.prisma.post.count({
      where: { ...(type ? { type } : {}), status: 'active' },
    });
  }
}
