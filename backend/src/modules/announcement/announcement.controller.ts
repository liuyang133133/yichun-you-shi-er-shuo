import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnnouncementService } from './announcement.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  /** GET /api/v1/announcements/active — 公开,前端 banner 用 */
  @Public()
  @Get('active')
  @ApiOperation({ summary: '当前生效公告（前端 banner）' })
  findActive() {
    return this.service.findActive();
  }
}
