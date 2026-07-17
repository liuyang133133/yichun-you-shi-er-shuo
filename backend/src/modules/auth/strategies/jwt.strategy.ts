import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { RedisService } from '../../../redis/redis.service';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

/**
 * 手动从 Cookie 头解析指定字段 (不依赖 cookie-parser 中间件)
 * - SSR 转发 cookie: access_token=xxx 时使用
 * - 客户端 fetch 自带 Authorization bearer, 这个 extractor 不会被触发
 */
function fromCookie(name: string) {
  return (req: Request | undefined): string | null => {
    if (!req) return null;
    const header = req.headers?.cookie;
    if (!header) return null;
    for (const part of header.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const k = part.slice(0, eq).trim();
      if (k === name) {
        try {
          return decodeURIComponent(part.slice(eq + 1));
        } catch {
          return part.slice(eq + 1);
        }
      }
    }
    return null;
  };
}

/**
 * JWT 鉴权策略
 *
 * - 从 Authorization: Bearer xxx 提取 token
 * - 用 JWT_SECRET 验签
 * - 拒绝 type=refresh 的 token（refresh 走专用端点）
 * - 拒绝黑名单中的 token（**必须在缓存查找之前**，安全路径不能被缓存绕过）
 * - 查 Redis 缓存拿用户最新状态（status=0 才算正常），缓存未命中再查 DB 并写回（5min TTL）
 * - 把用户信息挂到 request.user 上，供 @CurrentUser 装饰器使用
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private static readonly USER_CACHE_TTL_SEC = 300; // 5 分钟

  constructor(
    config: ConfigService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly redis: RedisService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      // [T-024-f 2026-07-15] 同时支持两种 token 来源:
      // 1. Authorization: Bearer xxx (浏览器 fetch / Postman)
      // 2. Cookie: access_token=xxx (Next.js SSR fetch 转发浏览器 cookie)
      // 之前只支持 #1, SSR 转发 cookie 后 strategy 找不到 token → viewer.userId=undefined
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromCookie('access_token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Passport 在 token 验签通过后回调此方法
   * 返回值会作为 request.user
   */
  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('无效的 token payload');
    }
    // 拒绝 refresh token 用于业务接口
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('refresh token 不能用于业务请求');
    }
    // 黑名单检查（登出后的 token）—— 必须在 cache lookup 之前
    if (payload.jti) {
      const blacklisted = await this.authService.isTokenBlacklisted(payload.jti);
      if (blacklisted) {
        throw new UnauthorizedException('token 已失效（已登出）');
      }
    }

    const user = await this.loadUserCached(BigInt(payload.sub));
    // [P0-AUDIT-2026-07-14] P0-7: status !== 0 一律拒绝 (封禁/软删).
    // 软删用户即使已签发 token, 后续每个请求也都会被拦, 不留 7 天窗口.
    if (user.status !== 0) {
      throw new UnauthorizedException(
        user.status === 1 ? '账号已被封禁' : '账号已被注销',
      );
    }

    return {
      sub: user.id.toString(),
      phone: user.phone,
      role: user.role || 'user',
      jti: payload.jti,
      type: 'access',
    } satisfies JwtPayload;
  }

  /**
   * 带 Redis 缓存的用户加载（SHOULD-38）：
   * - 命中缓存：直接反序列化返回（避免每请求查 DB）
   * - 未命中：查 DB 写回缓存（5min TTL），返回
   * - Redis 不可用：catch 后 fall through 到 DB，保证鉴权可用性
   *
   * BigInt 字段 id 经 JSON 序列化后变 string，下游 `user.id.toString()` 与
   * `user.status === 1` 比较不受影响。
   */
  private async loadUserCached(id: bigint) {
    const cacheKey = `auth:user:${id}`;
    let userJson: string | null = null;
    try {
      userJson = await this.redis.get(cacheKey);
    } catch (e) {
      // Redis 挂了：直接走 DB，鉴权不中断
      userJson = null;
    }

    if (userJson) {
      return JSON.parse(userJson);
    }

    const user = await this.userService.findOne(id);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // BigInt -> string（replacer 把所有 bigint 字段安全序列化）
    const serialized = JSON.stringify(user, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    try {
      await this.redis.setEx(
        cacheKey,
        serialized,
        JwtStrategy.USER_CACHE_TTL_SEC,
      );
    } catch {
      // 写入失败也无所谓，下次请求重试
    }
    return user;
  }
}
