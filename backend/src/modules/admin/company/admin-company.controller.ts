import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminCompanyService } from './admin-company.service';
import { FilterCompanyDto } from './dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

/**
 * T-003: 3 个新权限码 company.{view,verify,unverify}
 * 默认仅 super_admin 可访问（其他角色待 T-041 商家入驻时再细化）
 *
 * T-021: 加 2 个权限码 company.delete + company.restore + 软删 / 恢复端点
 *        findAll 改用 FilterCompanyDto（加 includeDeleted 字段）
 */
@ApiTags('admin-companies')
@ApiBearerAuth('JWT')
@Controller('admin/companies')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminCompanyController {
  constructor(private readonly adminCompanyService: AdminCompanyService) {}

  @Get()
  @RequirePermission('company.view')
  @ApiOperation({ summary: '公司列表（admin）' })
  findAll(@Query() query: FilterCompanyDto) {
    return this.adminCompanyService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('company.view')
  @ApiOperation({ summary: '公司详情（admin）' })
  findOne(@Param('id') id: string) {
    return this.adminCompanyService.findOne(BigInt(id));
  }

  @Post(':id/verify')
  @RequirePermission('company.verify')
  @ApiOperation({ summary: '认证公司' })
  verify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.adminCompanyService.verify(BigInt(user.sub), BigInt(id));
  }

  @Post(':id/unverify')
  @RequirePermission('company.unverify')
  @ApiOperation({ summary: '取消公司认证' })
  unverify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.adminCompanyService.unverify(BigInt(user.sub), BigInt(id));
  }

  /** T-021: 软删除公司（与 T-001 软删规范一致） */
  @Delete(':id')
  @RequirePermission('company.delete')
  @ApiOperation({ summary: '软删除公司' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.adminCompanyService.remove(BigInt(user.sub), BigInt(id));
  }

  /** T-021: 恢复已软删公司 */
  @Post(':id/restore')
  @RequirePermission('company.restore')
  @ApiOperation({ summary: '恢复已软删公司' })
  restore(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.adminCompanyService.restore(BigInt(user.sub), BigInt(id));
  }
}