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

  /**
   * T-017: 公开 - 分页公告列表（仅生效中 + select 裁剪）
   * 用于前端 /announcements 公开页
   * - where: status=1 + 时间窗 + deletedAt=null（公开数据隔离已删/已下架）
   * - select: 不返回 content 全文（节省 payload，详情页单独取）
   */
  async findList(query: FilterAnnouncementDto) {
    const { page = 1, pageSize = 20 } = query;
    const now = new Date();
    const where = {
      status: 1,
      deletedAt: null,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    };
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * T-017: 公开 - 单条公告详情
   * - 三重过滤：status=1 + deletedAt=null + 时间窗
   * - 不命中统一抛 NotFoundException（不区分"已下架"和"不存在"，防信息泄露）
   */
  async findOne(id: bigint) {
    const now = new Date();
    const item = await this.prisma.announcement.findFirst({
      where: {
        id,
        status: 1,
        deletedAt: null,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
    });
    if (!item) throw new NotFoundException(`公告不存在或已下架`);
    return item;
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
