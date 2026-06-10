import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminReportService } from './admin-report.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';

@Controller('admin/reports')
@UseGuards(AdminGuard)
@Roles('admin')
export class AdminReportController {
  constructor(private readonly adminReportService: AdminReportService) {}

  @Get()
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
  handle(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { action: 'handled' | 'ignored'; postAction?: 'down' },
  ) {
    return this.adminReportService.handle(
      BigInt(user.sub),
      BigInt(id),
      body.action,
      body.postAction,
    );
  }
}
