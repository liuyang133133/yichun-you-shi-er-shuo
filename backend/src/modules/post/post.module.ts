import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostBoostController } from './post-boost.controller';
import { PostBoostService } from './post-boost.service';
import { HouseModule } from './house/house.module';
import { SecondhandModule } from './secondhand/secondhand.module';
import { LifebizModule } from './lifebiz/lifebiz.module';
import { JobModule } from './job/job.module';
import { ViewLogModule } from '../view-log/view-log.module';
// SHOULD-9: 新用户 24h 内仅能 POST 1 条 post（导入 AuthModule 取 CaptchaModule）
import { AuthModule } from '../auth/auth.module';
// T-27: 发布后自动 AI (score + seo 异步)
import { AiModule } from '../ai/ai.module';
import { SeoModule } from '../seo/seo.module';
// T-013: 标签系统（PostService.create/update 同步 PostTag）
import { TagModule } from '../tag/tag.module';
// [T-024-q 2026-07-16] 代发 SMS 验证码
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    HouseModule,
    SecondhandModule,
    LifebizModule,
    JobModule,
    ViewLogModule,
    AuthModule, // 注入 CaptchaModule（含 RegisterThrottleService）
    // T-27: 发布后自动 AI (score + seo 异步)
    AiModule,
    SeoModule,
    TagModule, // T-013: 注入 TagService.attachToPost/detachFromPost
    SmsModule, // [T-024-q] 代发场景需要 smsService.verifyCode
  ],
  controllers: [PostController, PostBoostController],
  providers: [PostService, PostBoostService],
  exports: [PostService],
})
export class PostModule {}
