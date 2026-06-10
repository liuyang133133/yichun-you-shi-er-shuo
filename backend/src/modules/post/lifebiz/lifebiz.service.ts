import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePostLifebizDto, VALIDITY_PERIODS } from './create-post-lifebiz.dto';
import { FilterLifebizDto } from './filter-lifebiz.dto';
import { Prisma } from '@prisma/client';

/**
 * 根据 validityPeriod 自动算 expireAt
 * - 一天：+1 天
 * - 一周：+7 天
 * - 一个月：+30 天
 * - 长期：null
 */
function computeExpireAt(period: string | undefined): Date | null {
  if (!period) return null;
  const now = new Date();
  switch (period) {
    case '一天': return new Date(now.getTime() + 1 * 86400 * 1000);
    case '一周': return new Date(now.getTime() + 7 * 86400 * 1000);
    case '一个月': return new Date(now.getTime() + 30 * 86400 * 1000);
    case '长期': return null;
    default: return null;
  }
}

@Injectable()
export class LifebizService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: bigint, postId: bigint, dto: CreatePostLifebizDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, type: true, status: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能给自己发布的信息添加便民详情');
    if (post.type !== 'lifebiz') throw new BadRequestException(`type=${post.type} 的信息不是便民`);

    const existing = await this.prisma.postLifebiz.findUnique({ where: { postId } });
    if (existing) throw new ConflictException('便民详情已存在，请用 PATCH 编辑');

    // 客户端传 expireAt 优先；否则按 validityPeriod 计算
    const expireAt = dto.expireAt
      ? new Date(dto.expireAt)
      : computeExpireAt(dto.validityPeriod);

    return this.prisma.postLifebiz.create({
      data: {
        postId,
        subCategory: dto.subCategory,
        serviceType: dto.serviceType,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : null,
        priceText: dto.priceText,
        validityPeriod: dto.validityPeriod,
        expireAt,
      },
    });
  }

  async update(userId: bigint, postId: bigint, dto: Partial<CreatePostLifebizDto>) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, type: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能修改自己发布的便民详情');
    if (post.type !== 'lifebiz') throw new BadRequestException('非便民类型不能编辑');

    const data: Prisma.PostLifebizUpdateInput = {};
    if (dto.subCategory !== undefined) data.subCategory = dto.subCategory;
    if (dto.serviceType !== undefined) data.serviceType = dto.serviceType;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.priceText !== undefined) data.priceText = dto.priceText;
    if (dto.validityPeriod !== undefined) {
      data.validityPeriod = dto.validityPeriod;
      // 改 validityPeriod 时重算 expireAt
      if (dto.expireAt === undefined) {
        const computed = computeExpireAt(dto.validityPeriod);
        data.expireAt = computed;
      }
    }
    if (dto.expireAt !== undefined) data.expireAt = new Date(dto.expireAt);

    return this.prisma.postLifebiz.update({ where: { postId }, data });
  }

  async remove(userId: bigint, postId: bigint) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, type: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能删除自己发布的便民详情');
    await this.prisma.postLifebiz.delete({ where: { postId } });
    return { postId: postId.toString(), deleted: true };
  }

  async filterLifebizs(query: FilterLifebizDto) {
    const {
      categoryId, areaId, subCategory, serviceType,
      notExpired = true, keyword, sort = 'latest',
      page = 1, pageSize = 20,
    } = query;

    const postWhere: Prisma.PostWhereInput = { type: 'lifebiz', status: 'active' };
    if (categoryId) postWhere.categoryId = BigInt(categoryId);
    if (areaId) postWhere.areaId = BigInt(areaId);
    if (keyword) {
      postWhere.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const lifebizWhere: Prisma.PostLifebizWhereInput = {};
    if (subCategory) lifebizWhere.subCategory = subCategory;
    if (serviceType) lifebizWhere.serviceType = serviceType;
    if (notExpired) {
      // 没过期：expireAt 为 null（长期）或 expireAt > now
      lifebizWhere.OR = [
        { expireAt: null },
        { expireAt: { gt: new Date() } },
      ];
    }
    if (Object.keys(lifebizWhere).length > 0) {
      postWhere.lifebiz = lifebizWhere;
    }

    let orderBy: Prisma.PostOrderByWithRelationInput;
    switch (sort) {
      case 'oldest': orderBy = { createdAt: 'asc' }; break;
      case 'latest':
      default: orderBy = { createdAt: 'desc' };
    }

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.post.findMany({
        where: postWhere,
        skip, take: pageSize,
        orderBy,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          category: { select: { id: true, name: true, code: true } },
          area: { select: { id: true, name: true, level: true } },
          lifebiz: true,
        },
      }),
      this.prisma.post.count({ where: postWhere }),
    ]);

    return { list, total, page, pageSize };
  }
}
