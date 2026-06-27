import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto, FilterBannerDto } from './dto';

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

  /**
   * T-020: admin 分页列表（含可选 includeDeleted 过滤）
   * - includeDeleted: false (默认) — T-001 中间件自动加 deletedAt: null
   * - includeDeleted: true — admin 看到含已软删
   */
  async findAll(query: FilterBannerDto) {
    const { position, status, page = 1, pageSize = 20, includeDeleted } = query;
    const where: any = {};
    if (position) where.position = position;
    if (status !== undefined) where.status = status;
    // includeDeleted=true 时跳过 deletedAt 过滤（让 admin 看到已软删）
    if (includeDeleted) where.deletedAt = undefined;
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
      }),
      this.prisma.banner.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async findOne(id: bigint) {
    const b = await this.prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException(`Banner ID ${id} 不存在`);
    return b;
  }

  async create(adminId: bigint, dto: CreateBannerDto) {
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
        createdBy: adminId,
      },
    });
  }

  /**
   * T-020: update 时仅在"破坏性字段"变更时写 updatedBy
   * - 破坏性字段: status / startsAt / endsAt
   * - 普通字段: title / imageUrl / linkType / linkTarget / position / sortOrder
   */
  async update(adminId: bigint, id: bigint, dto: UpdateBannerDto) {
    const exists = await this.prisma.banner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exists) throw new NotFoundException(`Banner ID ${id} 不存在`);

    const destructive =
      dto.status !== undefined ||
      dto.startsAt !== undefined ||
      dto.endsAt !== undefined;

    const data: any = { ...dto };
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (destructive) data.updatedBy = adminId;
    return this.prisma.banner.update({ where: { id }, data });
  }

  /**
   * T-020: remove 改为软删（与 T-001 软删规范一致）
   * - 写 deletedAt / deletedBy / updatedBy（破坏性操作）
   * - 不再调用 prisma.delete() 硬删
   */
  async remove(adminId: bigint, id: bigint) {
    const exists = await this.prisma.banner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exists) throw new NotFoundException(`Banner ID ${id} 不存在`);

    await this.prisma.banner.update({
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
   * T-020: restore 已软删 banner（与 admin-post.service.ts:51 / announcement.service.restore 模式一致）
   * - 预查（绕过中间件）：findUnique 检查存在
   * - 不存在 → NotFoundException
   * - 未软删（deletedAt=null）→ BadRequestException
   * - 事务双写: update 恢复 + AuditLog 记录
   */
  async restore(adminId: bigint, id: bigint) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner ID ${id} 不存在`);
    if (!banner.deletedAt) throw new BadRequestException(`Banner ID ${id} 未被软删，无需恢复`);

    await this.prisma.$transaction([
      this.prisma.banner.update({
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
          module: 'banner',
          action: 'restore',
          targetType: 'banner',
          targetId: id,
          reason: `从 ${banner.deletedAt?.toISOString()} 软删恢复`,
          metadata: {
            previousDeletedBy: banner.deletedBy?.toString() ?? null,
            title: banner.title,
          },
        },
      }),
    ]);

    return { id: id.toString(), restored: true };
  }
}
