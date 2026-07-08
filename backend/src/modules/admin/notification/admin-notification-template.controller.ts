/**
 * T-009: 通知模板管理 Controller
 *
 * V1.1: 应用 class-validator DTO (admin-notification-template.dto.ts)
 * 替换 4 个 raw @Body() body: {...} 端点, 避免超长 body / 字段溢出 → 500
 */
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminNotificationTemplateService } from './admin-notification-template.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import {
  AdminNotificationTemplateCreateDto,
  AdminNotificationTemplateUpdateDto,
  AdminNotificationTemplatePreviewDto,
  AdminNotificationBroadcastDto,
} from './dto/admin-notification-template.dto';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@Controller('admin/notifications')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminNotificationTemplateController {
  constructor(private readonly service: AdminNotificationTemplateService) {}

  @Get('templates')
  @RequirePermission('notification.view')
  @ApiOperation({ summary: '通知模板列表' })
  findAll(
    @Query('event') event?: string,
    @Query('channel') channel?: string,
    @Query('enabled') enabled?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAll({
      event,
      channel,
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
      includeDeleted: includeDeleted === 'true',
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('templates/:id')
  @RequirePermission('notification.view')
  @ApiOperation({ summary: '通知模板详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('templates')
  @RequirePermission('notification.create')
  @ApiOperation({ summary: '创建通知模板' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: AdminNotificationTemplateCreateDto,
  ) {
    return this.service.create(BigInt(user.sub), body);
  }

  @Patch('templates/:id')
  @RequirePermission('notification.update')
  @ApiOperation({ summary: '更新通知模板' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: AdminNotificationTemplateUpdateDto,
  ) {
    return this.service.update(BigInt(user.sub), id, body);
  }

  @Delete('templates/:id')
  @RequirePermission('notification.delete')
  @ApiOperation({ summary: '软删通知模板' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(BigInt(user.sub), id);
  }

  @Post('templates/:id/toggle')
  @RequirePermission('notification.update')
  @ApiOperation({ summary: '切换启用/停用' })
  toggle(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.toggle(BigInt(user.sub), id);
  }

  @Post('templates/:id/preview')
  @RequirePermission('notification.view')
  @ApiOperation({ summary: '预览模板（替换变量）' })
  preview(
    @Param('id') id: string,
    @Body() body: AdminNotificationTemplatePreviewDto,
  ) {
    return this.service.preview(id, body);
  }

  @Post('broadcast')
  @RequirePermission('notification.broadcast')
  @ApiOperation({ summary: '群发通知（按 event + 角色筛选）' })
  broadcast(
    @CurrentUser() user: JwtPayload,
    @Body() body: AdminNotificationBroadcastDto,
  ) {
    return this.service.broadcast(BigInt(user.sub), body);
  }
}