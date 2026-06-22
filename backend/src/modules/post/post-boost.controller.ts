import { Controller, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostBoostService } from './post-boost.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostBoostController {
  constructor(private readonly service: PostBoostService) {}

  @Post(':id/boost')
  async boost(@Req() req: any, @Param('id') id: string, @Body() body: { days: number; paymentToken: string }) {
    const userId = BigInt(req.user.id);
    return this.service.boost(userId, BigInt(id), body.days, body.paymentToken);
  }
}