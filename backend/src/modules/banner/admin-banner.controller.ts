import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BannerService } from './banner.service';
import { CreateBannerDto, UpdateBannerDto, FilterBannerDto } from './dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../admin/guards/admin-auth.guard';
import { PermissionGuard } from '../rbac/guards/permission.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

/**
 * T-020: Banner admin 端点（与 announcement admin 端点同款模式）
 * - banner.view (GET)
 * - banner.create / banner.update / banner.delete
 * - banner.restore (POST :id/restore)
 *
 * 路由路径保持与改造前完全一致：
 * @Controller('admin/banners') + 全局 main.ts /api/v1 前缀
 *   = /api/v1/admin/banners/*（完全等价 T-016 改造前）
 */
@ApiTags('admin-banners')
@ApiBearerAuth('JWT')
@Controller('admin/banners')
@UseGuards(AdminGuard, PermissionGuard)
export class AdminBannerController {
  constructor(private readonly service: BannerService) {}

  @Get()
  @RequirePermission('banner.view')
  @ApiOperation({ summary: 'Banner 列表（admin）' })
  findAll(@Query() query: FilterBannerDto) {
    return this.service.findAll(query);
  }

  @Post()
  @RequirePermission('banner.create')
  @ApiOperation({ summary: '创建 Banner（admin）' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBannerDto) {
    return this.service.create(BigInt(user.sub), dto);
  }

  @Patch(':id')
  @RequirePermission('banner.update')
  @ApiOperation({ summary: '更新 Banner（admin）' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.service.update(BigInt(user.sub), BigInt(id), dto);
  }

  @Delete(':id')
  @RequirePermission('banner.delete')
  @ApiOperation({ summary: '软删除 Banner（admin）' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(BigInt(user.sub), BigInt(id));
  }

  /** T-020: 恢复已软删 Banner */
  @Post(':id/restore')
  @RequirePermission('banner.restore')
  @ApiOperation({ summary: '恢复已软删 Banner' })
  restore(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.restore(BigInt(user.sub), BigInt(id));
  }
}
