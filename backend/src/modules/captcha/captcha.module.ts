import { Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { RegisterThrottleService } from './register-throttle.service';
import { RedisModule } from '../../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [RedisModule, PrismaModule],
  providers: [CaptchaService, RegisterThrottleService],
  exports: [CaptchaService, RegisterThrottleService],
})
export class CaptchaModule {}
