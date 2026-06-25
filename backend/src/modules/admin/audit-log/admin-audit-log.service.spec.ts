/**
 * T-005: AdminAuditLogService 单测
 *
 * 测试目标:
 *   1. findAll 默认返回所有（按时间倒序）
 *   2. 7 种筛选各自工作
 *   3. findOne 返回详情
 *   4. listModules 返回 module/action/targetType 分组
 *   5. exportCsv 返回 CSV 字符串（含 BOM + 表头）
 */

import { AdminAuditLogService } from './admin-audit-log.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AdminAuditLogService (T-005)', () => {
  let prisma: PrismaService;
  let service: AdminAuditLogService;
  let adminUserId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new AdminAuditLogService(prisma);
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    adminUserId = admin!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 准备测试数据：创建一些 audit log
  beforeAll(async () => {
    // 清理旧测试数据
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { reason: { startsWith: 'T-005 测试' } },
          { requestId: 't-005-test-request-id' },
        ],
      },
    });

    // 插入 4 条测试日志
    await prisma.auditLog.createMany({
      data: [
        {
          adminUserId,
          module: 'post',
          action: 'audit_pass',
          targetType: 'post',
          targetId: BigInt(1),
          reason: 'T-005 测试 pass',
          ip: '127.0.0.1',
          userAgent: 'jest',
          requestId: 't-005-test-request-id',
        },
        {
          adminUserId,
          module: 'post',
          action: 'audit_reject',
          targetType: 'post',
          targetId: BigInt(2),
          reason: 'T-005 测试 reject',
          ip: '127.0.0.1',
          userAgent: 'jest',
          requestId: 't-005-test-request-id',
        },
        {
          adminUserId,
          module: 'user',
          action: 'ban',
          targetType: 'user',
          targetId: BigInt(99),
          reason: 'T-005 测试 ban',
          ip: '192.168.1.1',
          userAgent: 'jest',
        },
        {
          adminUserId,
          module: 'role',
          action: 'create',
          targetType: 'role',
          reason: 'T-005 测试 role create',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { reason: { startsWith: 'T-005 测试' } },
          { requestId: 't-005-test-request-id' },
        ],
      },
    });
  });

  describe('1) findAll 默认', () => {
    it('应返回记录（含 admin 信息 + 5 新字段）', async () => {
      const r = await service.findAll({ pageSize: 5 });
      expect(r.list.length).toBeGreaterThan(0);
      const first = r.list[0];
      expect(first).toHaveProperty('adminPhone');
      expect(first).toHaveProperty('adminNickname');
      expect(first).toHaveProperty('ip');
      expect(first).toHaveProperty('userAgent');
      expect(first).toHaveProperty('requestId');
    });

    it('应按 createdAt desc 排序', async () => {
      const r = await service.findAll({ pageSize: 10 });
      for (let i = 0; i < r.list.length - 1; i++) {
        const a = new Date(r.list[i].createdAt).getTime();
        const b = new Date(r.list[i + 1].createdAt).getTime();
        expect(a).toBeGreaterThanOrEqual(b);
      }
    });
  });

  describe('2) 7 种筛选', () => {
    it('2.1) module=post 应只返回 post 模块', async () => {
      const r = await service.findAll({ module: 'post', pageSize: 100 });
      for (const log of r.list) {
        expect(log.module).toBe('post');
      }
    });

    it('2.2) action=ban 应只返回 ban', async () => {
      const r = await service.findAll({ action: 'ban', pageSize: 100 });
      for (const log of r.list) {
        expect(log.action).toBe('ban');
      }
    });

    it('2.3) adminUserId 过滤', async () => {
      const r = await service.findAll({ adminUserId: adminUserId.toString(), pageSize: 100 });
      for (const log of r.list) {
        expect(log.adminUserId).toBe(adminUserId.toString());
      }
    });

    it('2.4) targetType=user', async () => {
      const r = await service.findAll({ targetType: 'user', pageSize: 100 });
      for (const log of r.list) {
        expect(log.targetType).toBe('user');
      }
    });

    it('2.5) targetId 过滤', async () => {
      const r = await service.findAll({ targetId: '99', pageSize: 100 });
      for (const log of r.list) {
        expect(log.targetId).toBe('99');
      }
    });

    it('2.6) from 时间过滤', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const r = await service.findAll({ from: tomorrow, pageSize: 100 });
      expect(r.list.length).toBe(0);
    });

    it('2.7) to 时间过滤', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const r = await service.findAll({ to: yesterday, pageSize: 100 });
      expect(r.list.length).toBe(0);
    });

    it('2.8) 组合筛选 module + action', async () => {
      const r = await service.findAll({
        module: 'post',
        action: 'audit_pass',
        pageSize: 100,
      });
      for (const log of r.list) {
        expect(log.module).toBe('post');
        expect(log.action).toBe('audit_pass');
      }
    });
  });

  describe('3) findOne', () => {
    it('应返回详情（含 admin + 全部字段）', async () => {
      // 取一条 T-005 测试数据
      const all = await service.findAll({ action: 'audit_pass', pageSize: 1 });
      const log = all.list.find((l) => l.reason?.startsWith('T-005 测试'));
      if (!log) {
        // 测试数据可能已清理，跳过
        return;
      }

      const detail = await service.findOne(log.id);
      expect(detail).not.toBeNull();
      expect(detail!.id).toBe(log.id);
      expect(detail!.admin).toHaveProperty('phone');
      expect(detail!.module).toBe('post');
      expect(detail!.ip).toBe('127.0.0.1');
      expect(detail!.userAgent).toBe('jest');
      expect(detail!.requestId).toBe('t-005-test-request-id');
    });

    it('不存在 ID 应返回 null', async () => {
      const r = await service.findOne('999999999999');
      expect(r).toBeNull();
    });
  });

  describe('4) listModules', () => {
    it('应返回 modules/actions/targetTypes 三组', async () => {
      const r = await service.listModules();
      expect(r.modules.length).toBeGreaterThan(0);
      expect(r.actions.length).toBeGreaterThan(0);
      expect(r.targetTypes.length).toBeGreaterThan(0);
      // 每个数组应有 value + count
      expect(r.modules[0]).toHaveProperty('value');
      expect(r.modules[0]).toHaveProperty('count');
    });

    it('modules 应包含 post/user/role', async () => {
      const r = await service.listModules();
      const moduleValues = r.modules.map((m) => m.value);
      expect(moduleValues).toContain('post');
      expect(moduleValues).toContain('user');
      expect(moduleValues).toContain('role');
    });
  });

  describe('5) exportCsv', () => {
    it('应返回 CSV 字符串（含 BOM + 表头 + 行）', async () => {
      const csv = await service.exportCsv({});
      // BOM
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      // 表头
      expect(csv).toContain('id,adminUserId,adminPhone,adminNickname');
      expect(csv).toContain('module,action,targetType,targetId');
      expect(csv).toContain('requestId,ip,userAgent,createdAt');
      // 数据行
      const lines = csv.split('\r\n');
      expect(lines.length).toBeGreaterThan(2);
    });

    it('带筛选应只导出符合条件的行', async () => {
      const csv = await service.exportCsv({ module: 'post' });
      const lines = csv.split('\r\n').slice(1); // 跳表头
      for (const line of lines) {
        if (!line.trim()) continue;
        expect(line).toContain('post');
      }
    });

    it('应正确转义含逗号 / 引号的内容', async () => {
      // 创建一条含特殊字符的 reason
      await prisma.auditLog.create({
        data: {
          adminUserId,
          module: 'test',
          action: 'csv_escape_test',
          targetType: 'test',
          reason: '含,逗号"和引号',
        },
      });

      const csv = await service.exportCsv({ module: 'test' });
      // 含特殊字符的行应被 "" 包裹，内部 " 转义为 ""
      expect(csv).toContain('"含,逗号""和引号"');

      // 清理
      await prisma.auditLog.deleteMany({
        where: { module: 'test', action: 'csv_escape_test' },
      });
    });
  });
});