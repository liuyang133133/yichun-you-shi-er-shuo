/**
 * T-010 NotificationGateway
 *
 * Socket.IO 网关，处理客户端连接 / 断开 / 简单 ping-pong。
 *
 * 路由：namespace '/ws'
 * 鉴权：WsAuthGuard（全局或本 gateway）
 * Room：每个连接加入 `user:<sub>`，业务可通过 NotificationWsService.sendToUser 推送
 *
 * 消息约定：
 *   - 客户端 → 服务端:  'ping'   payload { ts }
 *   - 服务端 → 客户端:  'connected'  payload { userId, ts }
 *   - 服务端 → 客户端:  'notification' payload { event, data }
 *   - 服务端 → 客户端:  'pong'    payload { ts, serverTs }
 *
 * 不在 gateway 里做业务逻辑（写库、查权限等），只做路由。
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './ws-auth.guard';
import { NotificationWsService, WS_EMITTER, WsEmitter } from './notification-ws.service';

interface WsUserPayload {
  sub: string;
  phone?: string;
  role?: string;
  jti?: string;
  type?: 'access' | 'refresh';
}

interface AuthedSocket extends Socket {
  data: { user?: WsUserPayload; [k: string]: any };
}

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: true, credentials: true },
  // 不需要 ping 服务端额外配置：socket.io 默认每 25s 客户端 ping
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect, WsEmitter {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: AuthedSocket) {
    const user = client.data?.user;
    if (!user?.sub) {
      // 鉴权失败：服务端立即断开（WsException 应已在 guard 阶段抛过）
      this.logger.warn(`未鉴权连接尝试接入 sid=${client.id}，断开`);
      client.disconnect(true);
      return;
    }
    const room = `user:${user.sub}`;
    await client.join(room);
    client.emit('connected', { userId: user.sub, ts: Date.now() });
    this.logger.log(`ws 已连接 sid=${client.id} userId=${user.sub} room=${room}`);
  }

  handleDisconnect(client: AuthedSocket) {
    const user = client.data?.user;
    this.logger.debug(`ws 断开 sid=${client.id} userId=${user?.sub ?? '<未鉴权>'}`);
  }

  /**
   * WsEmitter 实现：NotificationWsService 通过 DI 注入调用
   * gateway 只负责 socket.io 路由，透传 payload（包装由 NotificationWsService 完成）
   */
  emitToUser(room: string, event: string, payload: unknown): boolean {
    if (!this.server) {
      this.logger.warn('server 未初始化（gateway 尚未启动），跳过推送');
      return false;
    }
    this.server.to(room).emit(event, payload);
    return true;
  }

  /**
   * 简单心跳：客户端可发 'ping' 测试连接
   */
  @SubscribeMessage('ping')
  handlePing(@MessageBody() payload: { ts?: number } = { ts: 0 }) {
    return { event: 'pong', data: { ts: payload?.ts ?? 0, serverTs: Date.now() } };
  }
}