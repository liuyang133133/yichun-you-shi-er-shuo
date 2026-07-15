import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Public } from '../../common/decorators/public.decorator';
// [P0-AUDIT-2026-07-14] P0-2: /categories 的写端点 (POST/PATCH/DELETE) 之前只靠
// @ApiBearerAuth (只是 Swagger 标记, 不是真正的 guard), 任何登录用户都能调.
// Admin 走 /admin/categories (已加 AdminGuard), 用户端走 /categories 只能 GET.
// 修复: 加 UseGuards(AdminGuard) 到 POST/PATCH/DELETE, GET 保持公开.
import { AdminGuard } from '../admin/guards/admin-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('categories')
@ApiBearerAuth('JWT')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(AdminGuard)
  @Roles('admin')
  @Post()
  @ApiOperation({ summary: '创建分类' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: '分类列表' })
  findAll(@Query('code') code?: string) {
    return this.categoryService.findAll(code);
  }

  @Public()
  @Get('tree')
  @ApiOperation({ summary: '分类树（按 code 过滤）' })
  tree(@Query('code') code?: string) {
    return this.categoryService.findTree(code);
  }

  @Public()
  @Get('count')
  @ApiOperation({ summary: '分类总数' })
  count() {
    return this.categoryService.count();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '分类详情' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(BigInt(id));
  }

  @UseGuards(AdminGuard)
  @Roles('admin')
  @Patch(':id')
  @ApiOperation({ summary: '更新分类' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoryService.update(BigInt(id), dto);
  }

  @UseGuards(AdminGuard)
  @Roles('admin')
  @Delete(':id')
  @ApiOperation({ summary: '删除分类' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(BigInt(id));
  }
}
