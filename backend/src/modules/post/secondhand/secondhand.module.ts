import { Module } from '@nestjs/common';
import { SecondhandController } from './secondhand.controller';
import { SecondhandService } from './secondhand.service';

@Module({
  controllers: [SecondhandController],
  providers: [SecondhandService],
  exports: [SecondhandService],
})
export class SecondhandModule {}
