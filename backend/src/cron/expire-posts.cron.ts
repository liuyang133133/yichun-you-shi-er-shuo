import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 定时任务：清理过期信息（MUST-23）
 *
 * - 每天凌晨 03:00 跑一次
 * - 把 lifebiz.expireAt < NOW() 且 status='active' 的 post 改为 status='expired'
 * - 软删 30 天前的 post + images（避免 uplaods/ 长期堆积）
 */
@Injectable()
export class ExpirePostsCron {
  private readonly logger = new Logger(ExpirePostsCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpire() {
    const t0 = Date.now();
    try {
      // 1. lifebiz 过期下架
      const expiredLifebiz = await this.prisma.postLifebiz.findMany({
        where: {
          expireAt: { lt: new Date() },
          post: { status: 'active' },
        },
        select: { postId: true },
      });
      if (expiredLifebiz.length > 0) {
        const postIds = expiredLifebiz.map((x) => x.postId);
        const r = await this.prisma.post.updateMany({
          where: { id: { in: postIds }, status: 'active' },
          data: { status: 'expired' },
        });
        this.logger.log(`[Cron] lifebiz 过期下架 ${r.count} 条 (${Date.now() - t0}ms)`);
      }

      // 2. 30 天前软删的 post 真正硬清（释放 uploads/ 空间）
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const oldDeleted = await this.prisma.post.count({
        where: { status: 'deleted', updatedAt: { lt: cutoff } },
      });
      // V1 仅统计，不硬删（避免误操作）；admin 后台可手动触发
      if (oldDeleted > 0) {
        this.logger.log(`[Cron] 待清理 30 天前软删 post: ${oldDeleted} 条 (admin 后台可清理)`);
      }
    } catch (e) {
      this.logger.error(`[Cron] 过期任务失败: ${(e as Error).message}`);
    }
  }

  /**
   * 每小时清理一次 Redis 中过期的 session / token
   * （V1 暂未启用，V1.1 接入更复杂清理策略时启用）
   */
  // @Cron(CronExpression.EVERY_HOUR)
  // async handleRedisCleanup() { ... }
}
