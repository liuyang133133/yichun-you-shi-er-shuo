/**
 * T-010 RedisIoAdapter
 *
 * 包装 socket.io 的 RedisAdapter，让多实例后端能跨进程推送通知。
 *
 * - pub / sub 用独立 Redis client（ioredis），避免与业务共用一个连接阻塞
 * - 在 main bootstrap 时调用 app.useWebSocketAdapter(...) 注入
 * - 单实例场景下也能跑（redis adapter 自带 fallback）
 */
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  /**
   * 创建 socket.io server 时注入 redis adapter
   * RedisService 已经持有 pub 客户端，复用 + 另起一个 sub client（adapter 要求）
   */
  async init(app: INestApplicationContext) {
    const redisService = app.get(RedisService);
    const pubClient = redisService.getClient();
    // sub 必须单独（Redis pub/sub 不允许同一连接既 pub 又 sub）
    const subClient: Redis = pubClient.duplicate();
    subClient.on('error', (e) => this.logger.error('subClient error', e));

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('✅ Socket.IO Redis Adapter 已初始化（多实例广播可用）');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: true, credentials: true },
    });
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}