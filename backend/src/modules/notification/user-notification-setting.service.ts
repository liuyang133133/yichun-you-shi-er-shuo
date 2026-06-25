/**
 * T-007: 用户通知偏好服务
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEvent, NotificationEventCode } from './notification-event';

@Injectable()
export class UserNotificationSettingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列出某用户的所有偏好（不存在则返回默认）
   */
  async list(userId: bigint) {
    const settings = await this.prisma.userNotificationSetting.findMany({
      where: { userId },
    });
    const map = new Map(settings.map((s) => [s.event, s]));
    // 返回 8 类事件全部偏好（缺省 = enabled=true）
    return Object.values(NotificationEvent).map((event) => {
      const s = map.get(event);
      return {
        event,
        enabled: s ? s.enabled : true,
        quietHours: s?.quietHours ?? null,
      };
    });
  }

  /**
   * 更新某类事件的偏好（upsert）
   */
  async upsert(userId: bigint, event: NotificationEventCode, data: {
    enabled?: boolean;
    quietHours?: any;
  }) {
    return this.prisma.userNotificationSetting.upsert({
      where: { userId_event: { userId, event } },
      update: data,
      create: {
        userId,
        event,
        enabled: data.enabled ?? true,
        quietHours: data.quietHours as any,
      },
    });
  }

  /**
   * 重置为默认（删除所有偏好 = 全启用）
   */
  async reset(userId: bigint) {
    return this.prisma.userNotificationSetting.deleteMany({ where: { userId } });
  }
}