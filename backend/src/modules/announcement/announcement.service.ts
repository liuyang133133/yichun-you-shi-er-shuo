import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, FilterAnnouncementDto } from './dto';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  /** 公开:当前生效中的公告(用于前端 banner) */
  async findActive() {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: {
        status: 1,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });
  }

  /** admin:分页列表 */
  async findAll(query: FilterAnnouncementDto) {
    const { status, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (status !== undefined) where.status = status;
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.announcement.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async create(adminId: bigint, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status ?? 1,
        priority: dto.priority ?? 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        createdBy: adminId,
      },
    });
  }

  async update(id: bigint, dto: UpdateAnnouncementDto) {
    const exists = await this.prisma.announcement.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`公告 ID ${id} 不存在`);
    const data: any = { ...dto };
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    return this.prisma.announcement.update({ where: { id }, data });
  }

  async remove(id: bigint) {
    const exists = await this.prisma.announcement.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`公告 ID ${id} 不存在`);
    await this.prisma.announcement.delete({ where: { id } });
    return { id: id.toString(), deleted: true };
  }
}
