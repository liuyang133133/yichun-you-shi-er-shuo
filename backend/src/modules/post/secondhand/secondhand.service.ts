import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePostSecondhandDto } from './create-post-secondhand.dto';
import { FilterSecondhandDto } from './filter-secondhand.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SecondhandService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建二手详情
   * POST /api/v1/posts/:id/secondhand
   */
  async create(userId: bigint, postId: bigint, dto: CreatePostSecondhandDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, type: true, status: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能给自己发布的信息添加二手详情');
    if (post.type !== 'secondhand') throw new BadRequestException(`type=${post.type} 的信息不是二手`);

    const existing = await this.prisma.postSecondhand.findUnique({ where: { postId } });
    if (existing) throw new ConflictException('二手详情已存在，请用 PATCH 编辑');

    return this.prisma.postSecondhand.create({
      data: {
        postId,
        categoryName: dto.categoryName,
        condition: dto.condition,
        originalPrice: dto.originalPrice !== undefined ? new Prisma.Decimal(dto.originalPrice) : null,
        tradeMethod: dto.tradeMethod,
        usageDuration: dto.usageDuration,
      },
    });
  }

  /**
   * 更新二手详情
   */
  async update(userId: bigint, postId: bigint, dto: Partial<CreatePostSecondhandDto>) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, type: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能修改自己发布的二手详情');
    if (post.type !== 'secondhand') throw new BadRequestException('非二手类型不能编辑');

    const data: Prisma.PostSecondhandUpdateInput = {};
    if (dto.categoryName !== undefined) data.categoryName = dto.categoryName;
    if (dto.condition !== undefined) data.condition = dto.condition;
    if (dto.originalPrice !== undefined) data.originalPrice = new Prisma.Decimal(dto.originalPrice);
    if (dto.tradeMethod !== undefined) data.tradeMethod = dto.tradeMethod;
    if (dto.usageDuration !== undefined) data.usageDuration = dto.usageDuration;

    return this.prisma.postSecondhand.update({ where: { postId }, data });
  }

  /**
   * 删除二手详情
   */
  async remove(userId: bigint, postId: bigint) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, type: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能删除自己发布的二手详情');
    await this.prisma.postSecondhand.delete({ where: { postId } });
    return { postId: postId.toString(), deleted: true };
  }

  /**
   * 二手筛选
   * GET /api/v1/secondhands
   */
  async filterSecondhands(query: FilterSecondhandDto) {
    const {
      categoryId, areaId, categoryName, condition,
      minPrice, maxPrice, keyword, sort = 'latest',
      page = 1, pageSize = 20,
    } = query;

    const postWhere: Prisma.PostWhereInput = { type: 'secondhand', status: 'active' };
    if (categoryId) postWhere.categoryId = BigInt(categoryId);
    if (areaId) postWhere.areaId = BigInt(areaId);
    if (keyword) {
      postWhere.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      postWhere.price = {};
      if (minPrice !== undefined) postWhere.price.gte = new Prisma.Decimal(minPrice);
      if (maxPrice !== undefined) postWhere.price.lte = new Prisma.Decimal(maxPrice);
    }

    const secondhandWhere: Prisma.PostSecondhandWhereInput = {};
    if (categoryName) secondhandWhere.categoryName = categoryName;
    if (condition) secondhandWhere.condition = condition;
    if (Object.keys(secondhandWhere).length > 0) {
      postWhere.secondhand = secondhandWhere;
    }

    let orderBy: Prisma.PostOrderByWithRelationInput;
    switch (sort) {
      case 'oldest': orderBy = { createdAt: 'asc' }; break;
      case 'price_asc': orderBy = { price: 'asc' }; break;
      case 'price_desc': orderBy = { price: 'desc' }; break;
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
          secondhand: true,
        },
      }),
      this.prisma.post.count({ where: postWhere }),
    ]);

    return { list, total, page, pageSize };
  }
}
