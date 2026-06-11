import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminPostService } from './admin-post.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';

@ApiTags('admin')
@ApiBearerAuth('JWT')
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
  @ApiOperation({ summary: '管理后台-帖子列表' })
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
  @ApiOperation({ summary: '审核通过/拒绝帖子' })
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
  @ApiOperation({ summary: '强制下架帖子' })
  offline(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.adminPostService.offline(BigInt(user.sub), BigInt(id), body.reason);
  }

  /**
   * POST /api/v1/admin/posts/audit-batch
   * 批量审核通过/拒绝
   * body: { ids: string[]; action: 'pass' | 'reject'; reason?: string }
   */
  @Post('audit-batch')
  @ApiOperation({ summary: '批量审核帖子(pass/reject)' })
  auditBatch(
    @CurrentUser() user: JwtPayload,
    @Body() body: { ids: string[]; action: 'pass' | 'reject'; reason?: string },
  ) {
    const ids = body.ids.map((s) => BigInt(s));
    return this.adminPostService.auditBatch(
      BigInt(user.sub),
      ids,
      body.action,
      body.reason,
    );
  }

  /**
   * POST /api/v1/admin/posts/offline-batch
   * 批量强制下架
   * body: { ids: string[]; reason: string }
   */
  @Post('offline-batch')
  @ApiOperation({ summary: '批量强制下架帖子' })
  offlineBatch(
    @CurrentUser() user: JwtPayload,
    @Body() body: { ids: string[]; reason: string },
  ) {
    const ids = body.ids.map((s) => BigInt(s));
    return this.adminPostService.offlineBatch(BigInt(user.sub), ids, body.reason);
  }

  /**
   * POST /api/v1/admin/posts/purge
   * 硬清 N 天前软删的 post(body: { daysOld?: number })
   */
  @Post('purge')
  @ApiOperation({ summary: '硬清 30 天前软删的 post' })
  purge(
    @CurrentUser() user: JwtPayload,
    @Body() body: { daysOld?: number } = {},
  ) {
    return this.adminPostService.purgeOldDeleted(BigInt(user.sub), body.daysOld ?? 30);
  }
}
