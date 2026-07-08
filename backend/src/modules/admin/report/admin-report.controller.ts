import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminReportService } from './admin-report.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { AdminReportHandleDto } from './dto/admin-report.dto';

/**
 * T-003: @RequirePermission 装饰
 * - report.view (GET)
 * - report.handle (POST handle)
 */
@Controller('admin/reports')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminReportController {
  constructor(private readonly adminReportService: AdminReportService) {}

  @Get()
  @RequirePermission('report.view')
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminReportService.findAll({
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post(':id/handle')
  @RequirePermission('report.handle')
  handle(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: AdminReportHandleDto,
  ) {
    return this.adminReportService.handle(
      BigInt(user.sub),
      BigInt(id),
      body.action,
      body.postAction,
    );
  }
}