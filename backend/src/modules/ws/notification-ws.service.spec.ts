/**
 * T-010 NotificationWsService 单测（RED）
 *
 * 行为：
 *   - sendToUser(userId, payload) → 通过 socket.io room `user:<id>` 广播
 *   - 不直接耦合 socket.io：用 emitToUser (callback) 注入，便于单测
 *   - payload 格式：{ event, data }，与前端约定一致
 */
import { Test } from '@nestjs/testing';
import { NotificationWsService } from './notification-ws.service';

describe('NotificationWsService', () => {
  let service: NotificationWsService;
  let emitSpy: jest.Mock;

  beforeEach(async () => {
    emitSpy = jest.fn().mockReturnValue(true);
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationWsService,
        {
          provide: 'WS_EMITTER',
          useValue: { emitToUser: emitSpy },
        },
      ],
    }).compile();
    service = moduleRef.get(NotificationWsService);
  });

  it('1. sendToUser 调用 emitToUser，room 格式为 user:<id>', async () => {
    await service.sendToUser('123', { foo: 'bar' });
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0][0]).toBe('user:123');
    expect(emitSpy.mock.calls[0][1]).toBe('notification');
    expect(emitSpy.mock.calls[0][2]).toEqual({ event: 'notification', data: { foo: 'bar' } });
  });

  it('2. sendToUser 支持任意 string id（不强制 bigint）', async () => {
    await service.sendToUser('abc', { hello: 'world' });
    expect(emitSpy.mock.calls[0][0]).toBe('user:abc');
  });

  it('3. sendToUser 抛错时不向上抛（容错：ws 推送失败不应阻塞业务）', async () => {
    emitSpy.mockImplementation(() => {
      throw new Error('socket disconnected');
    });
    await expect(service.sendToUser('1', { x: 1 })).resolves.toBeUndefined();
  });

  it('4. sendToUser 的 data 字段保留 payload 原始引用', async () => {
    const payload = { id: '99', title: 't', body: 'b', url: '/me/notifications' };
    await service.sendToUser('1', payload);
    expect(emitSpy.mock.calls[0][2].data).toEqual(payload);
  });

  it('5. 多用户连续 send → 多次 emitToUser（顺序保留）', async () => {
    await service.sendToUser('1', { a: 1 });
    await service.sendToUser('2', { a: 2 });
    await service.sendToUser('3', { a: 3 });
    expect(emitSpy).toHaveBeenCalledTimes(3);
    expect(emitSpy.mock.calls.map((c) => c[0])).toEqual(['user:1', 'user:2', 'user:3']);
  });

  it('6. emitToUser 返回 false 时（如 socket 已断开），sendToUser 仍 resolve', async () => {
    emitSpy.mockReturnValue(false);
    await expect(service.sendToUser('9', { ok: true })).resolves.toBeUndefined();
  });
});