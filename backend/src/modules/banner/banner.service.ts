import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/create-banner.dto';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  /** 公开：拉取生效中的 banner（按 position 过滤 + 时间窗） */
  async findActive(position?: string) {
    const now = new Date();
    const where: any = { status: 1 };
    if (position) where.position = position;
    where.AND = [
      {
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
      },
      {
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } },
        ],
      },
    ];
    return this.prisma.banner.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
    });
  }

  /** admin：分页列表 */
  async findAll(params: { position?: string; status?: number; page?: number; pageSize?: number } = {}) {
    const { position, status, page = 1, pageSize = 20 } = params;
    const where: any = {};
    if (position) where.position = position;
    if (status !== undefined) where.status = status;
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.banner.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }], skip, take: pageSize }),
      this.prisma.banner.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async findOne(id: bigint) {
    const b = await this.prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException(`Banner ID ${id} 不存在`);
    return b;
  }

  async create(adminUserId: bigint, dto: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl,
        linkType: dto.linkType || 'url',
        linkTarget: dto.linkTarget || '',
        position: dto.position || 'home_top',
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status ?? 1,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        createdBy: adminUserId,
      },
    });
  }

  async update(id: bigint, dto: UpdateBannerDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    return this.prisma.banner.update({ where: { id }, data });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    await this.prisma.banner.delete({ where: { id } });
    return { id: id.toString(), deleted: true };
  }
}