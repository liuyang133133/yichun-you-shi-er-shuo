import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostQueryDto } from './dto/list-post.dto';
import { RedisService } from '../../redis/redis.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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
   * T10.3 浏览量防刷：同 userId/ip 1 小时内只 +1
   */
  async findOne(id: bigint, viewer?: { userId?: bigint; ip?: string }) {
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

    // ===== T10.3 浏览量防刷 =====
    const dedupKeys: string[] = [];
    if (viewer?.userId) dedupKeys.push(`views:user:${viewer.userId}:post:${id}`);
    if (viewer?.ip) dedupKeys.push(`views:ip:${viewer.ip}:post:${id}`);

    let shouldIncrement = false;
    for (const key of dedupKeys) {
      const exists = await this.redis.get(key);
      if (!exists) {
        shouldIncrement = true;
        break;
      }
    }
    if (shouldIncrement) {
      // 设 1 小时 TTL
      const pipeline = dedupKeys.map((k) => this.redis.setEx(k, '1', 3600));
      await Promise.all(pipeline).catch(() => {});
      this.prisma.post
        .update({ where: { id }, data: { viewCount: { increment: 1 } } })
        .catch(() => {});
    }
    // ===== 防刷 end =====

    return post;
  }

  /**
   * 创建信息（userId 从 JWT 拿，不接受客户端传参）
   */
  async create(userId: bigint, dto: CreatePostDto) {
    // 校验分类是否存在
    const category = await this.prisma.category.findUnique({
      where: { id: BigInt(dto.categoryId) },
    });
    if (!category) {
      throw new BadRequestException(`分类 ID ${dto.categoryId} 不存在`);
    }
    // 校验分类 code 与 type 一致
    if (category.code !== dto.type) {
      throw new BadRequestException(
        `分类 code (${category.code}) 与 type (${dto.type}) 不一致`,
      );
    }
    // 校验区域（可选）
    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: BigInt(dto.areaId) },
      });
      if (!area) {
        throw new BadRequestException(`区域 ID ${dto.areaId} 不存在`);
      }
    }

    const post = await this.prisma.post.create({
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
        status: 'pending', // 进入审核流
        auditStatus: 'pending',
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        category: { select: { id: true, name: true, code: true } },
        area: { select: { id: true, name: true, level: true } },
      },
    });

    // SHOULD-7: 写操作清列表缓存，避免用户改完看到 stale 数据
    this.redis.invalidatePattern('cache:posts:*').catch(() => {});

    return post;
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
