import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 用户列表（搜索/封禁过滤）
   */
  async findAll(query: {
    keyword?: string;
    status?: number;
    role?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { keyword, status, role, page = 1, pageSize = 20 } = query;
    const where: Prisma.UserWhereInput = {};
    if (keyword) {
      where.OR = [
        { phone: { contains: keyword } },
        { nickname: { contains: keyword } },
      ];
    }
    if (status !== undefined) where.status = status;
    if (role) where.role = role;

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, phone: true, nickname: true, avatar: true, gender: true, bio: true,
          status: true, role: true, lastLoginAt: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 封禁用户（status=1）
   * POST /api/v1/admin/users/:id/ban
   */
  async ban(adminId: bigint, userId: bigint, reason: string) {
    if (!reason) throw new BadRequestException('封禁时必须填写理由');
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException(`用户 ID ${userId} 不存在`);
    if (u.role === 'admin') {
      throw new BadRequestException('不能封禁 admin 账号');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 1 },
      select: { id: true, phone: true, nickname: true, status: true },
    });
  }

  /**
   * 解封
   */
  async unban(userId: bigint) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException(`用户 ID ${userId} 不存在`);
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 0 },
      select: { id: true, phone: true, nickname: true, status: true },
    });
  }
}
