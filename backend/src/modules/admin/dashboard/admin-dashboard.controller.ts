import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

@Controller('admin/dashboard')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @RequirePermission('dashboard.view')
  getStats() {
    return this.adminDashboardService.getStats();
  }
}