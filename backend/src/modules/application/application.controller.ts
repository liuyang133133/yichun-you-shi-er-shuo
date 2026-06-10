import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get('me')
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.applicationService.findMyApplications(BigInt(user.sub), status);
  }

  @Get('post-job/:id')
  findByPostJob(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.applicationService.findByPostJob(BigInt(user.sub), BigInt(id));
  }

  @Post()
  apply(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationService.apply(BigInt(user.sub), BigInt(dto.postJobId), dto.coverLetter);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { status: '已查看' | '已回复' },
  ) {
    return this.applicationService.updateStatus(BigInt(user.sub), BigInt(id), body.status);
  }
}
