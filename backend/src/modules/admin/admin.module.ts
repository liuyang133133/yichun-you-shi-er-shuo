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
import { CategoryModule } from '../category/category.module';
import { AdminGuard } from './guards/admin-auth.guard';
import { AiUsageModule } from './ai-usage/ai-usage.module';

@Module({
  imports: [CategoryModule, AiUsageModule],
  controllers: [
    AdminPostController,
    AdminUserController,
    AdminReportController,
    AdminDashboardController,
    AdminCategoryController,
  ],
  providers: [
    AdminPostService,
    AdminUserService,
    AdminReportService,
    AdminDashboardService,
    AdminGuard,
  ],
  exports: [AdminGuard],
})
export class AdminModule {}
