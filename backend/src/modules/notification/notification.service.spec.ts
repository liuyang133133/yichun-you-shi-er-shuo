/**
 * T-007: NotificationService 单测
 *
 * 测试目标:
 *   1. emit 默认应写库
 *   2. emit 在用户偏好 enabled=false 时跳过
 *   3. emit 在静默时段降级 priority
 *   4. emit 接受 8 类事件（comment / audit / order / auth / system / appeal / follow / invite）
 *   5. list 过滤已删除 + 分页
 *   6. unreadCount 仅统计未读
 *   7. markRead / markAllRead
 *   8. remove 软删
 *   9. settingService.list / upsert / reset
 *  10. deviceService.register / unregister / list
 */

import { NotificationService } from './notification.service';
import { UserNotificationSettingService } from './user-notification-setting.service';
import { DeviceTokenService } from './device-token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEvent } from './notification-event';
import { NotificationWsService } from '../ws/notification-ws.service';

describe('NotificationService (T-007 + T-010)', () => {
  let prisma: PrismaService;
  let service: NotificationService;
  let settingService: UserNotificationSettingService;
  let deviceService: DeviceTokenService;
  let wsMock: NotificationWsService;
  let testUserId: bigint;
  let adminUserId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    // T-010: 用 mock NotificationWsService（单测不发 ws 推送）
    wsMock = { sendToUser: jest.fn().mockResolvedValue(undefined) } as any;
    service = new NotificationService(prisma, wsMock);
    settingService = new UserNotificationSettingService(prisma);
    deviceService = new DeviceTokenService(prisma);

    // 用 admin 用户作为测试（避免污染普通用户通知）
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    adminUserId = admin!.id;

    // 找一个 role='user' 的用户作主测试
    const normal = await prisma.user.findFirst({ where: { role: 'user' } });
    testUserId = (normal ?? admin)!.id;
  });

  afterAll(async () => {
    // 清理本次测试的所有通知
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { userId: testUserId, title: { startsWith: 'T-007 测试' } },
          { userId: adminUserId, title: { startsWith: 'T-007 测试' } },
        ],
      },
    });
    await prisma.userNotificationSetting.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.deviceToken.deleteMany({
      where: { userId: testUserId, token: { startsWith: 'T-007-token-' } },
    });
    await prisma.$disconnect();
  });

  describe('emit', () => {
    it('1) 默认应写一条 notification 记录', async () => {
      const r = await service.emit({
        userId: testUserId,
        event: NotificationEvent.SYSTEM,
        title: 'T-007 测试 系统通知',
        body: '内容',
      });
      expect(r).not.toBeNull();
      expect(r!.userId).toBe(testUserId);
      expect(r!.event).toBe('system');
      expect(r!.channel).toBe('site');
      expect(r!.priority).toBe(3);
    });

    it('2) 用户偏好 enabled=false 时应跳过', async () => {
      await settingService.upsert(testUserId, NotificationEvent.AUDIT, { enabled: false });
      const r = await service.emit({
        userId: testUserId,
        event: NotificationEvent.AUDIT,
        title: 'T-007 测试 audit',
        body: '应该被跳过',
      });
      expect(r).toBeNull();
      // 清理偏好
      await settingService.reset(testUserId);
    });

    it('3) 静默时段 + priority<4 应降级到 priority=1', async () => {
      // 构造一个肯定在静默时段的 quietHours（覆盖 00:00-23:59 全天）
      await settingService.upsert(testUserId, NotificationEvent.COMMENT, {
        enabled: true,
        quietHours: { start: '00:00', end: '23:59' },
      });
      const r = await service.emit({
        userId: testUserId,
        event: NotificationEvent.COMMENT,
        title: 'T-007 测试 comment',
        body: 'should be priority=1',
      });
      expect(r).not.toBeNull();
      expect(r!.priority).toBe(1);
      // 清理
      await settingService.reset(testUserId);
    });

    it('4) priority >= 4 在静默时段也保持原优先级', async () => {
      await settingService.upsert(testUserId, NotificationEvent.AUTH, {
        enabled: true,
        quietHours: { start: '00:00', end: '23:59' },
      });
      const r = await service.emit({
        userId: testUserId,
        event: NotificationEvent.AUTH,
        title: 'T-007 测试 auth urgent',
        body: 'should keep priority=5',
        priority: 5,
      });
      expect(r).not.toBeNull();
      expect(r!.priority).toBe(5);
      // 清理
      await settingService.reset(testUserId);
    });

    it('5) 8 类事件均可发送', async () => {
      const events = Object.values(NotificationEvent);
      for (const event of events) {
        const r = await service.emit({
          userId: testUserId,
          event,
          title: `T-007 测试 ${event}`,
          body: `测试 ${event}`,
        });
        expect(r).not.toBeNull();
        expect(r!.event).toBe(event);
      }
    });

    it('6) emit 可带 payload（跳转 URL + 资源）', async () => {
      const r = await service.emit({
        userId: testUserId,
        event: NotificationEvent.COMMENT,
        title: 'T-007 测试 带payload',
        body: '测试payload',
        payload: { type: 'post', id: '123', url: '/posts/123' },
      });
      expect(r).not.toBeNull();
      expect(r!.payload).toMatchObject({ type: 'post', id: '123', url: '/posts/123' });
    });
  });

  describe('list / unreadCount', () => {
    beforeAll(async () => {
      // 标记之前的都为已读
      await service.markAllRead(testUserId);
      // 创建 3 条新通知
      for (let i = 0; i < 3; i++) {
        await service.emit({
          userId: testUserId,
          event: NotificationEvent.SYSTEM,
          title: `T-007 测试 unread ${i}`,
          body: `body ${i}`,
        });
      }
    });

    it('7) list 应返回所有未软删的通知', async () => {
      const r = await service.list(testUserId, { pageSize: 100 });
      expect(r.list.length).toBeGreaterThanOrEqual(3);
      for (const n of r.list) {
        expect(n.deletedAt).toBeNull();
      }
    });

    it('8) unreadOnly=true 应仅返回未读', async () => {
      const r = await service.list(testUserId, { unreadOnly: true, pageSize: 100 });
      for (const n of r.list) {
        expect(n.readAt).toBeNull();
      }
      expect(r.list.length).toBeGreaterThanOrEqual(3);
    });

    it('9) unreadCount 应 ≥ 3', async () => {
      const c = await service.unreadCount(testUserId);
      expect(c).toBeGreaterThanOrEqual(3);
    });
  });

  describe('markRead / markAllRead', () => {
    it('10) markRead 单条', async () => {
      // 创建一条新通知
      const n = await service.emit({
        userId: testUserId,
        event: NotificationEvent.SYSTEM,
        title: 'T-007 测试 markRead',
        body: 'test',
      });
      expect(n).not.toBeNull();
      expect(n!.readAt).toBeNull();

      const r = await service.markRead(testUserId, n!.id);
      expect(r.count).toBe(1);

      // 再次 markRead 应 updated=0（已读的不算）
      const r2 = await service.markRead(testUserId, n!.id);
      expect(r2.count).toBe(0);
    });

    it('11) markAllRead 应把所有未读标记已读', async () => {
      const before = await service.unreadCount(testUserId);
      expect(before).toBeGreaterThan(0);
      const r = await service.markAllRead(testUserId);
      expect(r.count).toBe(before);
      const after = await service.unreadCount(testUserId);
      expect(after).toBe(0);
    });
  });

  describe('remove', () => {
    it('12) 应软删通知', async () => {
      const n = await service.emit({
        userId: testUserId,
        event: NotificationEvent.SYSTEM,
        title: 'T-007 测试 remove',
        body: 'test',
      });
      expect(n).not.toBeNull();
      const r = await service.remove(testUserId, n!.id, testUserId);
      expect(r.count).toBe(1);

      // 已删除的不应出现在 list
      const list = await service.list(testUserId, { pageSize: 100 });
      const found = list.list.find((x) => x.id === n!.id);
      expect(found).toBeUndefined();
    });
  });

  describe('UserNotificationSettingService', () => {
    it('13) list 默认返回 8 类事件全 enabled', async () => {
      // 确保无偏好
      await settingService.reset(testUserId);
      const r = await settingService.list(testUserId);
      expect(r.length).toBe(8);
      for (const s of r) {
        expect(s.enabled).toBe(true);
      }
    });

    it('14) upsert 单条偏好', async () => {
      await settingService.upsert(testUserId, NotificationEvent.AUDIT, { enabled: false });
      const list = await settingService.list(testUserId);
      const audit = list.find((s) => s.event === 'audit');
      expect(audit!.enabled).toBe(false);
      // 清理
      await settingService.reset(testUserId);
    });

    it('15) upsert 带 quietHours', async () => {
      await settingService.upsert(testUserId, NotificationEvent.COMMENT, {
        enabled: true,
        quietHours: { start: '22:00', end: '08:00', timezone: 'Asia/Shanghai' },
      });
      const list = await settingService.list(testUserId);
      const c = list.find((s) => s.event === 'comment');
      expect(c!.quietHours).toMatchObject({ start: '22:00', end: '08:00' });
      // 清理
      await settingService.reset(testUserId);
    });

    it('16) reset 应删除所有偏好', async () => {
      await settingService.upsert(testUserId, NotificationEvent.AUDIT, { enabled: false });
      const before = await prisma.userNotificationSetting.count({ where: { userId: testUserId } });
      expect(before).toBe(1);
      await settingService.reset(testUserId);
      const after = await prisma.userNotificationSetting.count({ where: { userId: testUserId } });
      expect(after).toBe(0);
    });
  });

  describe('DeviceTokenService', () => {
    it('17) register 应创建或更新 token', async () => {
      const r = await deviceService.register(testUserId, {
        platform: 'ios',
        token: 'T-007-token-001',
        deviceId: 'iPhone15',
      });
      expect(r).not.toBeNull();
      expect(r!.token).toBe('T-007-token-001');
      expect(r!.platform).toBe('ios');

      // 再次注册同一 token（upsert 应覆盖而非新增）
      const r2 = await deviceService.register(testUserId, {
        platform: 'ios',
        token: 'T-007-token-001',
        deviceId: 'iPhone15-Updated',
      });
      expect(r2.id).toBe(r.id);
      expect(r2.deviceId).toBe('iPhone15-Updated');
    });

    it('18) list 应返回用户所有有效设备', async () => {
      await deviceService.register(testUserId, {
        platform: 'android',
        token: 'T-007-token-002',
      });
      const list = await deviceService.list(testUserId);
      expect(list.length).toBeGreaterThanOrEqual(2);
      for (const d of list) {
        expect(d.deletedAt).toBeNull();
      }
    });

    it('19) unregister 应软删 token', async () => {
      const r = await deviceService.unregister(testUserId, 'T-007-token-001');
      expect(r.count).toBe(1);
      const list = await deviceService.list(testUserId);
      const found = list.find((d) => d.token === 'T-007-token-001');
      expect(found).toBeUndefined();
    });
  });
});