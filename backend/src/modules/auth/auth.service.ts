import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { UserService } from '../user/user.service';
import { SmsService } from '../sms/sms.service';
import { RedisService } from '../../redis/redis.service';
import { CaptchaService } from '../captcha/captcha.service';
import { RegisterThrottleService } from '../captcha/register-throttle.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // access token 过期秒数
  refreshExpiresIn: number; // refresh token 过期秒数
}

/**
 * 完整认证服务
 *
 * - 短信验证码登录/注册（自动注册）
 * - 密码登录（已注册用户）
 * - 刷新 token
 * - 登出（把 access token jti 加入 Redis 黑名单）
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // access 7 天，refresh 30 天
  private readonly ACCESS_TTL = '7d';
  private readonly REFRESH_TTL = '30d';
  // [A-P0-01] P0 修复: 密码登录失败计数
  private readonly LOGIN_MAX_ATTEMPTS = 5;
  private readonly LOGIN_ATTEMPT_TTL = 15 * 60; // 15 分钟

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly smsService: SmsService,
    private readonly redis: RedisService,
    // SHOULD-9
    private readonly captchaService: CaptchaService,
    private readonly registerThrottle: RegisterThrottleService,
  ) {
    // 启动期强校验：JWT_SECRET 至少 32 字符
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        `JWT_SECRET must be at least 32 characters (current: ${secret?.length ?? 0}). ` +
        `Generate with: openssl rand -base64 48`,
      );
    }
  }

  /**
   * 发送登录验证码
   * SHOULD-9: 发送前先做 captcha 校验（在 sms.service 的 IP 限频之后，
   * 防止攻击者用 captcha 验证消耗 turnstile 配额但拿不到短信）
   */
  async sendSmsCode(phone: string, ip: string, captchaToken?: string) {
    await this.captchaService.verify(captchaToken, ip);
    return this.smsService.sendLoginCode(phone, ip);
  }

  /**
   * 短信验证码登录/注册（自动注册）
   * SHOULD-9:
   *   - captcha 必填（开发环境 provider=none 可省）
   *   - 自动注册时走 registerThrottle.preCheck + recordRegister
   */
  async loginBySms(phone: string, code: string, ip: string, captchaToken?: string) {
    // 1. captcha 校验（生产环境强制）
    await this.captchaService.verify(captchaToken, ip);

    // 2. 短信验证码校验
    await this.smsService.verifyCode(phone, code);

    // 3. 查找用户
    const existing = await this.userService.findByPhone(phone);

    // 4. 自动注册场景：先 preCheck 再 create 再 record
    let user: NonNullable<typeof existing> | null = existing;
    if (!user) {
      // 4a. 注册限频预检（IP/手机号 24h/7d 阈值）
      await this.registerThrottle.preCheckRegister(ip, phone);

      // 4b. 创建用户（仅传 phone + nickname，其他字段走默认）
      user = (await this.userService.create({
        phone,
        nickname: `用户${phone.slice(-4)}`,
      } as any)) as unknown as NonNullable<typeof existing>;

      // 4c. 记录注册（写 Redis 计数）
      await this.registerThrottle.recordRegister(ip, phone, user!.id);
    }

    this.logger.log(`用户登录: ${phone} -> id=${user!.id} (新注册: ${!existing})`);

    // [P0-AUDIT-2026-07-14] P0-7: 之前只拦 status=1 (封禁), status=2 (软删) 用户
    // 可以登录 + 7 天 JWT 通行. 修复: 任何 status !== 0 都拒绝 (封禁 + 软删).
    if (user!.status !== 0) {
      throw new UnauthorizedException(
        user!.status === 1 ? '账号已被封禁' : '账号已被注销',
      );
    }

    return this.buildTokenPair(user!.id, user!.phone, user!.role);
  }

  /**
   * 密码登录
   * SHOULD-9: 同样需要 captcha（防止撞库）
   * [A-P0-01] P0 修复: 失败计数 + 15 分钟锁定 (5 次失败)
   */
  async loginByPassword(phone: string, password: string, ip: string, captchaToken?: string) {
    await this.captchaService.verify(captchaToken, ip);

    // 1. 预检锁定 (避免无谓 bcrypt)
    if (await this.isLoginLocked(phone)) {
      throw new HttpException(
        '密码错误次数过多，请 15 分钟后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.userService.findByPhone(phone);
    if (!user) {
      // 用户不存在也计数 (防账号枚举)
      await this.recordLoginFailure(phone);
      throw new UnauthorizedException('手机号或密码错误');
    }
    if (!user.password) {
      throw new BadRequestException('该账号未设置密码，请使用验证码登录');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      const n = await this.recordLoginFailure(phone);
      const remain = Math.max(0, this.LOGIN_MAX_ATTEMPTS - n);
      throw new UnauthorizedException(`手机号或密码错误（还剩 ${remain} 次尝试机会）`);
    }
    // [P0-AUDIT-2026-07-14] P0-7: status !== 0 一律拒绝 (封禁/软删都不能登录).
    if (user.status !== 0) {
      throw new UnauthorizedException(
        user.status === 1 ? '账号已被封禁' : '账号已被注销',
      );
    }

    // 成功清空计数
    await this.clearLoginAttempts(phone);
    return this.buildTokenPair(user.id, user.phone, user.role);
  }

  /**
   * 刷新 access token
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (e) {
      throw new UnauthorizedException('refresh token 无效或已过期');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('token 类型错误');
    }

    const user = await this.userService.findOne(BigInt(payload.sub));
    // [A-P1-05] P1 修复: 软删用户 (status=2) 不能 refresh, 防"复活"
    // 原: 仅校验 === 1 (ban), status=2 (软删) 可通过 → 已删用户复活
    // 改: 一切非 0 都拒绝 (0=正常, 1=封禁, 2=软删)
    if (!user || user.status !== 0) {
      throw new UnauthorizedException('用户不存在、已被封禁或已删除');
    }

    return this.buildTokenPair(user.id, user.phone, user.role);
  }

  /**
   * 登出：把当前 access token jti 加入黑名单（剩余有效期）
   * 配合 JwtStrategy 检查黑名单
   * [A-P0-02] P0 修复: 同时从 user-tokens 集合移除该 jti
   */
  async logout(accessToken: string): Promise<{ ok: true }> {
    try {
      const payload = this.jwtService.decode(accessToken) as JwtPayload | null;
      if (payload?.jti && payload.exp) {
        const remain = payload.exp - Math.floor(Date.now() / 1000);
        if (remain > 0) {
          await this.redis.setEx(
            `auth:blacklist:${payload.jti}`,
            '1',
            remain,
          );
        }
        // [A-P0-02] 从 user-tokens 集合中移除, 保持集合与实际 token 一致
        if (payload.sub && payload.jti) {
          await this.redis.srem(`auth:user-tokens:${payload.sub}`, payload.jti);
        }
      }
    } catch {
      // 解析失败也返回 ok，不阻塞登出
    }
    return { ok: true };
  }

  /**
   * 检查 token 是否在黑名单
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const v = await this.redis.get(`auth:blacklist:${jti}`);
    return v === '1';
  }

  // ============== [A-P0-01] P0 修复: 密码登录失败计数 ==============

  private async isLoginLocked(phone: string): Promise<boolean> {
    const v = await this.redis.get(`login:attempts:${phone}`);
    return v ? parseInt(v, 10) >= this.LOGIN_MAX_ATTEMPTS : false;
  }

  private async recordLoginFailure(phone: string): Promise<number> {
    const key = `login:attempts:${phone}`;
    const n = await this.redis.incr(key);
    if (n === 1) await this.redis.expire(key, this.LOGIN_ATTEMPT_TTL);
    return n;
  }

  private async clearLoginAttempts(phone: string): Promise<void> {
    await this.redis.del(`login:attempts:${phone}`);
  }

  // ============== [A-P0-02] P0 修复: 完整 Kill Switch ==============

  /**
   * 撤销某用户所有未过期的 token (ban/改密时用)
   * 流程: SMEMBERS user-tokens → 拉每个 jti → 写入 blacklist → 清空
   * @returns 撤销的 token 数量
   */
  async revokeAllTokensForUser(userId: bigint): Promise<number> {
    const setKey = `auth:user-tokens:${userId}`;
    const jtis = await this.redis.smembers(setKey);
    let revoked = 0;
    for (const jti of jtis) {
      // 用 jti→userId 映射的 TTL 写入 blacklist (避免无限期占用)
      const ttl = await this.redis.ttl(`auth:jti:${jti}`);
      if (ttl > 0) {
        await this.redis.setEx(`auth:blacklist:${jti}`, '1', ttl);
        revoked++;
      }
      await this.redis.del(`auth:jti:${jti}`);
    }
    await this.redis.del(setKey);
    this.logger.log(`[A-P0-02] 撤销用户 ${userId} 的 ${revoked} 个 token`);
    return revoked;
  }

  // ============= 内部 =============

  private async buildTokenPair(userId: bigint, phone: string, role?: string): Promise<TokenPair> {
    const roleClaim = role || 'user';
    const accessPayload: JwtPayload = {
      sub: userId.toString(),
      phone,
      role: roleClaim,
      type: 'access',
      jti: this.genJti(),
    };
    const refreshPayload: JwtPayload = {
      sub: userId.toString(),
      phone,
      role: roleClaim,
      type: 'refresh',
      jti: this.genJti(),
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.ACCESS_TTL,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.REFRESH_TTL,
    });

    // ===== [A-P0-02] P0 修复: 完整 Kill Switch 基础设施 =====
    // 1) 记录 jti → userId 映射 (用于黑名单写入时计算 TTL)
    // 2) 加入 user-tokens 集合 (ban 时 SMEMBERS 全量撤销)
    try {
      const accessTtl = this.parseExpiresIn(this.ACCESS_TTL);
      const refreshTtl = this.parseExpiresIn(this.REFRESH_TTL);
      await this.redis.setEx(
        `auth:jti:${accessPayload.jti!}`,
        userId.toString(),
        accessTtl,
      );
      await this.redis.setEx(
        `auth:jti:${refreshPayload.jti!}`,
        userId.toString(),
        refreshTtl,
      );
      await this.redis.sadd(
        `auth:user-tokens:${userId}`,
        accessPayload.jti!,
        refreshPayload.jti!,
      );
      // 集合 TTL = refresh TTL, 自动过期
      await this.redis.expire(`auth:user-tokens:${userId}`, refreshTtl);
    } catch (e) {
      this.logger.warn(`记录 jti 失败 (非致命): ${(e as Error).message}`);
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiresIn(this.ACCESS_TTL),
      refreshExpiresIn: this.parseExpiresIn(this.REFRESH_TTL),
    };
  }

  /**
   * [A-P0-02] 顺手修复: 用 crypto.randomUUID 替代 Math.random
   * 原因: Math.random 在高并发下冲突概率非零, UUID 加密学安全
   */
  private genJti(): string {
    return randomUUID();
  }

  private parseExpiresIn(s: string): number {
    const m = /^(\d+)([smhd])$/.exec(s);
    if (!m) return 7 * 24 * 60 * 60;
    const n = parseInt(m[1], 10);
    switch (m[2]) {
      case 's': return n;
      case 'm': return n * 60;
      case 'h': return n * 3600;
      case 'd': return n * 86400;
      default: return 7 * 24 * 60 * 60;
    }
  }
}
