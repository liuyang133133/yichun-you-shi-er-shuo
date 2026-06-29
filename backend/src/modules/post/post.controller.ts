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
import { ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PostService } from './post.service';
import { SeoService } from '../seo/seo.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostQueryDto, ChangeStatusDto } from './dto/list-post.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('posts')
@ApiBearerAuth('JWT')
@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly seoService: SeoService,
  ) {}

  /**
   * POST /api/v1/posts
   * 创建信息（需登录）
   */
  @Post()
  @ApiOperation({ summary: '发布信息' })
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
  @ApiOperation({ summary: '信息列表（公开）' })
  findAll(@Query() query: ListPostQueryDto) {
    return this.postService.findAll(query);
  }

  /**
   * GET /api/v1/posts/count
   */
  @Public()
  @Get('count')
  @ApiOperation({ summary: '信息总数' })
  count(@Query('type') type?: string) {
    return this.postService.count(type);
  }

  /**
   * GET /api/v1/posts/me
   * 我的发布（需登录）
   */
  @Get('me')
  @ApiOperation({ summary: '我的发布列表' })
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
   * GET /api/v1/posts/:id/contact (T-P1-02)
   * 获取联系方式(已登录 + 个保法合规)
   * F-4 教训:字面量路由必须在 :id 之前,否则 :id 会吞掉 '123/contact' 抛 BigInt 错
   */
  @Get(':id/contact')
  @ApiOperation({ summary: '获取联系方式(已登录,个保法)' })
  async getContact(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.postService.getContact(BigInt(id), BigInt(user.sub));
  }

  /**
   * F-3: GET /api/v1/posts/:id/breadcrumb
   * 面包屑数据（公开）
   */
  @Public()
  @Get(':id/breadcrumb')
  @ApiOperation({ summary: '面包屑数据 (公开)' })
  async getBreadcrumb(@Param('id', ParseIntPipe) id: number) {
    return this.postService.getBreadcrumb(BigInt(id));
  }

  /**
   * F-3: GET /api/v1/posts/:id/related?limit=5
   * 相关推荐（公开，默认 5 条）
   */
  @Public()
  @Get(':id/related')
  @ApiOperation({ summary: '相关推荐 (公开)' })
  async getRelated(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    return this.postService.getRelated(BigInt(id), limit ? parseInt(limit, 10) : 5);
  }

  /**
   * GET /api/v1/posts/sitemap-data
   * SEO sitemap 数据 — 必须在 :id 之前注册, 否则会被 :id 当成 id 解析为 BigInt 失败
   */
  @Public()
  @Get('sitemap-data')
  @ApiOperation({ summary: 'SEO sitemap 数据 (公开)' })
  async getSitemapData(@Query('limit') limit = '50000') {
    return this.seoService.getSitemapData(parseInt(limit));
  }

  /**
   * GET /api/v1/posts/:id
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: '信息详情（自动 +1 浏览）' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '';
    return this.postService.findOne(BigInt(id), {
      userId: user?.sub ? BigInt(user.sub) : undefined,
      ip: rawIp.slice(0, 45),
      userAgent: ((req.headers['user-agent'] as string) || '').slice(0, 500),
    });
  }

  /**
   * PATCH /api/v1/posts/:id
   * 编辑（需登录 + 是作者）
   */
  @Patch(':id')
  @ApiOperation({ summary: '编辑信息' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.update(BigInt(user.sub), BigInt(id), dto);
  }

  /**
   * POST /api/v1/posts/:id/status
   * 切换状态（在售/已售/过期），需登录 + 是作者
   */
  @Post(':id/status')
  @ApiOperation({ summary: '切换信息状态' })
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.postService.changeStatus(BigInt(user.sub), BigInt(id), dto.status);
  }

  /**
   * DELETE /api/v1/posts/:id
   * 软删除（需登录 + 是作者）
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除信息（软删）' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.postService.remove(BigInt(user.sub), BigInt(id));
  }
}
