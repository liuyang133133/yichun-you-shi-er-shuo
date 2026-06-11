import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostQueryDto } from './dto/list-post.dto';
import { RedisService } from '../../redis/redis.service';
import { ViewLogService } from '../view-log/view-log.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly viewLog: ViewLogService,
  ) {}

  /** 列表缓存 TTL：5 分钟 */
  private static readonly LIST_CACHE_TTL = 300;

  /**
   * 列表查询（统一入口，type 必填）
   * 支持：分类/区域/关键词/价格区间/排序/分页
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
    } = query;

    const where: Prisma.PostWhereInput = { type, status };
    if (categoryId) where.categoryId = BigInt(categoryId);
    if (areaId) where.areaId = BigInt(areaId);
    if (keyword) {
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
    const cacheKey = `cache:posts:${type}:${JSON.stringify({ areaId, categoryId, status, keyword, minPrice, maxPrice, sort, page, pageSize })}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch { /* fallthrough */ }
    }
    // ===== 缓存 end =====

    const [list, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          category: { select: { id: true, name: true, code: true } },
          area: { select: { id: true, name: true, level: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

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
        house: true,
        secondhand: true,
        lifebiz: true,
        job: { include: { company: { select: { id: true, name: true, logo: true, verified: true } } } },
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

    return post;
  }

  /**
   * 创建信息（userId 从 JWT 拿，不接受客户端传参）
   * SHOULD-1：dto.detail 存在时，主表 + 子表一次 $transaction 原子写入，
   * 消除两次 HTTP 之间失败导致的"孤儿 post"风险。
   * dto.detail 不传时保持旧行为（只写主表），前端可继续用两次 HTTP 路径。
   */
  async create(userId: bigint, dto: CreatePostDto) {
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

      return created;
    });

    // 重新 include 关联返回（不把 include 放事务里以减少事务持有时间）
    const result = await this.prisma.post.findUnique({
      where: { id: post.id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        category: { select: { id: true, name: true, code: true } },
        area: { select: { id: true, name: true, level: true } },
      },
    });

    // SHOULD-7: 写操作清列表缓存，避免用户改完看到 stale 数据
    this.redis.invalidatePattern('cache:posts:*').catch(() => {});

    return result;
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
      this.redis.invalidatePattern('cache:posts:*').catch(() => {});
      return post;
    });
  }

  /**
   * 软删除（status='deleted'）
   */
  async remove(userId: bigint, id: bigint) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`信息 ID ${id} 不存在`);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('只能删除自己的信息');
    }
    await this.prisma.post.update({
      where: { id },
      data: { status: 'deleted' },
    });
    // SHOULD-7: 写操作清列表缓存，避免用户改完看到 stale 数据
    this.redis.invalidatePattern('cache:posts:*').catch(() => {});
    return { id: id.toString(), deleted: true };
  }

  /**
   * 改状态（在售 / 已售 / 过期 / 重新上架）
   */
  async changeStatus(userId: bigint, id: bigint, newStatus: 'active' | 'sold' | 'expired') {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`信息 ID ${id} 不存在`);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('只能修改自己的信息状态');
    }
    return this.prisma.post.update({
      where: { id },
      data: { status: newStatus },
    }).then((post) => {
      // SHOULD-7: 写操作清列表缓存，避免用户改完看到 stale 数据
      this.redis.invalidatePattern('cache:posts:*').catch(() => {});
      return post;
    });
  }

  /**
   * 我的发布（支持按状态过滤）
   */
  async findMyPosts(
    userId: bigint,
    options: { status?: string; page?: number; pageSize?: number } = {},
  ) {
    const { status, page = 1, pageSize = 20 } = options;
    const where: Prisma.PostWhereInput = { userId };
    if (status) where.status = status;

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
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return { list, total, page, pageSize };
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
