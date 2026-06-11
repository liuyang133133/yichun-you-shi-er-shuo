import { Controller, Get, HttpException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
// 静态导入 backend package.json 的 version(生产环境 npm_package_version 不可靠)
// tsconfig 已配置 resolveJsonModule
import { version as APP_VERSION } from '../../../package.json';

@Controller('health')
@SkipThrottle() // 健康检查被 LB / 探针高频调用,跳过限流
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    const startedAt = Date.now();
    const checks: Record<string, { ok: boolean; latencyMs: number; error?: string }> = {};

    // MySQL ping
    try {
      const t0 = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.mysql = { ok: true, latencyMs: Date.now() - t0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      checks.mysql = { ok: false, latencyMs: -1, error: msg || 'mysql ping failed' };
    }

    // Redis ping
    try {
      const t0 = Date.now();
      const pong = await this.redis.getClient().ping();
      checks.redis = { ok: pong === 'PONG', latencyMs: Date.now() - t0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      checks.redis = { ok: false, latencyMs: -1, error: msg || 'redis ping failed' };
    }

    const ok = Object.values(checks).every((c) => c.ok);
    const data = {
      status: ok ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      checks,
      totalLatencyMs: Date.now() - startedAt,
    };

    if (!ok) {
      // 503 时把 data 透传给 AllExceptionsFilter,后者已支持保留 obj.data
      throw new HttpException({ code: 1, message: 'unhealthy', data }, 503);
    }
    return data;
  }
}
