import { Module } from '@nestjs/common';
import { AdminNotificationTemplateController } from './admin-notification-template.controller';
import { AdminNotificationTemplateService } from './admin-notification-template.service';
import { RbacModule } from '../../rbac/rbac.module';
import { NotificationModule } from '../../notification/notification.module';

@Module({
  imports: [RbacModule, NotificationModule], // PermissionGuard + NotificationService
  controllers: [AdminNotificationTemplateController],
  providers: [AdminNotificationTemplateService],
  exports: [AdminNotificationTemplateService],
})
export class AdminNotificationModule {}