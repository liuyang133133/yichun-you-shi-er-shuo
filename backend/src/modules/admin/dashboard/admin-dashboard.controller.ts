import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';

@Controller('admin/dashboard')
@UseGuards(AdminGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  getStats() {
    return this.adminDashboardService.getStats();
  }
}
