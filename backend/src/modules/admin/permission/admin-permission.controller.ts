import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminPermissionService } from './admin-permission.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@Controller('admin/permissions')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminPermissionController {
  constructor(private readonly adminPermissionService: AdminPermissionService) {}

  /**
   * GET /api/v1/admin/permissions
   * 列出所有权限码
   * query: module?, includeDeleted?
   */
  @Get()
  @RequirePermission('permission.view')
  @ApiOperation({ summary: '权限码列表' })
  findAll(
    @Query('module') module?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.adminPermissionService.findAll({
      module,
      includeDeleted: includeDeleted === 'true',
    });
  }

  /**
   * GET /api/v1/admin/permissions/modules
   * 模块列表（用于前端分组渲染）
   */
  @Get('modules')
  @RequirePermission('permission.view')
  @ApiOperation({ summary: '权限模块列表' })
  listModules() {
    return this.adminPermissionService.listModules();
  }
}
