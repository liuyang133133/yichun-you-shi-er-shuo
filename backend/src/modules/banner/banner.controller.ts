import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BannerService } from './banner.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/create-banner.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('banners')
@ApiBearerAuth('JWT')
@Controller()
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  /**
   * GET /api/v1/banners/active?position=home_top
   * 公开：获取生效中的 banner 列表
   */
  @Public()
  @Get('banners/active')
  @ApiOperation({ summary: '获取生效中的 banner（公开）' })
  active(@Query('position') position?: string) {
    return this.bannerService.findActive(position);
  }

  /**
   * GET /api/v1/admin/banners
   * admin：分页
   */
  @Get('admin/banners')
  @Roles('admin')
  @ApiOperation({ summary: 'Banner 列表（admin）' })
  findAll(
    @Query('position') position?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.bannerService.findAll({
      position,
      status: status !== undefined ? Number(status) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('admin/banners')
  @Roles('admin')
  @ApiOperation({ summary: '创建 Banner（admin）' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBannerDto) {
    return this.bannerService.create(BigInt(user.sub), dto);
  }

  @Patch('admin/banners/:id')
  @Roles('admin')
  @ApiOperation({ summary: '更新 Banner（admin）' })
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannerService.update(BigInt(id), dto);
  }

  @Delete('admin/banners/:id')
  @Roles('admin')
  @ApiOperation({ summary: '删除 Banner（admin）' })
  remove(@Param('id') id: string) {
    return this.bannerService.remove(BigInt(id));
  }
}