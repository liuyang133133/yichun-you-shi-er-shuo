import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, FilterAnnouncementDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../admin/guards/admin-auth.guard';

@Controller('admin/announcements')
@UseGuards(AdminGuard)
@Roles('admin')
export class AdminAnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  findAll(@Query() query: FilterAnnouncementDto) {
    return this.service.findAll(query);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAnnouncementDto) {
    return this.service.create(BigInt(user.sub), dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.service.update(BigInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(BigInt(id));
  }
}
