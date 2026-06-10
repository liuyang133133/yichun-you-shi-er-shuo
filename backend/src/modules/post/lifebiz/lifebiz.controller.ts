import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { LifebizService } from './lifebiz.service';
import { CreatePostLifebizDto } from './create-post-lifebiz.dto';
import { FilterLifebizDto } from './filter-lifebiz.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller()
export class LifebizController {
  constructor(private readonly lifebizService: LifebizService) {}

  @Public()
  @Get('lifebizs')
  filter(@Query() query: FilterLifebizDto) {
    return this.lifebizService.filterLifebizs(query);
  }

  @HttpCode(201)
  @Post('posts/:id/lifebiz')
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreatePostLifebizDto,
  ) {
    return this.lifebizService.create(BigInt(user.sub), BigInt(id), dto);
  }

  @Patch('posts/:id/lifebiz')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePostLifebizDto>,
  ) {
    return this.lifebizService.update(BigInt(user.sub), BigInt(id), dto);
  }

  @Delete('posts/:id/lifebiz')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.lifebizService.remove(BigInt(user.sub), BigInt(id));
  }
}
