/**
 * T-013 TagController
 *
 * 公开 API（无需鉴权）：
 *   GET /tags                 全列表（搜索）
 *   GET /tags/hot             热门标签
 *   GET /tags/:slug           单个标签详情
 *   GET /tags/:slug/posts     标签下的帖子列表
 *
 * 后台 API（admin only）：
 *   POST   /admin/tags            新建
 *   PATCH  /admin/tags/:id        更新
 *   DELETE /admin/tags/:id        软删除
 *   POST   /admin/tags/migrate-from-json  一次性数据迁移
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { Public } from '../../common/decorators/public.decorator';
import { CreateTagDto, UpdateTagDto, FindAllTagDto, FindHotTagDto } from './dto/tag.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Public()
  @Get()
  findAll(@Query() query: FindAllTagDto) {
    return this.tagService.findAll({
      q: query.q,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Public()
  @Get('hot')
  findHot(@Query() query: FindHotTagDto) {
    return this.tagService.findHot(query.limit);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.tagService.findBySlug(slug);
  }

  @Public()
  @Get(':slug/posts')
  findPosts(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.tagService
      .findBySlug(slug)
      .then(async (tag) =>
        this.tagService.findPostsByTag(tag.id, {
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
        }),
      );
  }
}

@Controller('admin/tags')
@Roles('admin')
export class AdminTagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateTagDto) {
    return this.tagService.update(BigInt(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: string) {
    await this.tagService.delete(BigInt(id));
    return { id: Number(id), deleted: true };
  }

  /** 一次性数据迁移（从 Post.tags JSON 字段迁移到 PostTag） */
  @Post('migrate-from-json')
  migrate() {
    return this.tagService.migrateFromJson();
  }
}