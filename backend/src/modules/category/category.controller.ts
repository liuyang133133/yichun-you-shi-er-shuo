import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('categories')
@ApiBearerAuth('JWT')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

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

  @Patch(':id')
  @ApiOperation({ summary: '更新分类' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoryService.update(BigInt(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除分类' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(BigInt(id));
  }
}
