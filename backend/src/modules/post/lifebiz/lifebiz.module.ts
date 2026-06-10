import { Module } from '@nestjs/common';
import { LifebizController } from './lifebiz.controller';
import { LifebizService } from './lifebiz.service';

@Module({
  controllers: [LifebizController],
  providers: [LifebizService],
  exports: [LifebizService],
})
export class LifebizModule {}
