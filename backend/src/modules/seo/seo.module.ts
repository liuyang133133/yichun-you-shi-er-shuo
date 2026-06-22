import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClaudeClient } from '../ai/llm/claude.client';
import { GlmClient } from '../ai/llm/glm.client';
import { BaiduHttpClient } from './baidu-http.client';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [SeoController],
  providers: [SeoService, ClaudeClient, GlmClient, BaiduHttpClient],
  exports: [SeoService],
})
export class SeoModule {}
