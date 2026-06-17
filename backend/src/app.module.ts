import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './modules/user/user.module';
import { CategoryModule } from './modules/category/category.module';
import { PostModule } from './modules/post/post.module';
import { AuthModule } from './modules/auth/auth.module';
import { SmsModule } from './modules/sms/sms.module';
import { AreaModule } from './modules/area/area.module';
import { UploadModule } from './modules/upload/upload.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { CommentModule } from './modules/comment/comment.module';
import { ReportModule } from './modules/report/report.module';
import { CompanyModule } from './modules/company/company.module';
import { ResumeModule } from './modules/resume/resume.module';
import { ApplicationModule } from './modules/application/application.module';
import { AdminModule } from './modules/admin/admin.module';
import { SearchModule } from './modules/search/search.module';
import { MessageModule } from './modules/message/message.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CronModule } from './cron/cron.module';
import { ViewLogModule } from './modules/view-log/view-log.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { BannerModule } from './modules/banner/banner.module';
import { ClaudeClient } from './modules/ai/llm/claude.client';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    // MUST-24 全局 Throttler 限流
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },     // 10 req/sec
      { name: 'medium', ttl: 60_000, limit: 100 },  // 100 req/min
      { name: 'long', ttl: 3600_000, limit: 2000 }, // 2000 req/hour
    ]),
    // MUST-23 定时任务
    ScheduleModule.forRoot(),
    // SHOULD-41 结构化日志: 统一在此处配置 pinoHttp,
    // nestjs-pino 会自动注册 pino-http 中间件(同 reqId 共享给 Nest Logger)
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
        customLogLevel: (req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        customSuccessMessage: (req, res) =>
          `${req.method} ${req.url} ${res.statusCode}`,
        customErrorMessage: (req, res, err) =>
          `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
        serializers: {
          req: (req) => ({ id: req.id, method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      },
    }),
    PrismaModule,
    RedisModule,
    UserModule,
    CategoryModule,
    PostModule,
    AreaModule,
    UploadModule,
    FavoriteModule,
    CommentModule,
    ReportModule,
    CompanyModule,
    ResumeModule,
    ApplicationModule,
    AdminModule,
    SearchModule,
    SmsModule,
    AuthModule,
    MessageModule,
    HealthModule,
    CronModule,
    ViewLogModule,
    AnnouncementModule,
    BannerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    ClaudeClient,
  ],
  exports: [ClaudeClient],
})
export class AppModule {}
