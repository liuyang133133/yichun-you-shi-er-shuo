import { Controller, Get, Query } from '@nestjs/common';
import { SearchService, type SearchType } from './search.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/v1/search?q=xxx&type=house&areaId=1&page=1
   * 全文搜索（公开）
   */
  @Public()
  @Get()
  search(
    @Query('q') q: string,
    @Query('type') type?: SearchType,
    @Query('areaId') areaId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.searchService.search({
      q,
      type,
      areaId: areaId ? Number(areaId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /**
   * GET /api/v1/search/hot
   * 热门搜索词
   */
  @Public()
  @Get('hot')
  hot(@Query('limit') limit?: string) {
    return this.searchService.hotKeywords(limit ? Number(limit) : 10);
  }
}
