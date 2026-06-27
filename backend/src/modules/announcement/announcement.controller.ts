import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnnouncementService } from './announcement.service';
import { Public } from '../../common/decorators/public.decorator';
import { FilterAnnouncementDto } from './dto';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  /**
   * GET /api/v1/announcements/active — 公开,前端 banner 用
   * 路由顺序关键（F-4 教训）：字面量路由必须在 :id 之前，否则 /active 会被解析为 id=active
   */
  @Public()
  @Get('active')
  @ApiOperation({ summary: '当前生效公告（前端 banner）' })
  findActive() {
    return this.service.findActive();
  }

  /**
   * T-017: GET /api/v1/announcements — 公开分页公告列表（仅生效中）
   * 用于前端 /announcements 公开页
   */
  @Public()
  @Get()
  @ApiOperation({ summary: '公开公告列表（仅生效中）' })
  findList(@Query() query: FilterAnnouncementDto) {
    return this.service.findList(query);
  }

  /**
   * T-017: GET /api/v1/announcements/:id — 公开公告详情
   * 不命中（status=0 / 已删 / 时间窗外 / 不存在）统一 404
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: '公开公告详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(BigInt(id));
  }
}
