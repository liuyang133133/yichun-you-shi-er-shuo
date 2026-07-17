import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('comments')
@ApiBearerAuth('JWT')
@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  /**
   * GET /api/v1/posts/:postId/comments
   * 帖子留言列表（公开）
   */
  @Public()
  @Get('posts/:postId/comments')
  @ApiOperation({ summary: '帖子留言列表（公开）' })
  findByPost(
    @Param('postId') postId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.commentService.findByPost(BigInt(postId), {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  /**
   * POST /api/v1/posts/:postId/comments
   * 发留言（需登录）
   */
  @HttpCode(201)
  @Post('posts/:postId/comments')
  @ApiOperation({ summary: '发留言' })
  create(
    @CurrentUser() user: JwtPayload,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(
      BigInt(user.sub),
      BigInt(postId),
      dto.content,
      dto.parentId ? BigInt(dto.parentId) : undefined,
    );
  }

  /**
   * DELETE /api/v1/comments/:id
   * 删留言（自己/帖子作者）
   */
  @Delete('comments/:id')
  @ApiOperation({ summary: '删留言（自己/帖子作者）' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.commentService.remove(BigInt(user.sub), BigInt(id));
  }

  /**
   * [T-024-m 2026-07-16] GET /api/v1/comments/me
   * 我的留言收件箱: 我作为帖子主人收到的所有留言
   * (语义跟 /posts/me/stats.commentsCount 同步, 个人中心 "留言" tab 用)
   */
  @Get('comments/me')
  @ApiOperation({ summary: '我收到的留言（个人中心留言列表）' })
  findReceivedByMe(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.commentService.findReceivedByMe(BigInt(user.sub), {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
