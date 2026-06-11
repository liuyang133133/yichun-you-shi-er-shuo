import {
  Controller, Get, Put, Delete,
  Body, Param, Query, HttpCode,
} from '@nestjs/common';
import { ResumeService } from './resume.service';
import { UpsertResumeDto } from './dto/upsert-resume.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Public()
  @Get()
  findPublic(
    @Query('keyword') keyword?: string,
    @Query('expectedPosition') expectedPosition?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.resumeService.findPublic({
      keyword,
      expectedPosition,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resumeService.findOnePublic(BigInt(id));
  }

  @Get('me')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.resumeService.findMine(BigInt(user.sub));
  }

  @Put('me')
  upsert(@CurrentUser() user: JwtPayload, @Body() dto: UpsertResumeDto) {
    return this.resumeService.upsert(BigInt(user.sub), dto);
  }

  @HttpCode(200)
  @Delete('me')
  remove(@CurrentUser() user: JwtPayload) {
    return this.resumeService.remove(BigInt(user.sub));
  }
}
