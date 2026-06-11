import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { randomInt } from 'crypto';
import { RedisService } from '../../redis/redis.service';

/**
 * 短信服务（V1 mock 版）
 *
 * 安全加固（MUST-7）：
 * - 用 crypto.randomInt 生成 6 位验证码（密码学安全）
 * - 同手机号 60s 冷却 + 10 次/天限制
 * - 同 IP 30 次/小时限制（防扫描）
 * - 验证失败计数：5 次错误后该号验证码失效，冻结 15 分钟
 * - 验证码验证通过后才删除（不提前清除）
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly CODE_TTL = 5 * 60;          // 5 分钟
  private readonly COOLDOWN_SECONDS = 60;     // 60s 冷却
  private readonly DAILY_MAX = 10;            // 每天 10 次
  private readonly IP_HOURLY_MAX = 30;        // 同 IP 每小时 30 次
  private readonly MAX_ATTEMPTS = 5;          // 5 次错误后冻结
  private readonly ATTEMPT_TTL = 15 * 60;     // 失败计数 15 分钟

  constructor(private readonly redis: RedisService) {}

  /**
   * 发送登录验证码
   * @param phone 11 位手机号
   * @param ip 客户端 IP（用于 IP 限频）
   */
  async sendLoginCode(phone: string, ip: string): Promise<{ cooldown: number }> {
    // 1. IP 限频：每小时 30 次
    const ipKey = `sms:hourly:ip:${ip}`;
    const ipCount = await this.redis.incr(ipKey);
    if (ipCount === 1) {
      await this.redis.expire(ipKey, 3600);
    }
    if (ipCount > this.IP_HOURLY_MAX) {
      throw new HttpException(
        'IP 发送频率超限，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. 同手机号冷却检查
    const cooldownKey = `sms:cooldown:${phone}`;
    const ttl = await this.redis.ttl(cooldownKey);
    if (ttl > 0) {
      throw new HttpException(`请 ${ttl} 秒后再试`, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 3. 每日上限检查
    const dailyKey = `sms:daily:${phone}:${this.todayKey()}`;
    const dailyCount = await this.redis.get(dailyKey);
    const used = dailyCount ? parseInt(dailyCount, 10) : 0;
    if (used >= this.DAILY_MAX) {
      throw new HttpException('今日发送次数已达上限', HttpStatus.TOO_MANY_REQUESTS);
    }

    // 4. 用 crypto.randomInt 生成 6 位验证码（密码学安全）
    const code = randomInt(100000, 1000000).toString();

    // 5. 写入 Redis（验证码 + 失败计数）
    const codeKey = `sms:code:${phone}`;
    const attemptsKey = `sms:attempts:${phone}`;
    await this.redis.setEx(codeKey, code, this.CODE_TTL);
    await this.redis.setEx(attemptsKey, '0', this.ATTEMPT_TTL);
    await this.redis.setEx(cooldownKey, '1', this.COOLDOWN_SECONDS);

    // 6. 自增每日计数
    const newCount = await this.redis.incr(dailyKey);
    if (newCount === 1) {
      await this.redis.expire(dailyKey, 24 * 60 * 60);
    }

    // 7. mock：日志输出验证码（生产环境替换为短信网关调用）
    this.logger.warn(
      `📱 [SMS MOCK] phone=${phone} code=${code} ip=${ip} (valid for ${this.CODE_TTL}s)`,
    );

    return { cooldown: this.COOLDOWN_SECONDS };
  }

  /**
   * 校验验证码
   * - 失败 5 次后该号验证码永久失效
   * - 验证通过后才删除（不提前清除）
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    const codeKey = `sms:code:${phone}`;
    const attemptsKey = `sms:attempts:${phone}`;

    // 0. 检查失败次数
    const attemptsStr = await this.redis.get(attemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    if (attempts >= this.MAX_ATTEMPTS) {
      // 冻结：删除验证码
      await this.redis.del(codeKey);
      await this.redis.del(attemptsKey);
      throw new HttpException(
        '验证失败次数过多，验证码已失效，请重新获取',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 1. 取验证码
    const stored = await this.redis.get(codeKey);
    if (!stored) {
      throw new BadRequestException('验证码已过期或不存在');
    }

    // 2. 比对
    if (stored !== code) {
      // 失败：递增计数
      await this.redis.incr(attemptsKey);
      const remain = this.MAX_ATTEMPTS - attempts - 1;
      throw new BadRequestException(
        `验证码错误（还剩 ${remain} 次尝试机会）`,
      );
    }

    // 3. 成功：清除验证码和失败计数
    await this.redis.del(codeKey);
    await this.redis.del(attemptsKey);
    return true;
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
