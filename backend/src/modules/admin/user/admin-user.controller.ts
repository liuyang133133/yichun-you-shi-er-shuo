import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';

@Controller('admin/users')
@UseGuards(AdminGuard)
@Roles('admin')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
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
  ban(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.adminUserService.ban(BigInt(user.sub), BigInt(id), body.reason);
  }

  @Post(':id/unban')
  unban(@Param('id') id: string) {
    return this.adminUserService.unban(BigInt(id));
  }
}
