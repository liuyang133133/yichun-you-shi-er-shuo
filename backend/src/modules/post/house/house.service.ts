import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePostHouseDto } from './create-post-house.dto';
import { FilterHouseDto } from './filter-house.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class HouseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建房屋详情（1:1 关联 post）
   * POST /api/v1/posts/:id/house
   */
  async create(userId: bigint, postId: bigint, dto: CreatePostHouseDto) {
    // 1. 校验 post 存在、是 type=house、当前用户是作者
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, type: true, status: true },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${postId} 不存在`);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('只能给自己发布的信息添加房屋详情');
    }
    if (post.type !== 'house') {
      throw new BadRequestException(`type=${post.type} 的信息不是房屋，不能添加房屋详情`);
    }

    // 2. 校验详情不存在（unique postId）
    const existing = await this.prisma.postHouse.findUnique({ where: { postId } });
    if (existing) {
      throw new ConflictException('房屋详情已存在，请用 PATCH 编辑');
    }

    return this.prisma.postHouse.create({
      data: {
        postId,
        rentalType: dto.rentalType,
        propertyType: dto.propertyType,
        decoration: dto.decoration,
        areaSqm: dto.areaSqm !== undefined ? new Prisma.Decimal(dto.areaSqm) : null,
        rooms: dto.rooms,
        livingRooms: dto.livingRooms,
        bathrooms: dto.bathrooms,
        floorInfo: dto.floorInfo,
        orientation: dto.orientation,
        buildingYear: dto.buildingYear,
        communityName: dto.communityName,
        address: dto.address,
        longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : null,
        latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : null,
        facilities: dto.facilities ? (dto.facilities as any) : Prisma.DbNull,
      },
    });
  }

  /**
   * 更新房屋详情
   * PATCH /api/v1/posts/:id/house
   */
  async update(userId: bigint, postId: bigint, dto: Partial<CreatePostHouseDto>) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, type: true },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${postId} 不存在`);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('只能修改自己发布的房屋详情');
    }
    if (post.type !== 'house') {
      throw new BadRequestException('非房屋类型不能编辑');
    }

    const data: Prisma.PostHouseUpdateInput = {};
    if (dto.rentalType !== undefined) data.rentalType = dto.rentalType;
    if (dto.propertyType !== undefined) data.propertyType = dto.propertyType;
    if (dto.decoration !== undefined) data.decoration = dto.decoration;
    if (dto.areaSqm !== undefined) data.areaSqm = new Prisma.Decimal(dto.areaSqm);
    if (dto.rooms !== undefined) data.rooms = dto.rooms;
    if (dto.livingRooms !== undefined) data.livingRooms = dto.livingRooms;
    if (dto.bathrooms !== undefined) data.bathrooms = dto.bathrooms;
    if (dto.floorInfo !== undefined) data.floorInfo = dto.floorInfo;
    if (dto.orientation !== undefined) data.orientation = dto.orientation;
    if (dto.buildingYear !== undefined) data.buildingYear = dto.buildingYear;
    if (dto.communityName !== undefined) data.communityName = dto.communityName;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.longitude !== undefined) data.longitude = new Prisma.Decimal(dto.longitude);
    if (dto.latitude !== undefined) data.latitude = new Prisma.Decimal(dto.latitude);
    if (dto.facilities !== undefined) {
      data.facilities = dto.facilities.length > 0 ? (dto.facilities as any) : Prisma.DbNull;
    }

    return this.prisma.postHouse.update({ where: { postId }, data });
  }

  /**
   * 删除房屋详情
   * DELETE /api/v1/posts/:id/house
   */
  async remove(userId: bigint, postId: bigint) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, type: true },
    });
    if (!post) {
      throw new NotFoundException(`信息 ID ${postId} 不存在`);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('只能删除自己发布的房屋详情');
    }
    await this.prisma.postHouse.delete({ where: { postId } });
    return { postId: postId.toString(), deleted: true };
  }

  /**
   * 房屋特色筛选（专用接口，前端房屋列表用）
   * GET /api/v1/houses
   */
  async filterHouses(query: FilterHouseDto) {
    const {
      categoryId,
      areaId,
      rentalType,
      propertyType,
      decoration,
      rooms,
      minPrice,
      maxPrice,
      keyword,
      sort = 'latest',
      page = 1,
      pageSize = 20,
    } = query;

    // 关联查询：post 必须是 type=house 且 status=active
    const postWhere: Prisma.PostWhereInput = { type: 'house', status: 'active' };
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

    // 房屋详情条件（用子查询）
    const houseWhere: Prisma.PostHouseWhereInput = {};
    if (rentalType) houseWhere.rentalType = rentalType;
    if (propertyType) houseWhere.propertyType = propertyType;
    if (decoration) houseWhere.decoration = decoration;
    if (rooms !== undefined) houseWhere.rooms = rooms;
    if (Object.keys(houseWhere).length > 0) {
      postWhere.house = houseWhere;
    }

    // 排序
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
        skip,
        take: pageSize,
        orderBy,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          category: { select: { id: true, name: true, code: true } },
          area: { select: { id: true, name: true, level: true } },
          house: true,
        },
      }),
      this.prisma.post.count({ where: postWhere }),
    ]);

    return { list, total, page, pageSize };
  }
}
