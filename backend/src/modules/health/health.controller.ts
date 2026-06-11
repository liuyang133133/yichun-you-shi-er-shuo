import { Controller, Get, HttpException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Controller('health')
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
    } catch (e: any) {
      checks.mysql = { ok: false, latencyMs: -1, error: e?.message || 'mysql ping failed' };
    }

    // Redis ping
    try {
      const t0 = Date.now();
      const pong = await this.redis.getClient().ping();
      checks.redis = { ok: pong === 'PONG', latencyMs: Date.now() - t0 };
    } catch (e: any) {
      checks.redis = { ok: false, latencyMs: -1, error: e?.message || 'redis ping failed' };
    }

    const ok = Object.values(checks).every((c) => c.ok);
    const data = {
      status: ok ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.0',
      checks,
      totalLatencyMs: Date.now() - startedAt,
    };

    if (!ok) {
      throw new HttpException({ code: 1, message: 'unhealthy', data }, 503);
    }
    return data;
  }
}
