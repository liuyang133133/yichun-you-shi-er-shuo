import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Prisma 已连接 MySQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('❌ Prisma 已断开 MySQL');
  }

  /**
   * 清空数据库（仅用于测试）
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境禁止清空数据库');
    }
    // 按依赖顺序删除
    await this.post.deleteMany();
    await this.category.deleteMany();
    await this.user.deleteMany();
  }
}
