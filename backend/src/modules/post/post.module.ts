import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { HouseModule } from './house/house.module';
import { SecondhandModule } from './secondhand/secondhand.module';
import { LifebizModule } from './lifebiz/lifebiz.module';
import { JobModule } from './job/job.module';
import { ViewLogModule } from '../view-log/view-log.module';
// SHOULD-9: 新用户 24h 内仅能 POST 1 条 post（导入 AuthModule 取 CaptchaModule）
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    HouseModule,
    SecondhandModule,
    LifebizModule,
    JobModule,
    ViewLogModule,
    AuthModule, // 注入 CaptchaModule（含 RegisterThrottleService）
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
