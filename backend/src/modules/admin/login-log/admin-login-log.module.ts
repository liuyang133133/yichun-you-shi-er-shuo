import { Module } from '@nestjs/common';
import { AdminLoginLogController } from './admin-login-log.controller';
import { AdminLoginLogService } from './admin-login-log.service';
import { RbacModule } from '../../rbac/rbac.module';

@Module({
  imports: [RbacModule], // PermissionGuard
  controllers: [AdminLoginLogController],
  providers: [AdminLoginLogService],
  exports: [AdminLoginLogService],
})
export class AdminLoginLogModule {}