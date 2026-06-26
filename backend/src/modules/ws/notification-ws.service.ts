/**
 * T-010 NotificationWsService
 *
 * 通过 socket.io room 推送通知。
 *
 * - 不直接依赖 socket.io server：通过注入 `WS_EMITTER`（gateway）解耦
 *   让单测可注入 mock，无需启动真实 Socket.IO
 * - room 命名约定：`user:<sub>` —— 一个用户的所有连接（多端）都收到
 * - 事件格式：{ event: 'notification', data: <payload> }，与前端约定一致
 * - 容错：emit 抛错 / 返回 false 时静默吃掉，不阻塞业务调用方
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

export const WS_EMITTER = 'WS_EMITTER';

export interface WsEmitter {
  /**
   * 向指定 room 推送事件
   * @returns false 表示当前没有该 room 的客户端（不影响业务）
   */
  emitToUser(userId: string, event: string, payload: unknown): boolean;
}

@Injectable()
export class NotificationWsService {
  private readonly logger = new Logger(NotificationWsService.name);

  constructor(@Inject(WS_EMITTER) private readonly emitter: WsEmitter) {}

  /**
   * 向指定用户推送一条通知
   *
   * @param userId 用户 ID（字符串形式，对应 JWT payload.sub）
   * @param payload 业务负载（前端 NotificationPayload）
   */
  async sendToUser(userId: string | bigint, payload: Record<string, any>): Promise<void> {
    const room = `user:${String(userId)}`;
    try {
      this.emitter.emitToUser(room, 'notification', { event: 'notification', data: payload });
    } catch (e: any) {
      // ws 推送失败不应阻塞业务调用方（如通知写库成功但 ws 已断）
      this.logger.warn(`推送通知到 ${room} 失败: ${e?.message ?? e}`);
    }
  }
}