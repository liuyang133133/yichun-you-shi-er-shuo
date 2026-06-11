import { Module } from '@nestjs/common';
import { ViewLogService } from './view-log.service';

@Module({
  providers: [ViewLogService],
  exports: [ViewLogService],
})
export class ViewLogModule {}
