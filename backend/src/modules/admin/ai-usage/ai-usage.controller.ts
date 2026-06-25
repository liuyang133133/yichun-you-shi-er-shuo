import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { AiUsageService } from './ai-usage.service';

@Controller('admin/ai-usage')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Roles('admin')
export class AiUsageController {
  constructor(private readonly service: AiUsageService) {}

  @Get('stats')
  @RequirePermission('aiUsage.view')
  async getStats(@Query('range') range: 'today' | 'week' | 'month' = 'today') {
    return this.service.getStats(range);
  }
}