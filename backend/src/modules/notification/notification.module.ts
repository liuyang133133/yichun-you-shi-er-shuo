import { Module, Global } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { UserNotificationSettingService } from './user-notification-setting.service';
import { DeviceTokenService } from './device-token.service';

@Global() // 让其他模块可注入 NotificationService.emit()
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, UserNotificationSettingService, DeviceTokenService],
  exports: [NotificationService, UserNotificationSettingService, DeviceTokenService],
})
export class NotificationModule {}