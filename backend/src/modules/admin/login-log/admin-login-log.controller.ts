/**
 * T-006: 后台登录日志查询 Controller
 */
import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminLoginLogService } from './admin-login-log.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@Controller('admin/login-logs')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminLoginLogController {
  constructor(private readonly service: AdminLoginLogService) {}

  @Get()
  @RequirePermission('loginLog.view')
  @ApiOperation({ summary: '登录日志列表（6 筛选：userId/phone/ip/status/from/to）' })
  findAll(
    @Query('userId') userId?: string,
    @Query('phone') phone?: string,
    @Query('ip') ip?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAll({
      userId, phone, ip, status, from, to,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('options')
  @RequirePermission('loginLog.view')
  @ApiOperation({ summary: '登录日志筛选下拉数据（statuses）' })
  listOptions() {
    return this.service.listOptions();
  }

  @Get('abnormal-ips')
  @RequirePermission('loginLog.view')
  @ApiOperation({ summary: '异常 IP 检测（1h 内失败 ≥ 5 次）' })
  async detectAbnormal() {
    const ips = await this.service.detectAbnormalIps(1, 5);
    return { ips: Array.from(ips), count: ips.size, windowHours: 1, threshold: 5 };
  }

  @Get('export')
  @RequirePermission('loginLog.view')
  @ApiOperation({ summary: '导出登录日志 CSV（带筛选，最多 10000 行）' })
  async exportCsv(
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('phone') phone?: string,
    @Query('ip') ip?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.service.exportCsv({
      userId, phone, ip, status, from, to,
    });
    const filename = `login-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get(':id')
  @RequirePermission('loginLog.view')
  @ApiOperation({ summary: '登录日志详情' })
  async findOne(@Param('id') id: string) {
    const r = await this.service.findOne(id);
    if (!r) return { error: 'not found' };
    return r;
  }
}