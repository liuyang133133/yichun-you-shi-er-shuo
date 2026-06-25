/**
 * T-005: 后台操作日志查询 Controller
 *
 * 端点：
 *   GET /api/v1/admin/audit-logs             列表（带 7 筛选）
 *   GET /api/v1/admin/audit-logs/:id         详情
 *   GET /api/v1/admin/audit-logs/options     筛选下拉数据
 *   GET /api/v1/admin/audit-logs/export      CSV 导出
 */
import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuditLogService } from './admin-audit-log.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@Controller('admin/audit-logs')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminAuditLogController {
  constructor(private readonly service: AdminAuditLogService) {}

  @Get()
  @RequirePermission('auditLog.view')
  @ApiOperation({ summary: '操作日志列表（7 筛选：module/action/adminUserId/targetType/targetId/from/to）' })
  findAll(
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAll({
      module, action, adminUserId, targetType, targetId, from, to,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('options')
  @RequirePermission('auditLog.view')
  @ApiOperation({ summary: '操作日志筛选下拉数据（modules/actions/targetTypes）' })
  listOptions() {
    return this.service.listModules();
  }

  @Get('export')
  @RequirePermission('auditLog.view')
  @ApiOperation({ summary: '导出操作日志 CSV（带筛选，最多 10000 行）' })
  async exportCsv(
    @Res() res: Response,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.service.exportCsv({
      module, action, adminUserId, targetType, targetId, from, to,
    });
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get(':id')
  @RequirePermission('auditLog.view')
  @ApiOperation({ summary: '操作日志详情' })
  async findOne(@Param('id') id: string) {
    const r = await this.service.findOne(id);
    if (!r) return { error: 'not found' };
    return r;
  }
}