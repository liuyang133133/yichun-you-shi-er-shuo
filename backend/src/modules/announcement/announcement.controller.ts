import { Controller, Get } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  /** GET /api/v1/announcements/active — 公开,前端 banner 用 */
  @Public()
  @Get('active')
  findActive() {
    return this.service.findActive();
  }
}
