import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, FilterAnnouncementDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../admin/guards/admin-auth.guard';
import { PermissionGuard } from '../rbac/guards/permission.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

/**
 * T-003: 加 @RequirePermission
 * - announcement.view (GET) - T-003 新增
 * - announcement.create / update / delete
 *
 * T-019: 加 @RequirePermission('announcement.restore')
 * - remove 改软删；新增 restore 端点
 */
@Controller('admin/announcements')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminAnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  @RequirePermission('announcement.view')
  findAll(@Query() query: FilterAnnouncementDto) {
    return this.service.findAll(query);
  }

  @Post()
  @RequirePermission('announcement.create')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAnnouncementDto) {
    return this.service.create(BigInt(user.sub), dto);
  }

  @Patch(':id')
  @RequirePermission('announcement.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.service.update(BigInt(user.sub), BigInt(id), dto);
  }

  @Delete(':id')
  @RequirePermission('announcement.delete')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(BigInt(user.sub), BigInt(id));
  }

  /** T-019: 恢复已软删公告 */
  @Post(':id/restore')
  @RequirePermission('announcement.restore')
  restore(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.restore(BigInt(user.sub), BigInt(id));
  }
}