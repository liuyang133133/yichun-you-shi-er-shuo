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
import { HouseService } from './house.service';
import { CreatePostHouseDto } from './create-post-house.dto';
import { FilterHouseDto } from './filter-house.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller()
export class HouseController {
  constructor(private readonly houseService: HouseService) {}

  /**
   * GET /api/v1/houses
   * 房屋特色筛选（公开，专为房屋列表设计）
   * 支持：rentalType / propertyType / decoration / rooms / areaId / price / keyword / sort
   */
  @Public()
  @Get('houses')
  filter(@Query() query: FilterHouseDto) {
    return this.houseService.filterHouses(query);
  }

  /**
   * POST /api/v1/posts/:id/house
   * 添加房屋详情（需登录 + 是 post 作者 + post.type=house）
   */
  @HttpCode(201)
  @Post('posts/:id/house')
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreatePostHouseDto,
  ) {
    return this.houseService.create(BigInt(user.sub), BigInt(id), dto);
  }

  /**
   * PATCH /api/v1/posts/:id/house
   * 更新房屋详情
   */
  @Patch('posts/:id/house')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePostHouseDto>,
  ) {
    return this.houseService.update(BigInt(user.sub), BigInt(id), dto);
  }

  /**
   * DELETE /api/v1/posts/:id/house
   * 删除房屋详情
   */
  @Delete('posts/:id/house')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.houseService.remove(BigInt(user.sub), BigInt(id));
  }
}
