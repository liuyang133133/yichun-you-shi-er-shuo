import { Body, Controller, Get, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  LoginByPasswordDto,
  LoginBySmsDto,
  RefreshTokenDto,
  SmsCodeDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/sms-code
   * 发送登录验证码
   * 限频：60s 一次，每天 10 次，每小时同 IP 30 次
   */
  @Public()
  @Post('sms-code')
  async smsCode(@Body() dto: SmsCodeDto, @Req() req: Request) {
    const ip = this.getClientIp(req);
    return this.authService.sendSmsCode(dto.phone, ip);
  }

  /**
   * POST /auth/login-sms
   * 短信验证码登录/注册（未注册用户自动注册）
   */
  @Public()
  @Post('login-sms')
  async loginBySms(@Body() dto: LoginBySmsDto) {
    const tokens = await this.authService.loginBySms(dto.phone, dto.code);
    return { ...tokens, user: { phone: dto.phone } };
  }

  /**
   * POST /auth/login-password
   * 密码登录（已注册用户）
   */
  @Public()
  @Post('login-password')
  async loginByPassword(@Body() dto: LoginByPasswordDto) {
    const tokens = await this.authService.loginByPassword(dto.phone, dto.password);
    return { ...tokens, user: { phone: dto.phone } };
  }

  /**
   * POST /auth/refresh
   * 用 refresh token 换新的 access + refresh
   */
  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * POST /auth/logout
   * 把当前 access token 加入 Redis 黑名单（剩余有效期内）
   * 需要登录
   */
  @HttpCode(200)
  @Post('logout')
  async logout(
    @CurrentUser() _user: JwtPayload,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '') || '';
    return this.authService.logout(token);
  }

  /**
   * GET /auth/me
   * 返回当前登录用户信息
   * 需要登录
   */
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  /**
   * 提取客户端 IP（兼容反向代理）
   */
  private getClientIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string') return xff.split(',')[0].trim();
    if (Array.isArray(xff) && xff.length > 0) return xff[0];
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
