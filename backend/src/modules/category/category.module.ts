import { Module, forwardRef } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
// [P0-AUDIT-2026-07-14] P0-2: 注入 AdminGuard (AdminModule 已 exports: [AdminGuard]).
// 注意: AdminModule 也 imports: [CategoryModule], 双向依赖, 必须 forwardRef.
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [forwardRef(() => AdminModule)], // 双向依赖, 需 forwardRef
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
