import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FilterCompanyDto } from './dto';

/**
 * [P0-006] 商家（公司）认证管理 — 提供 verify / unverify API
 *
 * T-021 升级：
 * - findAll 改用 FilterCompanyDto（加 includeDeleted 过滤）
 * - service.remove 软删（写 deletedAt/deletedBy/updatedBy；T-001 规范）
 * - service.restore 事务双写（update + AuditLog；与 T-019/T-020 模式一致）
 */
@Injectable()
export class AdminCompanyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T-021: admin 分页列表（含可选 includeDeleted 过滤）
   * - includeDeleted: false (默认) — T-001 中间件自动加 deletedAt: null
   * - includeDeleted: true — admin 看到含已软删
   */
  async findAll(params: FilterCompanyDto) {
    const { keyword, verified, page = 1, pageSize = 20, includeDeleted } = params;
    const where: any = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { industry: { contains: keyword } },
        { address: { contains: keyword } },
      ];
    }
    if (verified !== undefined) where.verified = verified;
    // includeDeleted=true 时跳过 deletedAt 过滤（让 admin 看到已软删）
    if (includeDeleted) where.deletedAt = undefined;

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: {
          creator: { select: { id: true, phone: true, nickname: true } },
          _count: { select: { jobs: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findOne(id: bigint) {
    const c = await this.prisma.company.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, phone: true, nickname: true, avatar: true } },
        _count: { select: { jobs: true } },
      },
    });
    if (!c) throw new NotFoundException(`公司 ID ${id} 不存在`);
    return c;
  }

  /** [P0-006] 认证通过 */
  async verify(adminUserId: bigint, companyId: bigint) {
    await this.findOne(companyId); // 校验存在
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: { verified: 1 },
    });
    // 写审计
    await this.prisma.auditLog.create({
      data: {
        adminUserId,
        module: 'company',
        action: 'verify',
        targetType: 'company',
        targetId: companyId,
      },
    });
    return updated;
  }

  /** [P0-006] 撤销认证 */
  async unverify(adminUserId: bigint, companyId: bigint) {
    await this.findOne(companyId);
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: { verified: 0 },
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId,
        module: 'company',
        action: 'unverify',
        targetType: 'company',
        targetId: companyId,
      },
    });
    return updated;
  }

  /**
   * T-021: remove 改为软删（与 T-001 软删规范一致）
   * - 写 deletedAt / deletedBy / updatedBy（破坏性操作）
   * - 不再调用 prisma.delete() 硬删
   */
  async remove(adminId: bigint, id: bigint) {
    const exists = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exists) throw new NotFoundException(`公司 ID ${id} 不存在`);

    await this.prisma.company.update({
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
   * T-021: restore 已软删 company（与 admin-post.service.ts:51 / banner.service.restore / announcement.service.restore 模式一致）
   * - 预查（绕过中间件）：findUnique 检查存在
   * - 不存在 → NotFoundException
   * - 未软删（deletedAt=null）→ BadRequestException
   * - 事务双写: update 恢复 + AuditLog 记录
   *
   * 注意：Company 没有 status 字段（只有 verified），restore 不强制重置 verified = 1，
   *       保留原 verified 状态，由 admin 自行决定是否需要重新认证。
   */
  async restore(adminId: bigint, id: bigint) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException(`公司 ID ${id} 不存在`);
    if (!company.deletedAt) throw new BadRequestException(`公司 ID ${id} 未被软删，无需恢复`);

    await this.prisma.$transaction([
      this.prisma.company.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
          updatedBy: adminId,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'company',
          action: 'restore',
          targetType: 'company',
          targetId: id,
          reason: `从 ${company.deletedAt?.toISOString()} 软删恢复`,
          metadata: {
            previousDeletedBy: company.deletedBy?.toString() ?? null,
            name: company.name,
          },
        },
      }),
    ]);

    return { id: id.toString(), restored: true };
  }
}