/**
 * T-009: AdminNotificationTemplateService 单测
 *
 * 测试目标:
 *   1. findAll 默认过滤软删
 *   2. findAll 筛选 event / channel / enabled
 *   3. create 写入并返回
 *   4. update 修改
 *   5. toggle 切换 enabled
 *   6. remove 软删
 *   7. broadcast 给所有 user 发送通知
 *   8. preview 替换 {{var}} 变量
 *   9. findOne 不存在抛 404
 */
import { AdminNotificationTemplateService } from './admin-notification-template.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationEvent } from '../../notification/notification-event';

describe('AdminNotificationTemplateService (T-009)', () => {
  let prisma: PrismaService;
  let service: AdminNotificationTemplateService;
  let notificationService: NotificationService;
  let adminUserId: bigint;
  let testTemplateId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    notificationService = new NotificationService(prisma, { sendToUser: jest.fn().mockResolvedValue(undefined) } as any);
    service = new AdminNotificationTemplateService(prisma, notificationService);

    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    adminUserId = admin!.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.notificationTemplate.deleteMany({
      where: { key: { startsWith: 't009_test_' } },
    });
    await prisma.notification.deleteMany({
      where: { title: { startsWith: 'T-009 群发测试' } },
    });
    await prisma.$disconnect();
  });

  describe('findAll', () => {
    it('1) 默认不应返回软删', async () => {
      const r = await service.findAll({ pageSize: 5 });
      for (const t of r.list) expect(t.deletedAt).toBeNull();
    });

    it('2) seed 预置 8 个模板应可见', async () => {
      const r = await service.findAll({ pageSize: 100 });
      expect(r.total).toBeGreaterThanOrEqual(8);
    });

    it('3) 筛选 event 应工作', async () => {
      const r = await service.findAll({ event: 'comment', pageSize: 5 });
      for (const t of r.list) expect(t.event).toBe('comment');
    });
  });

  describe('create / update / toggle / remove', () => {
    it('4) create 写入并返回', async () => {
      const ts = Date.now();
      const t = await service.create(adminUserId, {
        event: NotificationEvent.SYSTEM,
        key: `t009_test_${ts}`,
        title: 'T-009 测试',
        body: '内容 {{userName}}',
        priority: 3,
        enabled: true,
      });
      testTemplateId = t.id;
      expect(t.key).toBe(`t009_test_${ts}`);
      expect(t.enabled).toBe(true);
    });

    it('5) update 修改', async () => {
      const updated = await service.update(adminUserId, testTemplateId.toString(), {
        title: '更新后的标题',
        priority: 5,
      });
      expect(updated.title).toBe('更新后的标题');
      expect(updated.priority).toBe(5);
    });

    it('6) toggle 切换 enabled', async () => {
      const before = await service.findOne(testTemplateId.toString());
      const after = await service.toggle(adminUserId, testTemplateId.toString());
      expect(after.enabled).toBe(!before.enabled);

      // 切换回来
      await service.toggle(adminUserId, testTemplateId.toString());
    });

    it('7) remove 软删', async () => {
      await service.remove(adminUserId, testTemplateId.toString());
      const t = await service.findOne(testTemplateId.toString());
      expect(t.deletedAt).not.toBeNull();
    });
  });

  describe('findOne', () => {
    it('8) 不存在 ID 抛 404', async () => {
      await expect(service.findOne('999999999')).rejects.toThrow(/不存在/);
    });
  });

  describe('preview', () => {
    it('9) 应替换 {{var}} 变量', async () => {
      const t = await service.create(adminUserId, {
        event: NotificationEvent.SYSTEM,
        key: `t009_test_preview_${Date.now()}`,
        title: '你好 {{name}}',
        body: '欢迎 {{name}} 加入伊春',
      });
      const r = await service.preview(t.id.toString(), { name: '张三' });
      expect(r.title).toBe('你好 张三');
      expect(r.body).toBe('欢迎 张三 加入伊春');

      // 清理
      await prisma.notificationTemplate.delete({ where: { id: t.id } });
    });
  });

  describe('broadcast', () => {
    it('10) 给 admin 发送（DB 中 admin 是主要用户）', async () => {
      const before = await prisma.notification.count({
        where: { title: { startsWith: 'T-009 群发测试' } },
      });
      const r = await service.broadcast(adminUserId, {
        event: NotificationEvent.SYSTEM,
        title: 'T-009 群发测试 1',
        body: '测试群发',
        role: 'admin',
      });
      expect(r.sent).toBeGreaterThan(0);
      const after = await prisma.notification.count({
        where: { title: { startsWith: 'T-009 群发测试' } },
      });
      expect(after - before).toBe(r.sent);
    });

    it('11) 给 admin 发送', async () => {
      const before = await prisma.notification.count({
        where: { title: { startsWith: 'T-009 群发测试' } },
      });
      const r = await service.broadcast(adminUserId, {
        event: NotificationEvent.SYSTEM,
        title: 'T-009 群发测试 2',
        body: 'admin 群发',
        role: 'admin',
      });
      // admin 至少 1 个
      expect(r.sent).toBeGreaterThanOrEqual(1);
    });

    it('12) role=all 应给所有人', async () => {
      const before = await prisma.notification.count({
        where: { title: { startsWith: 'T-009 群发测试' } },
      });
      const r = await service.broadcast(adminUserId, {
        event: NotificationEvent.SYSTEM,
        title: 'T-009 群发测试 3',
        body: 'all 群发',
      });
      expect(r.target).toBeGreaterThan(r.sent - before);
    });

    it('13) 空标题应抛 400', async () => {
      await expect(service.broadcast(adminUserId, {
        event: NotificationEvent.SYSTEM,
        title: '',
        body: 'test',
      })).rejects.toThrow(/必填/);
    });
  });
});