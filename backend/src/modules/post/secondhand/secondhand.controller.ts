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
import { SecondhandService } from './secondhand.service';
import { CreatePostSecondhandDto } from './create-post-secondhand.dto';
import { FilterSecondhandDto } from './filter-secondhand.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller()
export class SecondhandController {
  constructor(private readonly secondhandService: SecondhandService) {}

  @Public()
  @Get('secondhands')
  filter(@Query() query: FilterSecondhandDto) {
    return this.secondhandService.filterSecondhands(query);
  }

  @HttpCode(201)
  @Post('posts/:id/secondhand')
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreatePostSecondhandDto,
  ) {
    return this.secondhandService.create(BigInt(user.sub), BigInt(id), dto);
  }

  @Patch('posts/:id/secondhand')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePostSecondhandDto>,
  ) {
    return this.secondhandService.update(BigInt(user.sub), BigInt(id), dto);
  }

  @Delete('posts/:id/secondhand')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.secondhandService.remove(BigInt(user.sub), BigInt(id));
  }
}
