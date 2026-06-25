import { Module } from '@nestjs/common';
import { AnnouncementController } from './announcement.controller';
import { AdminAnnouncementController } from './admin-announcement.controller';
import { AnnouncementService } from './announcement.service';
import { AdminModule } from '../admin/admin.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AdminModule, RbacModule],
  controllers: [AnnouncementController, AdminAnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}