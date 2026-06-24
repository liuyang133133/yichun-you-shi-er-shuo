import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRoleService } from './admin-role.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { CreateRoleDto, UpdateRoleDto, SetRolePermissionsDto } from '../../rbac/dto/assign-role.dto';
import { RbacService } from '../../rbac/rbac.service';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@Controller('admin/roles')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminRoleController {
  constructor(
    private readonly adminRoleService: AdminRoleService,
    private readonly rbac: RbacService,
  ) {}

  /**
   * GET /api/v1/admin/roles
   * 角色列表
   * query: page, pageSize, includeDeleted
   */
  @Get()
  @RequirePermission('role.view')
  @ApiOperation({ summary: '角色列表' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.adminRoleService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      includeDeleted: includeDeleted === 'true',
    });
  }

  /**
   * GET /api/v1/admin/roles/:id
   */
  @Get(':id')
  @RequirePermission('role.view')
  @ApiOperation({ summary: '角色详情' })
  findOne(@Param('id') id: string) {
    return this.adminRoleService.findOne(BigInt(id));
  }

  /**
   * POST /api/v1/admin/roles
   */
  @Post()
  @RequirePermission('role.create')
  @ApiOperation({ summary: '创建角色' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRoleDto,
  ) {
    return this.adminRoleService.create(BigInt(user.sub), dto);
  }

  /**
   * PATCH /api/v1/admin/roles/:id
   */
  @Patch(':id')
  @RequirePermission('role.update')
  @ApiOperation({ summary: '更新角色' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.adminRoleService.update(BigInt(user.sub), BigInt(id), dto);
  }

  /**
   * DELETE /api/v1/admin/roles/:id
   */
  @Delete(':id')
  @RequirePermission('role.delete')
  @ApiOperation({ summary: '软删角色' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.adminRoleService.remove(BigInt(user.sub), BigInt(id));
  }

  /**
   * GET /api/v1/admin/roles/:id/permissions
   * 列出角色拥有的所有权限码
   */
  @Get(':id/permissions')
  @RequirePermission('role.view')
  @ApiOperation({ summary: '角色的权限码列表' })
  async listPermissions(@Param('id') id: string) {
    const codes = await this.rbac.listRolePermissions(BigInt(id));
    return { roleId: id, permissionCodes: codes, count: codes.length };
  }

  /**
   * PUT /api/v1/admin/roles/:id/permissions
   * 全量设置角色的权限（先软删旧权限，再插入新权限）
   * body: { permissionIds: number[] }
   */
  @Put(':id/permissions')
  @RequirePermission('role.update')
  @ApiOperation({ summary: '全量设置角色权限' })
  setPermissions(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.rbac.setRolePermissions(
      BigInt(id),
      dto.permissionIds.map((n) => BigInt(n)),
      BigInt(user.sub),
    );
  }
}
