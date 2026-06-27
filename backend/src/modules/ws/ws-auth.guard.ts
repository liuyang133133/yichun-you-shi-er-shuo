/**
 * T-010 WsAuthGuard
 *
 * Socket.IO 连接握手时鉴权：
 *   - 优先从 socket.handshake.auth.token 提取（前端主流方式）
 *   - 回退从 handshake.headers.authorization: Bearer xxx
 *   - 用 JwtService.verify() 验签（与 HTTP JwtStrategy 同一份 secret）
 *   - 拒绝 type=refresh 的 token
 *   - 黑名单检查（调用 AuthService.isTokenBlacklisted）
 *   - 通过后挂载到 socket.data.user = { sub, phone, role, jti, type }
 *   - 失败抛 WsException（Socket.IO 会自动断开客户端）
 */
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const handshake = client.handshake || {};

    // 1) 提取 token
    const token: string | undefined =
      handshake.auth?.token ||
      this.extractBearer(handshake.headers?.authorization);

    if (!token) {
      throw new WsException({ code: 'UNAUTHORIZED', message: '缺少 token' });
    }

    // 2) 验签
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch (e: any) {
      throw new WsException({ code: 'INVALID_TOKEN', message: `token 验证失败: ${e.message}` });
    }

    // 3) 必须有 sub
    if (!payload?.sub) {
      throw new WsException({ code: 'INVALID_TOKEN', message: 'token payload 缺少 sub' });
    }

    // 4) refresh token 不能用于 ws
    if (payload.type === 'refresh') {
      throw new WsException({ code: 'INVALID_TOKEN', message: 'refresh token 不能用于 ws' });
    }

    // 5) 黑名单（登出后的 token）
    if (payload.jti) {
      const blacklisted = await this.authService.isTokenBlacklisted(payload.jti);
      if (blacklisted) {
        throw new WsException({ code: 'TOKEN_REVOKED', message: 'token 已失效（已登出）' });
      }
    }

    // 6) 挂载到 socket.data（供后续 gateway 读取 user.sub）
    client.data.user = {
      sub: payload.sub,
      phone: payload.phone,
      role: payload.role ?? 'user',
      jti: payload.jti,
      type: 'access',
    };

    return true;
  }

  private extractBearer(header?: string): string | undefined {
    if (!header || typeof header !== 'string') return undefined;
    const m = /^Bearer\s+(.+)$/i.exec(header);
    return m ? m[1].trim() : undefined;
  }
}