import { Module } from '@nestjs/common';
import { TagController, AdminTagController } from './tag.controller';
import { TagService } from './tag.service';
// [P0-AUDIT-2026-07-14] P0-1: AdminTagController 之前没接 AdminGuard,
// 任何登录用户都能调 /admin/tags 增删改. 修复: 注入 AdminGuard.
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule], // 注入 AdminGuard (AdminModule.providers + exports)
  controllers: [TagController, AdminTagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}