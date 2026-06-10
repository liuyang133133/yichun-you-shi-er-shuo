import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * 短信服务（V1 mock 版）
 *
 * - 验证码：6 位数字，Redis 存 5 分钟
 * - 限频 1：同一手机号 60 秒内只能发 1 次（防刷）
 * - 限频 2：同一手机号每天最多 10 次
 *
 * 生产环境替换：调用阿里云/腾讯云短信网关
 * 这里只 console.log 验证码到后端日志
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  // 验证码有效期 5 分钟
  private readonly CODE_TTL = 5 * 60;
  // 同一手机号发送间隔 60 秒
  private readonly COOLDOWN_SECONDS = 60;
  // 每天最多发送次数
  private readonly DAILY_MAX = 10;

  constructor(private readonly redis: RedisService) {}

  /**
   * 发送登录验证码
   * @param phone 11 位手机号
   * @returns { cooldown: 剩余冷却秒数（首次为 0） }
   */
  async sendLoginCode(phone: string): Promise<{ cooldown: number }> {
    const cooldownKey = `sms:cooldown:${phone}`;
    const dailyKey = `sms:daily:${phone}:${this.todayKey()}`;
    const codeKey = `sms:code:${phone}`;

    // 1. 冷却检查
    const ttl = await this.redis.ttl(cooldownKey);
    if (ttl > 0) {
      throw new HttpException(
        `请 ${ttl} 秒后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. 每日上限检查
    const dailyCount = await this.redis.get(dailyKey);
    const used = dailyCount ? parseInt(dailyCount, 10) : 0;
    if (used >= this.DAILY_MAX) {
      throw new HttpException('今日发送次数已达上限', HttpStatus.TOO_MANY_REQUESTS);
    }

    // 3. 生成 6 位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. 写入 Redis
    await this.redis.setEx(codeKey, code, this.CODE_TTL);
    await this.redis.setEx(cooldownKey, '1', this.COOLDOWN_SECONDS);

    // 5. 自增每日计数
    const newCount = await this.redis.incr(dailyKey);
    if (newCount === 1) {
      // 首次写入，设置 24 小时过期
      await this.redis.expire(dailyKey, 24 * 60 * 60);
    }

    // 6. mock：日志输出验证码（生产环境替换为短信网关调用）
    this.logger.warn(
      `📱 [SMS MOCK] phone=${phone} code=${code} (valid for ${this.CODE_TTL}s)`,
    );

    return { cooldown: this.COOLDOWN_SECONDS };
  }

  /**
   * 校验验证码（一次性，校验后立即删除）
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    const codeKey = `sms:code:${phone}`;
    const stored = await this.redis.get(codeKey);
    if (!stored) {
      throw new BadRequestException('验证码已过期或不存在');
    }
    if (stored !== code) {
      throw new BadRequestException('验证码错误');
    }
    // 验证通过，删除（一次性）
    await this.redis.del(codeKey);
    return true;
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
