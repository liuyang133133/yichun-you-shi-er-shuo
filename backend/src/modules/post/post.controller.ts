import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostQueryDto, ChangeStatusDto } from './dto/list-post.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  /**
   * POST /api/v1/posts
   * 创建信息（需登录）
   */
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePostDto,
  ) {
    return this.postService.create(BigInt(user.sub), dto);
  }

  /**
   * GET /api/v1/posts
   * 列表查询（公开，type 必填）
   */
  @Public()
  @Get()
  findAll(@Query() query: ListPostQueryDto) {
    return this.postService.findAll(query);
  }

  /**
   * GET /api/v1/posts/count
   */
  @Public()
  @Get('count')
  count(@Query('type') type?: string) {
    return this.postService.count(type);
  }

  /**
   * GET /api/v1/posts/me
   * 我的发布（需登录）
   */
  @Get('me')
  findMyPosts(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.postService.findMyPosts(BigInt(user.sub), {
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  /**
   * GET /api/v1/posts/:id
   */
  @Public()
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.postService.findOne(BigInt(id), {
      userId: user?.sub ? BigInt(user.sub) : undefined,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  /**
   * PATCH /api/v1/posts/:id
   * 编辑（需登录 + 是作者）
   */
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.update(BigInt(user.sub), BigInt(id), dto);
  }

  /**
   * POST /api/v1/posts/:id/status
   * 切换状态（在售/已售/过期），需登录 + 是作者
   */
  @Post(':id/status')
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.postService.changeStatus(BigInt(user.sub), BigInt(id), dto.status);
  }

  /**
   * DELETE /api/v1/posts/:id
   * 软删除（需登录 + 是作者）
   */
  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.postService.remove(BigInt(user.sub), BigInt(id));
  }
}
