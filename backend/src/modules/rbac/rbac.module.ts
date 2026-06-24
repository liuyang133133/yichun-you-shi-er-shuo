import { Module, Global } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { PermissionGuard } from './guards/permission.guard';

@Global()
@Module({
  providers: [RbacService, PermissionGuard],
  exports: [RbacService, PermissionGuard],
})
export class RbacModule {}
