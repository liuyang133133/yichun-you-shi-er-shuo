import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  /**
   * admin:分页列表（含可选 includeDeleted 过滤）
   * - includeDeleted: false (默认) — T-001 中间件自动加 deletedAt: null
   * - includeDeleted: true — admin 看到包含已软删
   */
  async findAll(query: FilterAnnouncementDto) {
    const { status, page = 1, pageSize = 20, includeDeleted } = query;
    const where: any = {};
    if (status !== undefined) where.status = status;
    // includeDeleted=true 时跳过 deletedAt 过滤（让 admin 看到已软删）
    if (includeDeleted) where.deletedAt = undefined;
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

  /**
   * T-019: update 时仅在"破坏性字段"变更时写 updatedBy（与 post.offline 规范一致）
   * - 破坏性字段: status / startsAt / endsAt
   * - 普通字段: title / content（不算破坏性）
   */
  async update(adminId: bigint, id: bigint, dto: UpdateAnnouncementDto) {
    const exists = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exists) throw new NotFoundException(`公告 ID ${id} 不存在`);

    const destructive =
      dto.status !== undefined ||
      dto.startsAt !== undefined ||
      dto.endsAt !== undefined;

    const data: any = { ...dto };
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (destructive) data.updatedBy = adminId;
    return this.prisma.announcement.update({ where: { id }, data });
  }

  /**
   * T-019: remove 改为软删（与 T-001 软删规范一致）
   * - 写 deletedAt / deletedBy / updatedBy（破坏性操作）
   * - 不再调用 prisma.delete() 硬删
   */
  async remove(adminId: bigint, id: bigint) {
    const exists = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exists) throw new NotFoundException(`公告 ID ${id} 不存在`);

    await this.prisma.announcement.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: adminId,
        updatedBy: adminId,
      },
    });
    return { id: id.toString(), deleted: true };
  }

  /**
   * T-019: restore 已软删公告（与 admin-post.service.ts:51 restore 模式一致）
   * - 预查（绕过中间件）：findUnique 检查存在
   * - 不存在 → NotFoundException
   * - 未软删（deletedAt=null）→ BadRequestException
   * - 事务双写: update 恢复 + AuditLog 记录
   */
  async restore(adminId: bigint, id: bigint) {
    // 用 findUnique 绕过 T-001 中间件（中间件会自动加 deletedAt: null）
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      throw new NotFoundException(`公告 ID ${id} 不存在`);
    }
    if (!announcement.deletedAt) {
      throw new BadRequestException(`公告 ID ${id} 未被软删，无需恢复`);
    }

    await this.prisma.$transaction([
      this.prisma.announcement.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
          status: 1, // 强制恢复为启用
          updatedBy: adminId,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'announcement',
          action: 'restore',
          targetType: 'announcement',
          targetId: id,
          reason: `从 ${announcement.deletedAt?.toISOString()} 软删恢复`,
          metadata: {
            previousDeletedBy: announcement.deletedBy?.toString() ?? null,
            title: announcement.title,
          },
        },
      }),
    ]);

    return { id: id.toString(), restored: true };
  }
}
