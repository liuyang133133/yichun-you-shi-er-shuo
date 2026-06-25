import { Module } from '@nestjs/common';
import { AdminRoleController } from './admin-role.controller';
import { AdminRoleService } from './admin-role.service';
import { RbacModule } from '../../rbac/rbac.module';

@Module({
  imports: [RbacModule], // PermissionGuard + RbacService (T-003)
  controllers: [AdminRoleController],
  providers: [AdminRoleService],
  exports: [AdminRoleService],
})
export class AdminRoleModule {}