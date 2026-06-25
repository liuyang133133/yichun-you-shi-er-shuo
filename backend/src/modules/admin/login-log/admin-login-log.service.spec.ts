/**
 * T-006: AdminLoginLogService 单测
 *
 * 测试目标：
 *   1. findAll 默认返回所有（按 createdAt desc）
 *   2. 6 种筛选（userId/phone/ip/status/from/to）
 *   3. findOne 返回详情
 *   4. listOptions 返回 status 分组
 *   5. detectAbnormalIps - 1h 内失败 ≥ 5 次的 IP
 *   6. exportCsv - BOM + 表头 + 转义
 */
import { AdminLoginLogService } from './admin-login-log.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AdminLoginLogService (T-006)', () => {
  let prisma: PrismaService;
  let service: AdminLoginLogService;
  let testUserId: bigint;
  let testUserPhone: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new AdminLoginLogService(prisma);

    // 取一个 admin 用户作为关联
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    testUserId = admin!.id;
    testUserPhone = admin!.phone;

    // 准备测试数据
    await prisma.loginLog.deleteMany({
      where: { ip: { in: ['192.168.99.1', '192.168.99.2', '192.168.99.3'] } },
    });

    // 创建 6 条失败日志（同一 IP） + 2 条成功日志（其他 IP）
    for (let i = 0; i < 6; i++) {
      await prisma.loginLog.create({
        data: {
          userId: testUserId,
          ip: '192.168.99.1',
          status: 'failed',
          failReason: 'wrong_password',
        },
      });
    }
    await prisma.loginLog.create({
      data: {
        userId: testUserId,
        ip: '192.168.99.2',
        status: 'success',
        device: 'iPhone',
      },
    });
    await prisma.loginLog.create({
      data: {
        userId: testUserId,
        ip: '192.168.99.3',
        status: 'failed',
        failReason: 'user_not_found',
      },
    });
  });

  afterAll(async () => {
    await prisma.loginLog.deleteMany({
      where: { ip: { in: ['192.168.99.1', '192.168.99.2', '192.168.99.3'] } },
    });
    await prisma.$disconnect();
  });

  describe('1) findAll', () => {
    it('应返回所有记录（含 user + isFailed 标记）', async () => {
      const r = await service.findAll({ pageSize: 5 });
      expect(r.list.length).toBeGreaterThan(0);
      const first = r.list[0];
      expect(first).toHaveProperty('userPhone');
      expect(first).toHaveProperty('userNickname');
      expect(first).toHaveProperty('isFailed');
    });

    it('失败记录应 isFailed=true', async () => {
      const r = await service.findAll({ ip: '192.168.99.1', pageSize: 10 });
      for (const log of r.list) {
        expect(log.isFailed).toBe(true);
        expect(log.status).toBe('failed');
      }
    });

    it('成功记录应 isFailed=false', async () => {
      const r = await service.findAll({ ip: '192.168.99.2', pageSize: 10 });
      expect(r.list.length).toBe(1);
      expect(r.list[0].isFailed).toBe(false);
      expect(r.list[0].status).toBe('success');
    });
  });

  describe('2) 6 种筛选', () => {
    it('2.1) userId', async () => {
      const r = await service.findAll({ userId: testUserId.toString(), pageSize: 100 });
      for (const log of r.list) expect(log.userId).toBe(testUserId.toString());
    });

    it('2.2) phone (通过 user.phone 关联)', async () => {
      const r = await service.findAll({ phone: testUserPhone.slice(0, 6), pageSize: 100 });
      for (const log of r.list) expect(log.userPhone).toContain(testUserPhone.slice(0, 6));
    });

    it('2.3) ip', async () => {
      const r = await service.findAll({ ip: '192.168.99', pageSize: 100 });
      for (const log of r.list) {
        expect(log.ip).toContain('192.168.99');
      }
    });

    it('2.4) status=success', async () => {
      const r = await service.findAll({ status: 'success', pageSize: 100 });
      for (const log of r.list) expect(log.status).toBe('success');
    });

    it('2.5) status=failed', async () => {
      const r = await service.findAll({ status: 'failed', pageSize: 100 });
      for (const log of r.list) expect(log.status).toBe('failed');
    });

    it('2.6) from 时间过滤', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const r = await service.findAll({ from: future, pageSize: 100 });
      expect(r.list.length).toBe(0);
    });

    it('2.7) to 时间过滤', async () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const r = await service.findAll({ to: past, pageSize: 100 });
      expect(r.list.length).toBe(0);
    });

    it('2.8) 组合：status=failed + ip=192.168.99.1', async () => {
      const r = await service.findAll({
        status: 'failed',
        ip: '192.168.99.1',
        pageSize: 100,
      });
      expect(r.list.length).toBeGreaterThanOrEqual(6);
      for (const log of r.list) {
        expect(log.status).toBe('failed');
        expect(log.ip).toContain('192.168.99.1');
      }
    });
  });

  describe('3) findOne', () => {
    it('应返回详情', async () => {
      const list = await service.findAll({ ip: '192.168.99.2', pageSize: 1 });
      const log = list.list[0];

      const detail = await service.findOne(log.id);
      expect(detail).not.toBeNull();
      expect(detail!.id).toBe(log.id);
      expect(detail!.user).toHaveProperty('phone');
      expect(detail!.ip).toBe('192.168.99.2');
      expect(detail!.isFailed).toBe(false);
    });

    it('不存在 ID 返回 null', async () => {
      const r = await service.findOne('999999999');
      expect(r).toBeNull();
    });
  });

  describe('4) listOptions', () => {
    it('应返回 statuses 分组', async () => {
      const r = await service.listOptions();
      expect(r.statuses.length).toBeGreaterThan(0);
      const values = r.statuses.map((s) => s.value);
      expect(values).toContain('success');
      expect(values).toContain('failed');
    });
  });

  describe('5) detectAbnormalIps', () => {
    it('应识别 1h 内失败 ≥ 5 次的 IP', async () => {
      const abnormal = await service.detectAbnormalIps(1, 5);
      expect(abnormal.has('192.168.99.1')).toBe(true);
    });

    it('不应包含其他 IP', async () => {
      const abnormal = await service.detectAbnormalIps(1, 5);
      expect(abnormal.has('192.168.99.2')).toBe(false); // success
      expect(abnormal.has('192.168.99.3')).toBe(false); // 只有 1 次失败
    });

    it('阈值 10 应不包含 192.168.99.1（只有 6 次失败）', async () => {
      const abnormal = await service.detectAbnormalIps(1, 10);
      expect(abnormal.has('192.168.99.1')).toBe(false);
    });
  });

  describe('6) exportCsv', () => {
    it('应返回 CSV 字符串（BOM + 表头 + 行）', async () => {
      const csv = await service.exportCsv({});
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('id,userId,phone,nickname,ip');
      expect(csv).toContain('status,failReason,createdAt');
    });

    it('带筛选应只导出符合条件', async () => {
      const csv = await service.exportCsv({ status: 'failed' });
      const lines = csv.split('\r\n').slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        // status 在第 8 列（0-indexed 7）
        expect(line).toContain('failed');
      }
    });
  });
});