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
   */
  sendSmsCode(phone: string, ip: string) {
    return this.smsService.sendLoginCode(phone, ip);
  }

  /**
   * 短信验证码登录/注册（自动注册）
   */
  async loginBySms(phone: string, code: string) {
    await this.smsService.verifyCode(phone, code);

    // 查找或自动注册
    const existing = await this.userService.findByPhone(phone);
    const user =
      existing ??
      (await this.userService.create({
        phone,
        nickname: `用户${phone.slice(-4)}`,
      } as any));
    this.logger.log(`用户登录: ${phone} -> id=${user.id}`);

    if (user.status === 1) {
      throw new UnauthorizedException('账号已被封禁');
    }

    return this.buildTokenPair(user.id, user.phone);
  }

  /**
   * 密码登录
   */
  async loginByPassword(phone: string, password: string) {
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

    return this.buildTokenPair(user.id, user.phone);
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

    return this.buildTokenPair(user.id, user.phone);
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

  private buildTokenPair(userId: bigint, phone: string): TokenPair {
    const accessPayload: JwtPayload = {
      sub: userId.toString(),
      phone,
      role: 'user',
      type: 'access',
      jti: this.genJti(),
    };
    const refreshPayload: JwtPayload = {
      sub: userId.toString(),
      phone,
      role: 'user',
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
