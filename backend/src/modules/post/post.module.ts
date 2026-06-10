import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { HouseModule } from './house/house.module';
import { SecondhandModule } from './secondhand/secondhand.module';
import { LifebizModule } from './lifebiz/lifebiz.module';
import { JobModule } from './job/job.module';

@Module({
  imports: [HouseModule, SecondhandModule, LifebizModule, JobModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
