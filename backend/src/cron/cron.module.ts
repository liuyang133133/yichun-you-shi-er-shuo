import { Module } from '@nestjs/common';
import { ExpirePostsCron } from './expire-posts.cron';

@Module({
  providers: [ExpirePostsCron],
})
export class CronModule {}
