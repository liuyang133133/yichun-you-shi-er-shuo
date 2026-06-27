/**
 * T-010 WsAuthGuard 单测（RED）
 *
 * 鉴权策略：
 *   - 从 socket.handshake.auth.token 提取 JWT
 *   - 用 JwtService.verify() 验签
 *   - 拒绝 type=refresh 的 token
 *   - 通过后把 { sub, phone, role, jti } 写入 socket.data.user
 *   - 失败：抛出 WsException（带 code 1001）
 */
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Test } from '@nestjs/testing';
import { WsAuthGuard } from './ws-auth.guard';
import { RedisService } from '../../redis/redis.service';
import { AuthService } from '../auth/auth.service';

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let authService: { isTokenBlacklisted: jest.Mock };

  const mockContext = (token?: string, handshake: any = { auth: { token }, headers: {} }) => {
    const client = {
      handshake,
      data: {} as Record<string, any>,
    };
    return {
      switchToWs: () => ({ getClient: () => client }),
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToHttp: () => ({}),
      getHandler: () => ({}),
      getClass: () => ({}),
      getType: () => 'ws',
      _client: client,
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn() };
    authService = { isTokenBlacklisted: jest.fn().mockResolvedValue(false) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WsAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: () => 'test-secret-with-enough-length' } },
        { provide: RedisService, useValue: {} },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();
    guard = moduleRef.get(WsAuthGuard);
  });

  it('1. 无 token → 抛 WsException（code UNAUTHORIZED）', async () => {
    const ctx = mockContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(WsException);
    const client = (ctx as any)._client;
    expect(client.data.user).toBeUndefined();
  });

  it('2. token 验证失败（签名错误）→ 抛 WsException', async () => {
    jwtService.verifyAsync.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const ctx = mockContext('bad.token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(WsException);
  });

  it('3. token 已加入黑名单 → 抛 WsException', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: '100', jti: 'jti-abc', type: 'access' });
    authService.isTokenBlacklisted.mockResolvedValue(true);
    const ctx = mockContext('valid.token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(WsException);
  });

  it('4. type=refresh token → 抛 WsException（refresh 不能用于 ws）', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: '100', jti: 'jti-abc', type: 'refresh' });
    const ctx = mockContext('refresh.token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(WsException);
  });

  it('5. 有效 token → 写入 socket.data.user 并返回 true', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: '100',
      phone: '13800000001',
      role: 'user',
      jti: 'jti-xyz',
      type: 'access',
    });
    const ctx = mockContext('good.token');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const client = (ctx as any)._client;
    expect(client.data.user).toEqual({
      sub: '100',
      phone: '13800000001',
      role: 'user',
      jti: 'jti-xyz',
      type: 'access',
    });
  });

  it('6. 兼容从 Authorization header 提取 token（Bearer scheme）', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: '200', phone: '13900000002', type: 'access' });
    const handshake = { auth: {}, headers: { authorization: 'Bearer header.token' } };
    const ctx = mockContext(undefined, handshake);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('header.token');
    const client = (ctx as any)._client;
    expect(client.data.user.sub).toBe('200');
  });

  it('7. token 验证返回 sub 为空 → 抛 WsException', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: '', type: 'access' });
    const ctx = mockContext('empty.sub.token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(WsException);
  });
});