import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
// [P1-2 2026-07-15] 注入 NotificationModule (实际是 @Global(), 显式声明便于追踪)
// - apply → 通知职位发布者
// - updateStatus → 通知投递者

@Module({
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
