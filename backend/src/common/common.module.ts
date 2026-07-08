import { Global, Module } from '@nestjs/common';
import { SensitiveWordService } from './filters/sensitive-word.filter';
import { RedisModule } from '../redis/redis.module';

/**
 * 全局通用模块
 * - SensitiveWordService: 敏感词过滤(全局 @Global, 所有业务模块可注入)
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [SensitiveWordService],
  exports: [SensitiveWordService],
})
export class CommonModule {}
