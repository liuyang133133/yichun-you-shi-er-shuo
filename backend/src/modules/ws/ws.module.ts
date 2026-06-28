/**
 * T-010 WsModule
 *
 * 全局模块：@Global()，让 NotificationService 等可注入 NotificationWsService。
 *
 * Exports:
 *   - NotificationWsService（业务侧调用 sendToUser）
 *   - NotificationGateway（main bootstrap 时需要 server，但通过 WS_EMITTER 注入解耦）
 *
 * WS_EMITTER provider：把 gateway 实例注册为 WS_EMITTER，
 * 让 NotificationWsService 单测可注入 mock。
 */
import { Global, Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationWsService, WS_EMITTER } from './notification-ws.service';
import { WsAuthGuard } from './ws-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule], // 提供 JwtService + AuthService 给 WsAuthGuard
  providers: [
    WsAuthGuard,
    NotificationGateway,
    NotificationWsService,
    {
      provide: WS_EMITTER,
      // 把 gateway 实例（实现 WsEmitter 接口）注册为 WS_EMITTER
      useExisting: NotificationGateway,
    },
  ],
  exports: [NotificationWsService, NotificationGateway, WS_EMITTER],
})
export class WsModule {}