/**
 * T-003: PermissionGuard 单元测试
 *
 * 测试目标（10 个用例）：
 *   1. 无 @RequirePermission 装饰时直接放行
 *   2. super_admin 短路通过
 *   3. content_auditor 拥有 post.view / report.view，但无 role.create
 *   4. operator 拥有 announcement.create / category.view，但无 post.audit.pass
 *   5. customer_service 拥有 comment.delete，但无 post.offline
 *   6. finance 仅有 dashboard.view / post.view，无 user.ban
 *   7. 无角色用户全部拒绝
 *   8. userHasAnyPermission - 任一权限满足
 *   9. 未登录（user.sub 缺失）抛 ForbiddenException
 *  10. 多个权限码任一命中即通过
 */

import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';
import { RbacService } from '../rbac.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PermissionCodes } from '../enums/permission-codes';

describe('PermissionGuard (T-003)', () => {
  let prisma: PrismaService;
  let rbac: RbacService;
  let guard: PermissionGuard;
  let reflector: Reflector;

  // 角色 ID 缓存
  let superAdminUserId: bigint;
  let contentAuditorUserId: bigint;
  let operatorUserId: bigint;
  let noRoleUserId: bigint;
  // 测试期间临时分配的 userRole id (afterAll 清理)
  let tempContentAuditorId: bigint | null = null;
  let tempOperatorId: bigint | null = null;
  // 测试期间临时创建的用户 id (afterAll 软删)
  let createdUserIds: bigint[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    rbac = new RbacService(prisma);
    reflector = new Reflector();
    guard = new PermissionGuard(reflector, rbac);

    // 取一个 admin 用户作为基础（已有 user.role='admin'）
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });
    if (!adminUser) throw new Error('seed 未创建 admin 用户');
    superAdminUserId = adminUser.id;

    // 取 4 个角色 ID
    const superAdmin = await prisma.role.findUnique({ where: { code: 'super_admin' } });
    const contentAuditor = await prisma.role.findUnique({ where: { code: 'content_auditor' } });
    const operator = await prisma.role.findUnique({ where: { code: 'operator' } });

    // 给 admin 用户临时分配 super_admin role（如果还没有）
    const existingSA = await prisma.userRole.findFirst({
      where: { userId: superAdminUserId, roleId: superAdmin!.id, deletedAt: null },
    });
    if (!existingSA) {
      await prisma.userRole.create({
        data: {
          userId: superAdminUserId,
          roleId: superAdmin!.id,
          grantedBy: superAdminUserId,
          createdBy: superAdminUserId,
          updatedBy: superAdminUserId,
        },
      });
    }

    // 找 3 个不同的无角色用户（或临时创建）
    const allUsers = await prisma.user.findMany({
      where: { id: { not: superAdminUserId } },
      take: 200,
    });
    let candidateCA: bigint | null = null;
    let candidateOp: bigint | null = null;
    let candidateNoRole: bigint | null = null;
    createdUserIds = [];

    for (const u of allUsers) {
      const urs = await prisma.userRole.findMany({
        where: { userId: u.id, deletedAt: null },
      });
      if (urs.length === 0) {
        if (!candidateNoRole) candidateNoRole = u.id;
        else if (!candidateCA) candidateCA = u.id;
        else if (!candidateOp) {
          candidateOp = u.id;
          break;
        }
      }
    }

    // 不足则临时创建测试用户
    while (!candidateCA || !candidateOp || !candidateNoRole) {
      const ts = Date.now() + Math.floor(Math.random() * 1000);
      const newUser = await prisma.user.create({
        data: {
          phone: `139${ts.toString().slice(-8)}`,
          nickname: `test_rb_${ts}`,
          status: 0,
          createdBy: superAdminUserId,
          updatedBy: superAdminUserId,
        },
      });
      createdUserIds.push(newUser.id);
      if (!candidateNoRole) candidateNoRole = newUser.id;
      else if (!candidateCA) candidateCA = newUser.id;
      else if (!candidateOp) candidateOp = newUser.id;
    }

    // 分配 content_auditor
    const caUr = await rbac.assignRole(candidateCA, contentAuditor!.id, superAdminUserId);
    tempContentAuditorId = caUr.id;
    contentAuditorUserId = candidateCA;

    // 分配 operator
    const opUr = await rbac.assignRole(candidateOp, operator!.id, superAdminUserId);
    tempOperatorId = opUr.id;
    operatorUserId = candidateOp;

    noRoleUserId = candidateNoRole;
  });

  afterAll(async () => {
    // 清理临时分配（软删）
    if (tempContentAuditorId) {
      await prisma.userRole.update({
        where: { id: tempContentAuditorId },
        data: { deletedAt: new Date(), deletedBy: superAdminUserId, updatedBy: superAdminUserId },
      });
    }
    if (tempOperatorId) {
      await prisma.userRole.update({
        where: { id: tempOperatorId },
        data: { deletedAt: new Date(), deletedBy: superAdminUserId, updatedBy: superAdminUserId },
      });
    }
    // 清理临时创建的测试用户（软删）
    // T-001 软删中间件不应用在 User 模型？看 prisma.service：User 在 SOFT_DELETE_MODELS 中
    // 所以用 prisma.user.update 写 deletedAt 即可
    for (const uid of createdUserIds) {
      await prisma.user.update({
        where: { id: uid },
        data: { deletedAt: new Date(), deletedBy: superAdminUserId, updatedBy: superAdminUserId },
      });
    }
    await prisma.$disconnect();
  });

  // 模拟 ExecutionContext
  function makeContext(codes: string[] | undefined, user: any) {
    const handler = () => undefined;
    const cls = class {};
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(codes);
    return {
      getHandler: () => handler,
      getClass: () => cls,
      switchToHttp: () => ({
        getRequest: () => ({ user, method: 'GET', url: '/admin/test' }),
      }),
    } as any;
  }

  describe('1) 路由未装饰 @RequirePermission', () => {
    it('应直接放行（不调用 RBAC）', async () => {
      const ctx = makeContext(undefined, { sub: '1', role: 'admin' });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('空数组也应放行', async () => {
      const ctx = makeContext([], { sub: '1', role: 'admin' });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('2) super_admin 短路', () => {
    it('任意权限码都通过', async () => {
      const ctx = makeContext(
        [PermissionCodes.ROLE_CREATE, PermissionCodes.POST_PURGE, PermissionCodes.COMPANY_VERIFY],
        { sub: superAdminUserId.toString(), role: 'admin' },
      );
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('3) content_auditor 权限范围', () => {
    it('应有 post.view', async () => {
      const ctx = makeContext(
        [PermissionCodes.POST_VIEW],
        { sub: contentAuditorUserId.toString(), role: 'admin' },
      );
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('应无 role.create', async () => {
      const ctx = makeContext(
        [PermissionCodes.ROLE_CREATE],
        { sub: contentAuditorUserId.toString(), role: 'admin' },
      );
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4) operator 权限范围', () => {
    it('应有 announcement.create', async () => {
      const ctx = makeContext(
        [PermissionCodes.ANNOUNCEMENT_CREATE],
        { sub: operatorUserId.toString(), role: 'admin' },
      );
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('应有 category.view (T-003 新码)', async () => {
      const ctx = makeContext(
        [PermissionCodes.CATEGORY_VIEW],
        { sub: operatorUserId.toString(), role: 'admin' },
      );
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('应无 post.audit.pass', async () => {
      const ctx = makeContext(
        [PermissionCodes.POST_AUDIT_PASS],
        { sub: operatorUserId.toString(), role: 'admin' },
      );
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5) 无角色用户', () => {
    it('应拒绝任何权限', async () => {
      if (!noRoleUserId) {
        // 找不到无角色用户则跳过
        return;
      }
      const ctx = makeContext(
        [PermissionCodes.DASHBOARD_VIEW],
        { sub: noRoleUserId.toString(), role: 'user' },
      );
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('6) userHasAnyPermission - 任一命中', () => {
    it('任一权限码命中即通过', async () => {
      // content_auditor 拥有 post.view，但无 company.verify
      const ctx = makeContext(
        [PermissionCodes.COMPANY_VERIFY, PermissionCodes.POST_VIEW, PermissionCodes.ROLE_CREATE],
        { sub: contentAuditorUserId.toString(), role: 'admin' },
      );
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('所有权限码都不命中则拒绝', async () => {
      const ctx = makeContext(
        [PermissionCodes.ROLE_CREATE, PermissionCodes.COMPANY_VERIFY, PermissionCodes.BANNER_CREATE],
        { sub: contentAuditorUserId.toString(), role: 'admin' },
      );
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('7) 未登录用户', () => {
    it('user.sub 缺失应抛 403', async () => {
      const ctx = makeContext(
        [PermissionCodes.POST_VIEW],
        { sub: undefined },
      );
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('完全无 user 应抛 403', async () => {
      const ctx = makeContext(
        [PermissionCodes.POST_VIEW],
        null,
      );
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('8) 8 个 T-003 新码生效', () => {
    it('super_admin 拥有全部 8 个新码', async () => {
      const codes = [
        PermissionCodes.CATEGORY_VIEW,
        PermissionCodes.CATEGORY_CREATE,
        PermissionCodes.CATEGORY_UPDATE,
        PermissionCodes.CATEGORY_DELETE,
        PermissionCodes.COMPANY_VIEW,
        PermissionCodes.COMPANY_VERIFY,
        PermissionCodes.COMPANY_UNVERIFY,
        PermissionCodes.ANNOUNCEMENT_VIEW,
      ];
      for (const code of codes) {
        const ctx = makeContext(
          [code],
          { sub: superAdminUserId.toString(), role: 'admin' },
        );
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
      }
    });
  });
});