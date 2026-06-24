import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminUserService } from './admin-user.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { AssignRoleDto } from '../../rbac/dto/assign-role.dto';

@ApiTags('admin')
@Controller('admin/users')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminUserController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly rbac: RbacService,
  ) {}

  @Get()
  @RequirePermission('user.view')
  findAll(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminUserService.findAll({
      keyword,
      status: status !== undefined ? parseInt(status, 10) : undefined,
      role,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post(':id/ban')
  @RequirePermission('user.ban')
  ban(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.adminUserService.ban(BigInt(user.sub), BigInt(id), body.reason);
  }

  @Post(':id/unban')
  @RequirePermission('user.unban')
  unban(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.adminUserService.unban(BigInt(user.sub), BigInt(id));
  }

  /**
   * T-002: 列出用户的所有角色
   * GET /api/v1/admin/users/:id/roles
   */
  @Get(':id/roles')
  @RequirePermission('user.viewRoles')
  @ApiOperation({ summary: '用户的角色列表' })
  async listUserRoles(@Param('id') id: string) {
    const userRoles = await this.rbac.listUserRoles(BigInt(id));
    return {
      userId: id,
      roles: userRoles.map((ur) => ({
        userRoleId: ur.id.toString(),
        roleId: ur.roleId.toString(),
        code: ur.role.code,
        name: ur.role.name,
        grantedBy: ur.grantedBy?.toString() ?? null,
        expiresAt: ur.expiresAt,
        createdAt: ur.createdAt,
      })),
      count: userRoles.length,
    };
  }

  /**
   * T-002: 给用户分配角色
   * POST /api/v1/admin/users/:id/roles
   * body: { roleId, expiresAt? }
   */
  @Post(':id/roles')
  @RequirePermission('user.assignRole')
  @ApiOperation({ summary: '给用户分配角色' })
  assignRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.rbac.assignRole(
      BigInt(id),
      BigInt(dto.roleId),
      BigInt(user.sub),
      dto.expiresAt ? new Date(dto.expiresAt) : null,
    );
  }

  /**
   * T-002: 撤销用户的角色
   * DELETE /api/v1/admin/users/:id/roles/:roleId
   */
  @Delete(':id/roles/:roleId')
  @RequirePermission('user.assignRole')
  @ApiOperation({ summary: '撤销用户的角色' })
  revokeRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rbac.revokeRole(BigInt(id), BigInt(roleId), BigInt(user.sub));
  }
}
