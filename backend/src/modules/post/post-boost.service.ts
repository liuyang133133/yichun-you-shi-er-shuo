import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PostBoostService {
  constructor(private readonly prisma: PrismaService) {}

  async boost(userId: bigint, postId: bigint, days: number, paymentToken: string) {
    // TODO: Phase 1.5 商业化模块联调
    // 临时: 直接 throw "功能即将上线"
    throw new HttpException(
      { code: 'BOOST_NOT_READY', message: '加急置顶功能即将上线, 请期待' },
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    /* 联调后实现:
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new HttpException('帖子不存在', HttpStatus.NOT_FOUND);
    if (post.userId !== userId) throw new HttpException('无权操作', HttpStatus.FORBIDDEN);
    if (post.qualityScore && post.qualityScore < 50) {
      throw new HttpException({ code: 'QUALITY_TOO_LOW', message: '帖子质量分需 ≥ 50 才能置顶' }, HttpStatus.BAD_REQUEST);
    }
    // ... 调支付模块校验 paymentToken, 写 boostExpiresAt
    */
  }
}