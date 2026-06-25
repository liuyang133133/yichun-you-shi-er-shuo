import { Module } from '@nestjs/common';
import { AdminPermissionController } from './admin-permission.controller';
import { AdminPermissionService } from './admin-permission.service';
import { RbacModule } from '../../rbac/rbac.module';

@Module({
  imports: [RbacModule], // PermissionGuard (T-003)
  controllers: [AdminPermissionController],
  providers: [AdminPermissionService],
  exports: [AdminPermissionService],
})
export class AdminPermissionModule {}