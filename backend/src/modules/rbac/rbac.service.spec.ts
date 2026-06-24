/**
 * T-002: RbacService 单元测试
 *
 * 测试目标：
 *   1. listUserRoles 排除软删 + 过期
 *   2. getUserPermissions - super_admin 拥有所有
 *   3. getUserPermissions - 普通用户返回有效 role 的 permission codes
 *   4. userHasPermission / userHasAnyPermission
 *   5. assignRole 幂等
 *   6. revokeRole 软删
 *   7. setRolePermissions 全量替换
 *   8. listRolePermissions
 */

import { RbacService } from './rbac.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemRoleCodes, PermissionCodes } from './enums/permission-codes';

describe('RbacService T-002', () => {
  let prisma: PrismaService;
  let service: RbacService;
  let superAdminUserId: bigint;
  let superAdminRoleId: bigint;
  let contentAuditorRoleId: bigint;
  let testUserId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();
    service = new RbacService(prisma);
    await prisma.$connect();

    // 取超管
    const superAdmin = await prisma.role.findUnique({
      where: { code: SystemRoleCodes.SUPER_ADMIN },
    });
    superAdminRoleId = superAdmin!.id;

    const contentAuditor = await prisma.role.findUnique({
      where: { code: SystemRoleCodes.CONTENT_AUDITOR },
    });
    contentAuditorRoleId = contentAuditor!.id;

    // 取第一个 admin 用户
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });
    superAdminUserId = admin!.id;

    // 取一个普通用户（用于 revoke 测试）
    const normal = await prisma.user.findFirst({
      where: { role: 'user' },
    });
    testUserId = (normal?.id ?? admin!.id) as bigint;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('listUserRoles', () => {
    it('1) 列出 admin 用户的角色应含 super_admin', async () => {
      const urs = await service.listUserRoles(superAdminUserId);
      const codes = urs.map((ur) => ur.role.code);
      expect(codes).toContain(SystemRoleCodes.SUPER_ADMIN);
    });

    it('2) 软删的 UserRole 不应返回', async () => {
      // 用一个新的临时角色避免与 test 7 的 unique 约束冲突
      const tempRole = await prisma.role.create({
        data: {
          code: `temp_soft_del_${Date.now()}`,
          name: 'Temp',
          isSystem: false,
          sortOrder: 99,
          status: 1,
        },
      });
      // 软删一个临时分配
      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: tempRole.id,
          grantedBy: superAdminUserId,
          createdBy: superAdminUserId,
          updatedBy: superAdminUserId,
          deletedAt: new Date(), // 软删
        },
      });
      const urs = await service.listUserRoles(testUserId);
      // 软删的不应出现
      const tempUrs = urs.filter((ur) => ur.roleId === tempRole.id);
      expect(tempUrs.length).toBe(0);

      // 清理
      await prisma.role.update({
        where: { id: tempRole.id },
        data: { deletedAt: new Date(), deletedBy: superAdminUserId, status: 0 },
      });
    });
  });

  describe('getUserPermissions', () => {
    it('3) super_admin 应拥有所有 32 个权限码', async () => {
      const codes = await service.getUserPermissions(superAdminUserId);
      expect(codes.length).toBeGreaterThanOrEqual(32);
      expect(codes).toContain(PermissionCodes.POST_AUDIT_PASS);
      expect(codes).toContain(PermissionCodes.ROLE_CREATE);
      expect(codes).toContain(PermissionCodes.BANNER_CREATE);
    });

    it('4) 无角色的用户返回空数组', async () => {
      // 找一个没有任何角色的用户
      const allUsers = await prisma.user.findMany({ take: 50 });
      for (const u of allUsers) {
        const urs = await service.listUserRoles(u.id);
        if (urs.length === 0) {
          const codes = await service.getUserPermissions(u.id);
          expect(codes).toEqual([]);
          return;
        }
      }
      // 找不到就跳过
    });
  });

  describe('userHasPermission / userHasAnyPermission', () => {
    it('5) super_admin 拥有 post.audit.pass', async () => {
      const has = await service.userHasPermission(superAdminUserId, PermissionCodes.POST_AUDIT_PASS);
      expect(has).toBe(true);
    });

    it('6) super_admin 拥有 userHasAnyPermission 任意一个', async () => {
      const has = await service.userHasAnyPermission(superAdminUserId, [
        PermissionCodes.ROLE_CREATE,
        PermissionCodes.AI_USAGE_VIEW,
        PermissionCodes.BANNER_DELETE,
      ]);
      expect(has).toBe(true);
    });
  });

  describe('assignRole', () => {
    it('7) 给用户分配角色（幂等）', async () => {
      const result1 = await service.assignRole(testUserId, contentAuditorRoleId, superAdminUserId);
      expect(result1.roleId).toBe(contentAuditorRoleId);
      const result2 = await service.assignRole(testUserId, contentAuditorRoleId, superAdminUserId);
      expect(result2.id).toBe(result1.id); // 同一记录
    });
  });

  describe('revokeRole', () => {
    it('8) 撤销角色（软删）', async () => {
      const result = await service.revokeRole(testUserId, contentAuditorRoleId, superAdminUserId);
      expect(result.count).toBeGreaterThanOrEqual(1);
      // 软删后 listUserRoles 不应再返回
      const urs = await service.listUserRoles(testUserId);
      const contentUrs = urs.filter((ur) => ur.roleId === contentAuditorRoleId);
      expect(contentUrs.length).toBe(0);
    });
  });

  describe('listRolePermissions / setRolePermissions', () => {
    it('9) listRolePermissions 返回该角色的权限码', async () => {
      const codes = await service.listRolePermissions(superAdminRoleId);
      expect(codes.length).toBeGreaterThanOrEqual(32);
    });

    it('10) setRolePermissions 全量替换', async () => {
      // 临时创建一个非系统角色
      const tempRole = await prisma.role.create({
        data: {
          code: `test_role_${Date.now()}`,
          name: 'Test Role',
          isSystem: false,
          sortOrder: 99,
          status: 1,
        },
      });
      // 取两个权限码
      const p1 = await prisma.permission.findFirst({ where: { code: PermissionCodes.POST_VIEW } });
      const p2 = await prisma.permission.findFirst({ where: { code: PermissionCodes.DASHBOARD_VIEW } });

      await service.setRolePermissions(tempRole.id, [p1!.id, p2!.id], superAdminUserId);
      const codes1 = await service.listRolePermissions(tempRole.id);
      expect(codes1.sort()).toEqual([PermissionCodes.POST_VIEW, PermissionCodes.DASHBOARD_VIEW].sort());

      // 替换为 1 个
      await service.setRolePermissions(tempRole.id, [p1!.id], superAdminUserId);
      const codes2 = await service.listRolePermissions(tempRole.id);
      expect(codes2).toEqual([PermissionCodes.POST_VIEW]);

      // 清理
      await prisma.role.update({
        where: { id: tempRole.id },
        data: { deletedAt: new Date(), deletedBy: superAdminUserId, status: 0 },
      });
    });
  });
});
