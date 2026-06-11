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
   * 记录一次浏览
   * - 原子 SET NX 去重:任一 userId/IP 1 小时内首次 -> 计数
   * - 写 ViewLog(留底,供 UV 统计);userAgent 限 500 字符
   * - 异常降级:Redis/Prisma 失败不阻塞 findOne
   * @returns true 表示本次应当计入 viewCount
   */
  async recordView(
    postId: bigint,
    viewer: { userId?: bigint; ip?: string; userAgent?: string },
  ): Promise<boolean> {
    const dedupKeys: string[] = [];
    if (viewer.userId != null) dedupKeys.push(`views:user:${viewer.userId}:post:${postId}`);
    if (viewer.ip) dedupKeys.push(`views:ip:${viewer.ip}:post:${postId}`);

    let isFirstView = false;

    if (dedupKeys.length === 0) {
      // 匿名 + 无 IP:无法去重,直接计数(misconfigured proxy chain 不会重复)
      isFirstView = true;
    } else {
      // 原子 SET NX:任一 key 是新的 -> 算首次浏览
      try {
        const results = await Promise.all(
          dedupKeys.map((k) => this.redis.setNxEx(k, '1', ViewLogService.DEDUP_TTL)),
        );
        isFirstView = results.some((r) => r === true);
      } catch (e) {
        // Redis 异常:降级为首次浏览(不阻塞主请求)
        this.logger.warn(`dedup setNxEx failed: ${(e as Error).message}`);
        isFirstView = true;
      }
    }

    if (isFirstView) {
      // 写 ViewLog + 增 viewCount,均异步,失败不阻塞
      const safeUserAgent = (viewer.userAgent ?? '').slice(0, 500);
      const safeIp = (viewer.ip ?? '').slice(0, 45);
      this.prisma.viewLog
        .create({
          data: {
            postId,
            userId: viewer.userId ?? null,
            ip: safeIp || null,
            userAgent: safeUserAgent || null,
          },
        })
        .catch((e) => this.logger.warn(`ViewLog write failed: ${(e as Error).message}`));

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
