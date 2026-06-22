import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type Range = 'today' | 'week' | 'month';

@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(range: Range) {
    const since = this.getSince(range);

    const [totalCalls, latencyAgg, costAgg, byKindRaw, topUsersRaw, errorRaw, successCount] =
      await Promise.all([
        this.prisma.aiUsageLog.count({ where: { createdAt: { gte: since } } }),
        this.prisma.aiUsageLog.aggregate({
          where: { createdAt: { gte: since } },
          _avg: { latencyMs: true },
        }),
        this.prisma.aiUsageLog.aggregate({
          where: { createdAt: { gte: since } },
          _sum: { costUsd: true },
        }),
        this.prisma.aiUsageLog.groupBy({
          by: ['kind'],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
        }),
        this.prisma.aiUsageLog.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: since }, userId: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }),
        this.prisma.aiUsageLog.groupBy({
          by: ['errorCode'],
          where: { createdAt: { gte: since }, errorCode: { not: null } },
          _count: { _all: true },
        }),
        this.prisma.aiUsageLog.count({
          where: { createdAt: { gte: since }, success: true },
        }),
      ]);

    const successRate = totalCalls > 0 ? successCount / totalCalls : 0;

    // 关联 user phone
    const userIds = topUsersRaw.map((u: any) => u.userId).filter(Boolean);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, phone: true },
        })
      : [];
    const userMap = new Map(users.map((u: any) => [u.id.toString(), u.phone]));
    const topUsers = topUsersRaw.map((u: any) => ({
      userId: u.userId,
      phone: u.userId ? userMap.get(u.userId.toString()) ?? '' : '',
      calls: u._count._all,
    }));

    // byType: Phase 1 简化 - inputHash 没存 type, Phase 2.1 简化返回 0
    // 真实数据要 join posts 表
    const byType = { house: 0, job: 0, secondhand: 0, lifebiz: 0 };

    return {
      totalCalls,
      successRate,
      avgLatencyMs: latencyAgg._avg.latencyMs ?? 0,
      totalCostUsd: Number(costAgg._sum.costUsd ?? 0),
      totalCostCny: Number(costAgg._sum.costUsd ?? 0) * 7.2,
      byKind: this.expandByKind(byKindRaw),
      byType,
      topUsers,
      errorBreakdown: errorRaw.map((e: any) => ({ code: e.errorCode, count: e._count._all })),
    };
  }

  private expandByKind(raw: any[]): Record<string, number> {
    const out: Record<string, number> = {
      extract: 0,
      'suggest-title': 0,
      score: 0,
      rewrite: 0,
      'seo-meta': 0,
    };
    for (const r of raw) out[r.kind] = r._count._all;
    return out;
  }

  private getSince(range: Range): Date {
    const now = new Date();
    if (range === 'today') {
      now.setHours(0, 0, 0, 0);
      return now;
    }
    if (range === 'week') {
      now.setDate(now.getDate() - 7);
      return now;
    }
    now.setMonth(now.getMonth() - 1);
    return now;
  }
}
