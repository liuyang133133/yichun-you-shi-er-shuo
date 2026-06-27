import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AdminCompanyService } from './admin-company.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

/**
 * T-003: 3 个新权限码 company.{view,verify,unverify}
 * 默认仅 super_admin 可访问（其他角色待 T-041 商家入驻时再细化）
 */
@Controller('admin/companies')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminCompanyController {
  constructor(private readonly adminCompanyService: AdminCompanyService) {}

  @Get()
  @RequirePermission('company.view')
  findAll(
    @Query('keyword') keyword?: string,
    @Query('verified') verified?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminCompanyService.findAll({
      keyword,
      verified: verified !== undefined ? parseInt(verified, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('company.view')
  findOne(@Param('id') id: string) {
    return this.adminCompanyService.findOne(BigInt(id));
  }

  @Post(':id/verify')
  @RequirePermission('company.verify')
  verify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.adminCompanyService.verify(BigInt(user.sub), BigInt(id));
  }

  @Post(':id/unverify')
  @RequirePermission('company.unverify')
  unverify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.adminCompanyService.unverify(BigInt(user.sub), BigInt(id));
  }
}