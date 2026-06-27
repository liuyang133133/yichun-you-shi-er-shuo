import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BannerService } from './banner.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('banners')
@Controller()
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  /**
   * GET /api/v1/banners/active?position=home_top
   * 公开：当前生效中的 banner 列表
   */
  @Public()
  @Get('banners/active')
  @ApiOperation({ summary: '获取生效中的 banner（公开）' })
  active(@Query('position') position?: string) {
    return this.bannerService.findActive(position);
  }
}
