/**
 * T-010 NotificationGateway 单测
 *
 * 直接 new gateway 实例（不依赖 Nest DI 解决 WsAuthGuard 装饰器问题）
 * 验证核心行为：join room / emit welcome / ping-pong / emitToUser
 */
import { NotificationGateway } from './notification.gateway';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let server: any;
  let client: any;

  beforeEach(() => {
    server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn().mockReturnThis(),
    };
    // 直接 new（gateway 没有构造器依赖）
    gateway = new NotificationGateway();
    gateway.server = server;

    client = {
      id: 'sock-1',
      data: { user: { sub: '100', phone: '13800000001', role: 'user' } },
      emit: jest.fn(),
      disconnect: jest.fn(),
      handshake: { auth: { token: 'tok' } },
    };
  });

  it('1. handleConnection 通过 user sub 加入 user:<sub> room', async () => {
    const join = jest.fn().mockResolvedValue(undefined);
    await gateway.handleConnection({ ...client, join } as any);
    expect(join).toHaveBeenCalledWith('user:100');
  });

  it('2. handleConnection 给客户端发 welcome 事件（含 userId）', async () => {
    const join = jest.fn().mockResolvedValue(undefined);
    await gateway.handleConnection({ ...client, join } as any);
    expect(client.emit).toHaveBeenCalledWith('connected', expect.objectContaining({ userId: '100' }));
  });

  it('3. handleConnection 用户未鉴权（data.user 不存在）→ disconnect', async () => {
    const join = jest.fn().mockResolvedValue(undefined);
    const emptyClient = { ...client, data: {}, emit: jest.fn(), disconnect: jest.fn() };
    await gateway.handleConnection(emptyClient as any);
    expect(join).not.toHaveBeenCalled();
    expect(emptyClient.disconnect).toHaveBeenCalledWith(true);
  });

  it('4. handleDisconnect 不抛错（清理逻辑）', () => {
    expect(() => gateway.handleDisconnect(client as any)).not.toThrow();
  });

  it('5. 接收客户端 ping 消息 → 回复 pong', () => {
    const payload = { ts: 1234567890 };
    const result = (gateway as any).handlePing(payload);
    expect(result).toEqual({ event: 'pong', data: { ts: 1234567890, serverTs: expect.any(Number) } });
  });

  it('6. emitToUser 透传 payload 给 server.to(room).emit(event, payload)', () => {
    // WsEmitter 接口语义：参数是 room 名（已由 NotificationWsService.sendToUser 拼好）
    // gateway 透传，包装由 NotificationWsService 完成
    const data = { event: 'notification', data: { foo: 'bar' } };
    gateway.emitToUser('user:100', 'notification', data);
    expect(server.to).toHaveBeenCalledWith('user:100');
    expect(server.emit).toHaveBeenCalledWith('notification', data);
  });

  it('7. emitToUser 当 server 未初始化时返回 false（容错）', () => {
    gateway.server = undefined as any;
    const r = gateway.emitToUser('user:100', 'notification', { x: 1 });
    expect(r).toBe(false);
  });
});