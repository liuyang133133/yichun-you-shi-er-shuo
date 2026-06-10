import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

/**
 * JWT 鉴权策略
 *
 * - 从 Authorization: Bearer xxx 提取 token
 * - 用 JWT_SECRET 验签
 * - 拒绝 type=refresh 的 token（refresh 走专用端点）
 * - 拒绝黑名单中的 token
 * - 查 DB 拿用户最新状态（status=0 才算正常）
 * - 把用户信息挂到 request.user 上，供 @CurrentUser 装饰器使用
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Passport 在 token 验签通过后回调此方法
   * 返回值会作为 request.user
   */
  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('无效的 token payload');
    }
    // 拒绝 refresh token 用于业务接口
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('refresh token 不能用于业务请求');
    }
    // 黑名单检查（登出后的 token）
    if (payload.jti) {
      const blacklisted = await this.authService.isTokenBlacklisted(payload.jti);
      if (blacklisted) {
        throw new UnauthorizedException('token 已失效（已登出）');
      }
    }

    const user = await this.userService.findOne(BigInt(payload.sub));
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    if (user.status === 1) {
      throw new UnauthorizedException('账号已被封禁');
    }

    return {
      sub: user.id.toString(),
      phone: user.phone,
      role: user.role || 'user',
      jti: payload.jti,
      type: 'access',
    } satisfies JwtPayload;
  }
}
