import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from '../../category/category.service';
import { CreateCategoryDto } from '../../category/dto/create-category.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../../rbac/guards/permission.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

/**
 * 管理后台的分类管理
 * 复用 CategoryService，路由加 /admin 前缀 + AdminGuard + PermissionGuard (T-003)
 *
 * T-003: 4 个新权限码 category.{view,create,update,delete}
 */
@Controller('admin/categories')
@UseGuards(AdminGuard, PermissionGuard)
@Roles('admin')
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @RequirePermission('category.view')
  list(@Query('code') code?: string) {
    return this.categoryService.findAll(code);
  }

  @Get('tree')
  @RequirePermission('category.view')
  tree(@Query('code') code?: string) {
    return this.categoryService.findTree(code);
  }

  @Post()
  @RequirePermission('category.create')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('category.update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoryService.update(BigInt(id), dto);
  }

  @Delete(':id')
  @RequirePermission('category.delete')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(BigInt(id));
  }
}