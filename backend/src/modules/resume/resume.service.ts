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
   */
  async remove(userId: bigint) {
    const r = await this.prisma.resume.findUnique({ where: { userId } });
    if (!r) throw new NotFoundException('简历不存在');
    await this.prisma.resume.delete({ where: { userId } });
    return { deleted: true };
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
