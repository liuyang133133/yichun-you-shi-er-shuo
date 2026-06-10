import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreatePostJobDto } from './create-post-job.dto';
import { FilterJobDto } from './filter-job.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller()
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Public()
  @Get('jobs')
  filter(@Query() query: FilterJobDto) {
    return this.jobService.filterJobs(query);
  }

  @HttpCode(201)
  @Post('posts/:id/job')
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreatePostJobDto,
  ) {
    return this.jobService.create(BigInt(user.sub), BigInt(id), dto);
  }

  @Patch('posts/:id/job')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePostJobDto>,
  ) {
    return this.jobService.update(BigInt(user.sub), BigInt(id), dto);
  }

  @Delete('posts/:id/job')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.jobService.remove(BigInt(user.sub), BigInt(id));
  }
}
