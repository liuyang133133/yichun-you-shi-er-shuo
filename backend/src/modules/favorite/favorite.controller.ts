import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  /**
   * GET /api/v1/favorites
   * 我的收藏（分页）
   * query: type=house|secondhand|job|lifebiz, page, pageSize
   */
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.favoriteService.findMyFavorites(BigInt(user.sub), {
      type,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  /**
   * GET /api/v1/favorites/count
   * 我的收藏总数（首页红点用）
   */
  @Get('count')
  async count(@CurrentUser() user: JwtPayload) {
    return this.favoriteService.countMyFavorites(BigInt(user.sub));
  }

  /**
   * POST /api/v1/favorites
   * 添加收藏
   * body: { postId: 123 }
   */
  @Post()
  add(@CurrentUser() user: JwtPayload, @Body() dto: CreateFavoriteDto) {
    return this.favoriteService.add(BigInt(user.sub), BigInt(dto.postId));
  }

  /**
   * DELETE /api/v1/favorites/:postId
   * 取消收藏
   */
  @Delete(':postId')
  remove(@CurrentUser() user: JwtPayload, @Param('postId') postId: string) {
    return this.favoriteService.remove(BigInt(user.sub), BigInt(postId));
  }
}
