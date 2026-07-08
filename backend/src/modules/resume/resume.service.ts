import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertResumeDto } from './dto/upsert-resume.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ResumeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取我的简历
   * GET /api/v1/resumes/me
   */
  async findMine(userId: bigint) {
    const resume = await this.prisma.resume.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true, phone: true } },
      },
    });
    if (!resume) throw new NotFoundException('尚未创建简历');
    return resume;
  }

  /**
   * 公开获取简历（按 resume.id）
   * GET /api/v1/resumes/:id
   * - 脱敏 user.phone
   * - 仅 isPublic=1 时返回完整内容，否则仅返回基础信息
   */
  async findOnePublic(id: bigint) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
    if (!resume) return null;
    return resume;
  }

  /**
   * 创建或更新我的简历（PUT）
   * PUT /api/v1/resumes/me
   */
  async upsert(userId: bigint, dto: UpsertResumeDto) {
    const data: Prisma.ResumeUpdateInput = {
      name: dto.name,
      gender: dto.gender ?? 0,
      age: dto.age,
      phone: dto.phone,
      email: dto.email,
      education: dto.education,
      experience: dto.experience,
      expectedPosition: dto.expectedPosition,
      expectedSalary: dto.expectedSalary !== undefined ? new Prisma.Decimal(dto.expectedSalary) : null,
      expectedCity: dto.expectedCity,
      selfIntro: dto.selfIntro,
      isPublic: dto.isPublic ?? 0,
    };

    // upsert by userId
    return this.prisma.resume.upsert({
      where: { userId },
      create: { userId, ...data } as any,
      update: data,
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
  }

  /**
   * 删除我的简历
   * DELETE /api/v1/resumes/me
   * [D-P1-08] P1 修复: 改硬删为软删 (T-021)
   * 原: hard delete, 与 T-001 软删规范不一致, 数据无法恢复
   * 修复: 软删 (deletedAt) + 新增 restore 端点
   *      注: 由于 schema 是 userId 唯一, 没指定 ID, restore 用 userId 定位
   */
  async remove(userId: bigint) {
    const r = await this.prisma.resume.findFirst({
      where: { userId, includeDeleted: true } as any,
    });
    if (!r) throw new NotFoundException('简历不存在');
    if (r.deletedAt) {
      return { userId: userId.toString(), alreadyDeleted: true };
    }
    await this.prisma.resume.update({
      where: { userId },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
    });
    return { userId: userId.toString(), softDeleted: true };
  }

  /**
   * [D-P1-08] P1 修复: 恢复软删简历
   * POST /api/v1/resumes/me/restore
   */
  async restore(userId: bigint) {
    const r = await this.prisma.resume.findFirst({
      where: { userId, includeDeleted: true } as any,
    });
    if (!r) throw new NotFoundException('简历不存在');
    if (!r.deletedAt) {
      return { userId: userId.toString(), alreadyActive: true };
    }
    await this.prisma.resume.update({
      where: { userId },
      data: { deletedAt: null, deletedBy: null, updatedBy: userId },
    });
    return { userId: userId.toString(), restored: true };
  }

  /**
   * 公开简历列表（其他用户可见的）
   * GET /api/v1/resumes
   */
  async findPublic(query: { keyword?: string; expectedPosition?: string; page?: number; pageSize?: number } = {}) {
    const { keyword, expectedPosition, page = 1, pageSize = 20 } = query;
    const where: Prisma.ResumeWhereInput = { isPublic: 1 };
    if (keyword) where.OR = [{ name: { contains: keyword } }, { expectedPosition: { contains: keyword } }];
    if (expectedPosition) where.expectedPosition = expectedPosition;

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.resume.findMany({
        where, skip, take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.resume.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }
}
