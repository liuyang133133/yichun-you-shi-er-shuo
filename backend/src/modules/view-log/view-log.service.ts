import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

/**
 * 浏览日志与防刷计数
 * - 同 userId/IP 在 1 小时内对同一 post 只算 1 次浏览
 * - 每次去重后写 ViewLog(留底,供 UV 统计)
 */
@Injectable()
export class ViewLogService {
  private readonly logger = new Logger(ViewLogService.name);
  /** 防刷 TTL：1 小时 */
  private static readonly DEDUP_TTL = 3600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 记录一次浏览(去重 + 写日志 + 增 viewCount)
   * @returns true 表示本次应当计入 viewCount
   */
  async recordView(
    postId: bigint,
    viewer: { userId?: bigint; ip?: string; userAgent?: string },
  ): Promise<boolean> {
    const dedupKeys: string[] = [];
    if (viewer.userId) dedupKeys.push(`views:user:${viewer.userId}:post:${postId}`);
    if (viewer.ip) dedupKeys.push(`views:ip:${viewer.ip}:post:${postId}`);

    let isFirstView = false;
    for (const key of dedupKeys) {
      const exists = await this.redis.get(key);
      if (!exists) {
        isFirstView = true;
        break;
      }
    }

    if (isFirstView) {
      this.prisma.viewLog
        .create({
          data: {
            postId,
            userId: viewer.userId ?? null,
            ip: viewer.ip ?? null,
            userAgent: viewer.userAgent ?? null,
          },
        })
        .catch((e) => this.logger.warn(`ViewLog write failed: ${(e as Error).message}`));

      const pipeline = dedupKeys.map((k) =>
        this.redis.setEx(k, '1', ViewLogService.DEDUP_TTL),
      );
      await Promise.all(pipeline).catch(() => {});

      this.prisma.post
        .update({
          where: { id: postId },
          data: { viewCount: { increment: 1 } },
        })
        .catch((e) => this.logger.warn(`viewCount incr failed: ${(e as Error).message}`));

      return true;
    }
    return false;
  }
}
