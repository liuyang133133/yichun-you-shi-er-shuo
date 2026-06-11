import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AreaService } from './area.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('areas')
@Controller('areas')
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  /**
   * GET /api/v1/areas
   * 返回完整区域树（伊春市 + 区县 + 街道）
   * 默认只返回前 2 级（市 + 区县），前端按需懒加载街道
   *
   * Query:
   *   - tree=true: 返回完整 3 级
   *   - level=1|2|3: 按层级过滤
   *   - parentId=N: 列指定 parent 的子区域
   */
  @Public()
  @Get()
  @ApiOperation({ summary: '区域列表/树（支持 level/parentId/tree 过滤）' })
  async list(
    @Query('tree') tree?: string,
    @Query('level') level?: string,
    @Query('parentId') parentId?: string,
  ) {
    if (level) {
      return this.areaService.findByLevel(parseInt(level, 10));
    }
    if (parentId) {
      return this.areaService.findChildren(BigInt(parentId));
    }
    if (tree === 'true') {
      return this.areaService.findTree();
    }
    // 默认：返回 2 级（市+区县）
    return this.areaService.findTree();
  }

  /**
   * GET /api/v1/areas/count
   */
  @Public()
  @Get('count')
  @ApiOperation({ summary: '区域总数' })
  async count() {
    return this.areaService.count();
  }

  /**
   * GET /api/v1/areas/:id
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: '区域详情' })
  async one(@Param('id') id: string) {
    return this.areaService.findOne(BigInt(id));
  }
}
