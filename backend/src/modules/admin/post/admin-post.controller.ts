import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AdminPostService } from './admin-post.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';

@Controller('admin/posts')
@UseGuards(AdminGuard)
@Roles('admin')
export class AdminPostController {
  constructor(private readonly adminPostService: AdminPostService) {}

  /**
   * GET /api/v1/admin/posts
   * 帖子列表（带审核状态过滤）
   *  query: auditStatus, type, page, pageSize
   */
  @Get()
  findAll(
    @Query('auditStatus') auditStatus?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminPostService.findAll({
      auditStatus,
      type,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  /**
   * POST /api/v1/admin/posts/:id/audit
   * 审核通过
   * body: { reason?: string }
   */
  @Post(':id/audit')
  audit(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { action: 'pass' | 'reject'; reason?: string },
  ) {
    if (body.action === 'pass') {
      return this.adminPostService.pass(BigInt(user.sub), BigInt(id), body.reason);
    } else if (body.action === 'reject') {
      return this.adminPostService.reject(BigInt(user.sub), BigInt(id), body.reason || '');
    }
    return { error: 'action 必须是 pass 或 reject' };
  }

  /**
   * POST /api/v1/admin/posts/:id/offline
   * 强制下架
   * body: { reason: string }
   */
  @Post(':id/offline')
  offline(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.adminPostService.offline(BigInt(user.sub), BigInt(id), body.reason);
  }
}
