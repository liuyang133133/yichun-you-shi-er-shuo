import { Module } from '@nestjs/common';
import { AdminPostController } from './post/admin-post.controller';
import { AdminPostService } from './post/admin-post.service';
import { AdminUserController } from './user/admin-user.controller';
import { AdminUserService } from './user/admin-user.service';
import { AdminReportController } from './report/admin-report.controller';
import { AdminReportService } from './report/admin-report.service';
import { AdminDashboardController } from './dashboard/admin-dashboard.controller';
import { AdminDashboardService } from './dashboard/admin-dashboard.service';
import { AdminCategoryController } from './category/admin-category.controller';
import { AdminCompanyController } from './company/admin-company.controller';
import { AdminCompanyService } from './company/admin-company.service';
import { CategoryModule } from '../category/category.module';
import { AdminGuard } from './guards/admin-auth.guard';
import { AiUsageModule } from './ai-usage/ai-usage.module';
// T-002: RBAC
import { AdminRoleModule } from './role/admin-role.module';
import { AdminPermissionModule } from './permission/admin-permission.module';
import { RbacModule } from '../rbac/rbac.module';
// T-005: 操作日志
import { AdminAuditLogModule } from './audit-log/admin-audit-log.module';
// T-006: 登录日志
import { AdminLoginLogModule } from './login-log/admin-login-log.module';
// [A-P0-02] P0 修复: 注入 AuthModule 拿 AuthService (Kill Switch)
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CategoryModule, AiUsageModule,
    AdminRoleModule, AdminPermissionModule,
    AdminAuditLogModule, // T-005
    AdminLoginLogModule, // T-006
    RbacModule,
    AuthModule, // [A-P0-02] ban 时调 AuthService.revokeAllTokensForUser
  ],
  controllers: [
    AdminPostController,
    AdminUserController,
    AdminReportController,
    AdminDashboardController,
    AdminCategoryController,
    AdminCompanyController,
  ],
  providers: [
    AdminPostService,
    AdminUserService,
    AdminReportService,
    AdminDashboardService,
    AdminCompanyService,
    AdminGuard,
  ],
  exports: [AdminGuard],
})
export class AdminModule {}
