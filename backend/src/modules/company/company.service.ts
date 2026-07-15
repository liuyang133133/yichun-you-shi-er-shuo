import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
// [P1-4 2026-07-15] 删/恢复公司通知
import { NotificationService } from '../notification/notification.service';
import { NotificationEvent } from '../notification/notification-event';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 创建公司（当前用户为创建者）
   * POST /api/v1/companies
   */
  async create(userId: bigint, dto: CreateCompanyDto) {
    // 检查同名公司（同一创建者下）
    const existing = await this.prisma.company.findFirst({
      where: { creatorUserId: userId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`你已创建过同名公司「${dto.name}」`);
    }

    return this.prisma.company.create({
      data: {
        creatorUserId: userId,
        name: dto.name,
        logo: dto.logo,
        industry: dto.industry,
        scale: dto.scale,
        nature: dto.nature,
        address: dto.address,
        description: dto.description,
      },
    });
  }

  /**
   * 公司详情
   * GET /api/v1/companies/:id
   *
   * [P1-11 2026-07-15] 修复: 用 findFirst + deletedAt: null 过滤软删公司
   * findUnique 中间件自动加 deletedAt:null (Prisma 软删中间件),
   * 但为了与其他 service 行为一致, 显式查询更稳
   * (admin 后台要看软删公司通过 includeDeleted=true 走单独的 admin-company.service)
   */
  async findOne(id: bigint) {
    const c = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        creator: { select: { id: true, nickname: true, avatar: true } },
        _count: { select: { jobs: true } },
      },
    });
    if (!c) throw new NotFoundException(`公司 ID ${id} 不存在`);
    return c;
  }

  /**
   * 编辑公司（仅创建者可改）
   * PATCH /api/v1/companies/:id
   */
  async update(userId: bigint, id: bigint, dto: Partial<CreateCompanyDto>) {
    const c = await this.prisma.company.findUnique({ where: { id }, select: { creatorUserId: true } });
    if (!c) throw new NotFoundException(`公司 ID ${id} 不存在`);
    if (c.creatorUserId !== userId) throw new ForbiddenException('只能修改自己创建的公司');

    const data: Prisma.CompanyUpdateInput = { ...dto };
    return this.prisma.company.update({ where: { id }, data });
  }

  /**
   * 删除公司（仅创建者可删）
   * DELETE /api/v1/companies/:id
   * [D-P1-06] P1 修复: 改软删 (T-021 关闭原硬删)
   * 原: hard delete, 即使 0 在招职位也直接抹除数据, 与 T-001 软删规范不一致
   * 修复: 软删 (deletedAt) + 新增 restore 端点 (admin 后台可恢复)
   *      update MyPost 关联表使现有招聘帖标"公司已注销"
   * [P1-4 2026-07-15] 删除后通知创建者 (admin 删除走 admin-company.service, 不走此)
   */
  async remove(userId: bigint, id: bigint) {
    // 用 includeDeleted=true 拿历史可能已软删的行 (中间件 default 过滤掉)
    const c = await this.prisma.company.findFirst({
      where: { id, includeDeleted: true } as any,
      include: { _count: { select: { jobs: true } } },
    });
    if (!c) throw new NotFoundException(`公司 ID ${id} 不存在`);
    if (c.creatorUserId !== userId) throw new ForbiddenException('只能删除自己创建的公司');
    if (c.deletedAt) {
      return { id: id.toString(), alreadyDeleted: true };
    }
    if (c._count.jobs > 0) {
      throw new ConflictException(
        `公司下还有 ${c._count.jobs} 个在招职位，无法删除。请先下架/删除这些职位。`,
      );
    }
    // [D-P1-06] 软删 (deletedAt) 而非 hard delete, 与 T-001 一致
    await this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
    });
    // [P1-4 2026-07-15] 通知创建者 (公司删除记录)
    this.notificationService.emit({
      userId,
      event: NotificationEvent.SYSTEM,
      title: '公司已删除',
      body: `你创建的公司「${c.name}」已删除，可联系客服恢复。`,
      payload: { type: 'company_removed', id: id.toString(), name: c.name },
      priority: 2,
    }).catch((e) => this.logger.warn(`公司删除通知失败: ${(e as Error).message}`));
    return { id: id.toString(), softDeleted: true };
  }

  /**
   * [D-P1-06] P1 修复: 恢复软删公司 (admin 后台)
   * 注意: 路由未单独暴露, 由 admin-company.service 包装调用
   * [P1-4 2026-07-15] 恢复后通知创建者
   */
  async restore(_userId: bigint, id: bigint) {
    const c = await this.prisma.company.findFirst({
      where: { id, includeDeleted: true } as any,
    });
    if (!c) throw new NotFoundException(`公司 ID ${id} 不存在`);
    if (!c.deletedAt) {
      return { id: id.toString(), alreadyActive: true };
    }
    await this.prisma.company.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, updatedBy: _userId },
    });
    // [P1-4 2026-07-15] 通知创建者
    this.notificationService.emit({
      userId: c.creatorUserId,
      event: NotificationEvent.SYSTEM,
      title: '公司已恢复',
      body: `你创建的公司「${c.name}」已恢复正常。`,
      payload: { type: 'company_restored', id: id.toString(), name: c.name },
      priority: 2,
    }).catch((e) => this.logger.warn(`公司恢复通知失败: ${(e as Error).message}`));
    return { id: id.toString(), restored: true };
  }

  /**
   * 公司列表（公开）
   * GET /api/v1/companies
   *
   * [P1-11 2026-07-15] 修复: where 强制 deletedAt: null,
   * 之前软删的公司仍出现在公开列表 (Prisma 中间件自动加 deletedAt:null 给 findMany 应该已过滤,
   * 但 findUnique/findFirst 不会, 而且 P1-11 audit 现场验证确认有 bug)
   * 修复: 显式 where: { deletedAt: null } 兜底
   */
  async findAll(query: { keyword?: string; industry?: string; page?: number; pageSize?: number } = {}) {
    const { keyword, industry, page = 1, pageSize = 20 } = query;
    const where: Prisma.CompanyWhereInput = { deletedAt: null };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (industry) where.industry = industry;

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { jobs: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 公司在招职位
   * GET /api/v1/companies/:id/jobs
   */
  async findJobs(id: bigint) {
    return this.prisma.postJob.findMany({
      where: { companyId: id },
      include: {
        post: {
          include: {
            area: { select: { id: true, name: true, level: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }
}
