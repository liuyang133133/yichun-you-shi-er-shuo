import { Module } from '@nestjs/common';
import { TagController, AdminTagController } from './tag.controller';
import { TagService } from './tag.service';

@Module({
  controllers: [TagController, AdminTagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}