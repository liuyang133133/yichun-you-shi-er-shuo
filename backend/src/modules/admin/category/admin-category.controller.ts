import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from '../../category/category.service';
import { CreateCategoryDto } from '../../category/dto/create-category.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';

/**
 * 管理后台的分类管理
 * 复用 CategoryService，路由加 /admin 前缀 + AdminGuard
 */
@Controller('admin/categories')
@UseGuards(AdminGuard)
@Roles('admin')
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  list(@Query('code') code?: string) {
    return this.categoryService.findAll(code);
  }

  @Get('tree')
  tree(@Query('code') code?: string) {
    return this.categoryService.findTree(code);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoryService.update(BigInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(BigInt(id));
  }
}
