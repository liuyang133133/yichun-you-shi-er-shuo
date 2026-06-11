import { Module } from '@nestjs/common';
import { AnnouncementController } from './announcement.controller';
import { AdminAnnouncementController } from './admin-announcement.controller';
import { AnnouncementService } from './announcement.service';

@Module({
  controllers: [AnnouncementController, AdminAnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
