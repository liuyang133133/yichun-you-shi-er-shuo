import { Module } from '@nestjs/common';
import { AdminAuditLogController } from './admin-audit-log.controller';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AuditLogWriter } from './audit-log-writer.service';
import { RbacModule } from '../../rbac/rbac.module';

@Module({
  imports: [RbacModule], // PermissionGuard
  controllers: [AdminAuditLogController],
  providers: [AdminAuditLogService, AuditLogWriter],
  exports: [AdminAuditLogService, AuditLogWriter],
})
export class AdminAuditLogModule {}