import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * T-001: 应用了软删除中间件的 Prisma 模型列表。
 *
 * 业务表（非日志/非验证码/非幂等记录）：
 *   User, Category, Post, Area, PostImage, Favorite, Comment, Report,
 *   PostHouse, PostSecondhand, PostLifebiz, Company, PostJob, Resume,
 *   JobApplication, Message, Announcement, Banner
 *
 * T-002 RBAC: 加上 Role / Permission / UserRole / RolePermission
 *
 * 不应用软删除中间件的模型：
 *   - AuditLog / LoginLog / ViewLog / AiUsageLog / SitemapPushLog
 *     写多读少的日志表，物理删除或保留期清理
 *   - SmsCode
 *     验证码有过期时间，不存在「软删除恢复」语义
 */
const SOFT_DELETE_MODELS = new Set<string>([
  'User',
  'Category',
  'Post',
  'Area',
  'PostImage',
  'Favorite',
  'Comment',
  'Report',
  'PostHouse',
  'PostSecondhand',
  'PostLifebiz',
  'Company',
  'PostJob',
  'Resume',
  'JobApplication',
  'Message',
  'Announcement',
  'Banner',
  // T-002: RBAC
  'Role',
  'Permission',
  'UserRole',
  'RolePermission',
]);

/**
 * 列表类查询（find / findMany / findFirst / findUnique / count / aggregate / groupBy）
 * 在被 PrismaClient 实际执行前，会被此中间件拦截并自动注入 `deletedAt: null`。
 *
 * 排除条件（绕过软删过滤）：
 *   1. `params.args.where.deletedAt` 已经被显式设置（业务明确要查含/不含已删除）
 *   2. `params.args.where.includeDeleted === true`（自定义标记，方便 admin 后台）
 *   3. 模型不在 SOFT_DELETE_MODELS 中
 *
 * 注意：findUnique 在 Prisma 中是「通过 unique 字段取单条」，与 where.deletedAt 复合会破坏
 * 唯一约束的语义，因此中间件会把 findUnique 改写为 findFirst（语义一致）。
 */
function isReadQuery(action: string): boolean {
  return [
    'findUnique',
    'findUniqueOrThrow',
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'count',
    'aggregate',
    'groupBy',
  ].includes(action);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // [P0-AUDIT-2026-07-14] P0-D3: 之前所有环境都开 query log,
    // 生产环境每个 SELECT/INSERT/UPDATE 都进 stdout, 日志量翻倍,
    // 也会把敏感字段 (contact_phone/contact_wechat) 间接泄露到日志.
    // 修复: 仅在 NODE_ENV !== 'production' 时开 query log;
    //       生产环境只保留 warn/error; 也可以用 PRISMA_LOG_QUERY=1 强制开 (调试用).
    const isProd = process.env.NODE_ENV === 'production';
    const forceQueryLog = process.env.PRISMA_LOG_QUERY === '1';
    super({
      log: forceQueryLog
        ? ['query', 'info', 'warn', 'error']
        : isProd
          ? ['warn', 'error']
          : ['query', 'info', 'warn', 'error'],
    });

    // T-001: 软删除中间件
    this.$use(async (params, next) => {
      if (!params.model || !SOFT_DELETE_MODELS.has(params.model)) {
        return next(params);
      }
      if (!isReadQuery(params.action)) {
        return next(params);
      }

      const args = (params.args ?? {}) as Record<string, any>;
      const where = (args.where ?? {}) as Record<string, any>;

      // 跳过条件 1：业务已显式指定 deletedAt
      if (Object.prototype.hasOwnProperty.call(where, 'deletedAt')) {
        return next(params);
      }
      // 跳过条件 2：admin 显式要求包含已删除（消费方用完后我们会删掉这个标记，
      // 避免 Prisma 报 "Unknown argument"）
      if (where.includeDeleted === true) {
        delete where.includeDeleted;
        args.where = where;
        params.args = args;
        return next(params);
      }

      where.deletedAt = null;
      args.where = where;

      // findUnique 必须改写为 findFirst（unique + deletedAt 不是合法的 unique 约束）
      if (
        params.action === 'findUnique' ||
        params.action === 'findUniqueOrThrow'
      ) {
        params.action = params.action === 'findUniqueOrThrow' ? 'findFirstOrThrow' : 'findFirst';
        // findUnique 允许省略 where.id 来查询；findFirst 也支持
      }

      params.args = args;
      return next(params);
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

  /**
   * T-001 辅助方法：列出当前实例已注册的所有软删除模型。
   * 主要用于单元测试断言 + 文档化。
   */
  static getSoftDeleteModels(): string[] {
    return Array.from(SOFT_DELETE_MODELS);
  }

  /**
   * T-001: 显式标记查询包含已软删记录。
   *
   * 用法：
   *   await prisma.withIncludeDeleted(
   *     () => prisma.post.findUnique({ where: { id, includeDeleted: true } }),
   *   )
   *
   * 实际上你也可以直接传 `includeDeleted: true` 给任意 where，
   * 中间件会识别并删除该字段。下方方法只是一个类型安全的封装。
   */
  withIncludeDeleted<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
