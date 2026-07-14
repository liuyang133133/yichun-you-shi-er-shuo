import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
// [A-P0-02] P0 修复: 注入 AuthService 做 JWT Kill Switch
import { AuthService } from '../../auth/auth.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);
  /** JWT 鉴权缓存 key 模板，与 JwtStrategy / UserService 保持一致 */
  private static readonly AUTH_CACHE_KEY = (id: bigint | string) =>
    `auth:user:${id}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    // [A-P0-02] P0 修复: 注入 AuthService 触发 JWT Kill Switch
    private readonly authService: AuthService,
  ) {}

  /**
   * 用户列表（搜索/封禁过滤）
   * T-004: 支持 `withRoles=true` 返回每个用户的 RBAC 角色（避免前端 N+1）
   */
  async findAll(query: {
    keyword?: string;
    status?: number;
    role?: string;
    page?: number;
    pageSize?: number;
    withRoles?: boolean;
  }) {
    const { keyword, status, role, page = 1, pageSize = 20, withRoles = false } = query;
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

    // T-004: 一次性查所有用户的 RBAC 角色（避免 N+1）
    let rolesMap = new Map<string, Array<{ roleId: string; code: string; name: string; expiresAt: Date | null }>>();
    if (withRoles && list.length > 0) {
      const userIds = list.map((u) => u.id);
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          userId: { in: userIds },
          deletedAt: null,
        },
        include: { role: { select: { id: true, code: true, name: true } } },
      });
      for (const ur of userRoles) {
        const arr = rolesMap.get(ur.userId.toString()) || [];
        arr.push({
          roleId: ur.roleId.toString(),
          code: ur.role.code,
          name: ur.role.name,
          expiresAt: ur.expiresAt,
        });
        rolesMap.set(ur.userId.toString(), arr);
      }
    }

    const enrichedList = list.map((u) => ({
      ...u,
      ...(withRoles && { roles: rolesMap.get(u.id.toString()) || [] }),
    }));

    return { list: enrichedList, total, page, pageSize };
  }

  /**
   * 封禁用户（status=1）
   * POST /api/v1/admin/users/:id/ban
   * [P2-005] 写 AuditLog
   */
  async ban(adminId: bigint, userId: bigint, reason: string) {
    if (!reason) throw new BadRequestException('封禁时必须填写理由');
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException(`用户 ID ${userId} 不存在`);
    if (u.role === 'admin') {
      throw new BadRequestException('不能封禁 admin 账号');
    }
    // 事务：user.status + auditLog
    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.user.update({
        where: { id: userId },
        data: { status: 1 },
        select: { id: true, phone: true, nickname: true, status: true },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'user',
          action: 'ban',
          targetType: 'user',
          targetId: userId,
          reason,
        },
      });
      return r;
    });
    // SHOULD-38: 失效鉴权缓存
    await this.invalidateAuthCache(userId);
    // [A-P0-02] P0 修复: 撤销该用户所有未过期 token, 让 ban 即时生效
    try {
      await this.authService.revokeAllTokensForUser(userId);
    } catch (e) {
      // 不阻塞主流程, 仅记录
      this.logger.warn(
        `[A-P0-02] revokeAllTokensForUser failed for userId=${userId}: ${(e as Error).message}`,
      );
    }
    return updated;
  }

  /**
   * 解封 — [P2-005] 写 AuditLog
   */
  async unban(adminId: bigint, userId: bigint) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException(`用户 ID ${userId} 不存在`);
    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.user.update({
        where: { id: userId },
        data: { status: 0 },
        select: { id: true, phone: true, nickname: true, status: true },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          module: 'user',
          action: 'unban',
          targetType: 'user',
          targetId: userId,
        },
      });
      return r;
    });
    // SHOULD-38: 失效鉴权缓存
    await this.invalidateAuthCache(userId);
    return updated;
  }

  /**
   * SHOULD-38: 失效指定用户的 JWT 鉴权缓存（admin 改 user status/role 后必须立刻失效）
   */
  private async invalidateAuthCache(id: bigint | string): Promise<void> {
    try {
      await this.redis.del(AdminUserService.AUTH_CACHE_KEY(id));
    } catch {
      // ignore — best-effort
    }
  }
}
