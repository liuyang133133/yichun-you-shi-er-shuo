import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
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

    if (user!.status === 1) {
      throw new UnauthorizedException('账号已被封禁');
    }

    return this.buildTokenPair(user!.id, user!.phone, user!.role);
  }

  /**
   * 密码登录
   * SHOULD-9: 同样需要 captcha（防止撞库）
   */
  async loginByPassword(phone: string, password: string, ip: string, captchaToken?: string) {
    await this.captchaService.verify(captchaToken, ip);

    const user = await this.userService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }
    if (!user.password) {
      throw new BadRequestException('该账号未设置密码，请使用验证码登录');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('手机号或密码错误');
    }
    if (user.status === 1) {
      throw new UnauthorizedException('账号已被封禁');
    }

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
    if (!user || user.status === 1) {
      throw new UnauthorizedException('用户不存在或已被封禁');
    }

    return this.buildTokenPair(user.id, user.phone, user.role);
  }

  /**
   * 登出：把当前 access token jti 加入黑名单（剩余有效期）
   * 配合 JwtStrategy 检查黑名单
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

  // ============= 内部 =============

  private buildTokenPair(userId: bigint, phone: string, role?: string): TokenPair {
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

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiresIn(this.ACCESS_TTL),
      refreshExpiresIn: this.parseExpiresIn(this.REFRESH_TTL),
    };
  }

  private genJti(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
