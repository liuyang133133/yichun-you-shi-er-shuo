import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 注入当前登录用户 payload（由 JwtStrategy.validate 返回）
 *
 * 用法：
 *   @Get('me')
 *   me(@CurrentUser() user: JwtPayload) { return user; }
 *
 * 取单个字段：
 *   @Get('me')
 *   me(@CurrentUser('id') userId: string) { return userId; }
 */
export interface JwtPayload {
  /** 用户 id（字符串形式，Prisma BigInt 转 string） */
  sub: string;
  /** 手机号 */
  phone: string;
  /** 角色（user/admin，预留） */
  role?: string;
  /** token 类型：access 用于业务请求，refresh 用于换 token */
  type?: 'access' | 'refresh';
  /** token 唯一 id（用于黑名单） */
  jti?: string;
  /** 签发时间（秒） */
  iat?: number;
  /** 过期时间（秒） */
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string | number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
