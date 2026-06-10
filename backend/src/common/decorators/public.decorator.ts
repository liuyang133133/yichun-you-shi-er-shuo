import { SetMetadata } from '@nestjs/common';

/**
 * 标记路由为「公开」，跳过 JwtAuthGuard 鉴权
 *
 * 用法：
 *   @Public()
 *   @Get('categories')
 *   list() { ... }
 *
 * 也可标记整个 controller：
 *   @Public()
 *   @Controller('public-api')
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
