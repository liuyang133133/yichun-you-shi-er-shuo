import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 注册限频服务 — SHOULD-9
 *
 * 三层防护：
 *  1. 同 IP 24h 注册上限（防批量注册机）
 *  2. 新注册用户 24h 内发帖上限（防垃圾内容）
 *  3. 同手机号 7 天内最多注册 N 次（防撞库重放）
 *
 * 不替代 sms.service 的 IP/手机号限频，
 * 那些是验证码发送的限频（短信成本防护）；
 * 本服务针对的是"成功注册/登录"行为的限频。
 */
@Injectable()
export class RegisterThrottleService {
  private readonly logger = new Logger(RegisterThrottleService.name);

  // 可调阈值（生产环境建议调小）
  private readonly IP_24H_MAX = 5;        // 同 IP 24h 最多 5 个新注册
  private readonly PHONE_7D_MAX = 3;     // 同手机号 7 天最多 3 次注册
  private readonly NEW_USER_24H_POST_MAX = 1; // 新用户 24h 最多 1 帖

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 记录一次注册（成功创建 user 后调用）
   * 写入：register:ip:<ip>:24h, register:phone:<phone>:7d
   *
   * @param ip    客户端 IP
   * @param phone 11 位手机号
   * @param userId 新创建的用户 ID
   */
  async recordRegister(ip: string, phone: string, userId: bigint): Promise<void> {
    const ipKey = `register:ip:${ip}:24h`;
    const phoneKey = `register:phone:${phone}:7d`;

    const [ipNew, phoneNew] = await Promise.all([
      this.redis.setNxEx(ipKey, '1', 24 * 3600),
      this.redis.setNxEx(phoneKey, '1', 7 * 24 * 3600),
    ]);

    // 自增计数
    const [ipCount, phoneCount] = await Promise.all([
      this.redis.incr(ipKey),
      this.redis.incr(phoneKey),
    ]);

    // 首次自增要 expire（setNxEx 已设，但 incr 后可能丢失 TTL，补一次）
    if (ipNew && ipCount === 1) {
      await this.redis.expire(ipKey, 24 * 3600);
    }
    if (phoneNew && phoneCount === 1) {
      await this.redis.expire(phoneKey, 7 * 24 * 3600);
    }

    this.logger.log(
      `新注册: userId=${userId} phone=${phone.slice(0, 3)}*** ip=${ip} ` +
      `ip24h=${ipCount}/${this.IP_24H_MAX} phone7d=${phoneCount}/${this.PHONE_7D_MAX}`,
    );
  }

  /**
   * 预检：当前 IP/手机号是否已超注册上限
   * 在调用 recordRegister 之前调用，超限直接抛异常
   */
  async preCheckRegister(ip: string, phone: string): Promise<void> {
    const [ipCountStr, phoneCountStr] = await Promise.all([
      this.redis.get(`register:ip:${ip}:24h`),
      this.redis.get(`register:phone:${phone}:7d`),
    ]);

    const ipCount = ipCountStr ? parseInt(ipCountStr, 10) : 0;
    const phoneCount = phoneCountStr ? parseInt(phoneCountStr, 10) : 0;

    if (ipCount >= this.IP_24H_MAX) {
      throw new HttpException(
        `当前 IP 24h 内注册数已达上限（${this.IP_24H_MAX}），请明天再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (phoneCount >= this.PHONE_7D_MAX) {
      throw new HttpException(
        `该手机号 7 天内注册数已达上限（${this.PHONE_7D_MAX}），请使用其他手机号`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * 新用户发帖资格检查
   * - 注册 < 24h：最多发 1 帖
   * - 注册 ≥ 24h：不限制
   *
   * 由 post.service.create() 在创建前调用
   */
  async assertCanPost(userId: bigint): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const ageMs = Date.now() - user.createdAt.getTime();
    const isNew = ageMs < 24 * 3600 * 1000;

    if (!isNew) {
      return; // 老用户无限制
    }

    // 新用户：24h 内已发过帖 → 拒绝
    const newUserKey = `register:newuser:posts:${userId}:24h`;
    const countStr = await this.redis.get(newUserKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= this.NEW_USER_24H_POST_MAX) {
      throw new HttpException(
        '新注册用户 24h 内最多发布 1 条信息，请明天再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 预占名额（atomic INCR + 首次 EXPIRE）
    const newCount = await this.redis.incr(newUserKey);
    if (newCount === 1) {
      await this.redis.expire(newUserKey, 24 * 3600);
    }
  }
}
