import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * 全局 Redis 客户端
 * 用于：短信验证码、登录限频、Token 黑名单、热门列表缓存等
 *
 * 直接用 ioredis 而非 @nestjs/cache-manager，
 * 是因为我们要用 setnx/expire/incr 等原子操作
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    this.client.on('connect', () => this.logger.log(`✅ Redis 已连接: ${url}`));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  // ===== 常用方法封装 =====

  /** 设置值 + 过期时间（秒） */
  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  /** 原子设置（仅在 key 不存在时）+ 过期时间（秒）。返回 true 表示本次设置成功（即此前不存在） */
  async setNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /** 获取值 */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** 删除 */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /** SET 操作 — sadd（用于 JWT Kill Switch 的 user-tokens 集合） */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  /** SET 操作 — smembers */
  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  /** SET 操作 — srem */
  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  /** 自增（用于限频计数） */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /** 设置过期（如果 key 存在） */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  /** TTL（剩余秒数，-1=无过期，-2=key 不存在） */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * 删除匹配 pattern 的所有 key（SCAN + DEL，生产安全）
   * 用途：列表缓存写操作时清旧缓存
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const client = this.getClient();
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) {
        deleted += await client.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }
}
