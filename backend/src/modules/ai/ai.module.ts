import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ClaudeClient } from './llm/claude.client';
import { GlmClient } from './llm/glm.client';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AiController],
  providers: [ClaudeClient, GlmClient, AiService],
  exports: [AiService],
})
export class AiModule {}
