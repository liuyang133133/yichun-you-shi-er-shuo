import { Module } from '@nestjs/common';
import { BannerController } from './banner.controller';
import { AdminBannerController } from './admin-banner.controller';
import { BannerService } from './banner.service';
import { AdminModule } from '../admin/admin.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AdminModule, RbacModule],
  controllers: [BannerController, AdminBannerController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
