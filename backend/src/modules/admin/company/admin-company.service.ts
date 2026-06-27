import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AdminCompanyListParams {
  keyword?: string;
  verified?: number;
  page?: number;
  pageSize?: number;
}

/**
 * [P0-006] 商家（公司）认证管理 — 提供 verify / unverify API
 */
@Injectable()
export class AdminCompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: AdminCompanyListParams) {
    const { keyword, verified, page = 1, pageSize = 20 } = params;
    const where: any = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { industry: { contains: keyword } },
        { address: { contains: keyword } },
      ];
    }
    if (verified !== undefined) where.verified = verified;

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
}