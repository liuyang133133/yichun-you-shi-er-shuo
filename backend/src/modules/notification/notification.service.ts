/**
 * T-007: NotificationService
 * T-010: 接入 ws 推送（@Global WsModule 注入 NotificationWsService）
 *
 * emit() - 业务侧调用，写入 notifications 表 + 检查 user preference + 通过 ws 推送
 * 流程：偏好检查 → 静默时段 → 写库 → ws sendToUser(用户 room)
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmitInput } from './notification-event';
import { NotificationWsService } from '../ws/notification-ws.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: NotificationWsService,
  ) {}

  /**
   * 发送通知
   * 检查用户偏好（enabled=false 跳过）+ 静默时段（quietHours 内可降级）
   * 实际发送逻辑：直接 INSERT 到 notifications 表（site 渠道）+ 通过 ws 实时推送
   * 扩展点：channel='email'/'sms'/'push' 时调用对应发送器（V1.1）
   */
  async emit(input: EmitInput) {
    // 1) 检查用户通知偏好
    const setting = await this.prisma.userNotificationSetting.findUnique({
      where: { userId_event: { userId: input.userId, event: input.event } },
    });
    // 默认 enabled=true，未设置 = 允许
    if (setting && !setting.enabled) {
      this.logger.debug(`用户 ${input.userId} 已禁用 ${input.event} 通知，跳过`);
      return null;
    }

    // 2) 静默时段检查（如 22:00-08:00 标记为非紧急）
    let priority = input.priority ?? 3;
    if (setting?.quietHours && priority < 4) {
      const inQuiet = isInQuietHours(setting.quietHours);
      if (inQuiet) {
        this.logger.debug(
          `用户 ${input.userId} 在静默时段，${input.event} 通知降级（priority ${priority} → 1）`,
        );
        priority = 1;
      }
    }

    // 3) 写库
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        event: input.event,
        channel: input.channel ?? 'site',
        title: input.title,
        body: input.body,
        payload: input.payload as any,
        priority,
      },
    });

    this.logger.log(
      `通知 #${notification.id} ${input.event} → user=${input.userId} priority=${priority}`,
    );

    // 4) T-010: ws 实时推送（容错：失败仅 warn，不影响业务）
    await this.ws.sendToUser(input.userId, {
      id: notification.id.toString(),
      event: notification.event,
      title: notification.title,
      body: notification.body,
      priority: notification.priority,
      payload: notification.payload,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  }

  /**
   * 批量发送（如群发公告）
   */
  async emitBatch(inputs: EmitInput[]) {
    return Promise.all(inputs.map((i) => this.emit(i)));
  }

  /**
   * 列出用户通知（分页）
   */
  async list(userId: bigint, opts: { unreadOnly?: boolean; page?: number; pageSize?: number }) {
    const { unreadOnly = false, page = 1, pageSize = 20 } = opts;
    const where: any = { userId, deletedAt: null };
    if (unreadOnly) where.readAt = null;

    const [list, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 未读数
   */
  async unreadCount(userId: bigint): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null, deletedAt: null },
    });
  }

  /**
   * 标记已读
   */
  async markRead(userId: bigint, notificationId: bigint) {
    // 仅允许标记自己的通知
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * 全部标记已读
   */
  async markAllRead(userId: bigint) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * 软删通知（用户主动删除）
   */
  async remove(userId: bigint, notificationId: bigint, deletedBy: bigint) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { deletedAt: new Date(), deletedBy },
    });
  }
}

/**
 * 辅助：检查当前时间是否在静默时段内
 * quietHours: { start: "22:00", end: "08:00", timezone: "Asia/Shanghai" }
 */
function isInQuietHours(quietHours: any): boolean {
  if (!quietHours?.start || !quietHours?.end) return false;
  try {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = quietHours.start.split(':').map(Number);
    const [eh, em] = quietHours.end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (startMin <= endMin) {
      return cur >= startMin && cur < endMin;
    } else {
      // 跨天（如 22:00-08:00）
      return cur >= startMin || cur < endMin;
    }
  } catch {
    return false;
  }
}