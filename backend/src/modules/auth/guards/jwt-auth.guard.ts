import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

/**
 * JWT 鉴权守卫
 *
 * - 通过 APP_GUARD 全局绑定到所有路由
 * - 路由用 @Public() 装饰器标记为公开，自动跳过鉴权
 * - 路由用 @Public() 装饰在 controller 上，整个 controller 都跳过
 *
 * [T-024-d 2026-07-15] @Public() 路由仍然尝试解析 token (用于识别登录用户做 owner/admin 判定),
 * 但缺/坏 token 时不抛错, 继续放行 (req.user = undefined).
 *
 * 之前直接 `return true` 跳 super.canActivate → JwtStrategy.validate 不被调用
 *   → controller 里 @CurrentUser() user?.sub 永远是 undefined
 *   → service.findOne 拿到 viewer.userId=undefined
 *   → pending 帖**作者本人**也看不到自己帖子的详情 (BUG 现象: /me/posts 点自己待审核帖 → 404)
 * 修复: 即使 isPublic 也 super.canActivate(context); passport 有 token 就调 validate, 没 token 才吞错.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 尝试解析 token 填充 req.user; 失败时吞掉, 公开路由继续放行 (req.user = undefined)
      return new Promise<boolean>((resolve) => {
        const result = super.canActivate(context);
        if (result instanceof Promise) {
          result.then(() => resolve(true)).catch(() => resolve(true));
        } else if (result instanceof Observable) {
          result.subscribe({ next: () => resolve(true), error: () => resolve(true) });
        } else {
          resolve(true);
        }
      });
    }
    return super.canActivate(context);
  }
}
