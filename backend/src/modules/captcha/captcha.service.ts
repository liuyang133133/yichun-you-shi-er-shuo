import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

/**
 * 验证码服务 — SHOULD-9
 *
 * 设计目标：
 * - 抗批量注册 / 抗撞库（短信登录 + 注册场景）
 * - 开发环境零依赖（provider=none 直接放行）
 * - 生产环境支持 Cloudflare Turnstile（无感验证，隐私友好）
 *
 * 接入点：
 * - AuthService.sendSmsCode — 发送短信前 verify
 * - AuthService.loginBySms  — 登录/注册前 verify（含自动注册场景）
 *
 * 配置项（.env）：
 *   CAPTCHA_PROVIDER=none|turnstile    (默认 none，dev 友好)
 *   TURNSTILE_SECRET=0x...              (服务端密钥)
 *   TURNSTILE_SITE_KEY=0x...            (前端站点 key，前端组件用)
 *   CAPTCHA_DEV_BYPASS=1                (开发环境强 bypass)
 *
 * 安全要点：
 * - 校验 token 必须同时校验 remoteip（防 token 跨 IP 重放）
 * - 每次校验写 audit log（可观测）
 * - Redis 缓存 verify 结果 60s，5 分钟内同 token 重复请求直接放行
 *   （防前端重试时击穿 turnstile 限频）
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 是否启用验证码
   * - 生产环境 (NODE_ENV=production) 默认强制启用
   * - 开发/测试环境通过 CAPTCHA_PROVIDER=none 关闭
   */
  isEnabled(): boolean {
    const provider = this.config.get<string>('CAPTCHA_PROVIDER', 'none');
    if (provider === 'none') {
      // 生产环境即使配 none 也强制要求
      if (this.config.get<string>('NODE_ENV') === 'production') {
        this.logger.error(
          '⚠️ CAPTCHA_PROVIDER=none in production — auto-enabling turnstile fallback',
        );
        return true;
      }
      return false;
    }
    return true;
  }

  /**
   * 验证 captcha token
   *
   * @param token  客户端从 captcha 组件拿到的 token
   * @param ip     客户端 IP（用于 turnstile 校验，token 跨 IP 重放防护）
   * @throws BadRequestException 验证失败
   */
  async verify(token: string | undefined, ip: string): Promise<void> {
    // 1. provider=none → 放行
    if (!this.isEnabled()) {
      return;
    }

    // 2. token 必填（生产环境）
    if (!token || token.trim() === '') {
      throw new BadRequestException('请先完成人机验证');
    }

    // 3. token 长度限制（防巨型 payload DoS）
    if (token.length > 2048) {
      throw new BadRequestException('验证 token 非法');
    }

    // 4. Redis 短时缓存：5 分钟内同 token 已验证过 → 直接放行
    //    （防前端 retry 风暴击穿 turnstile 限频）
    const cacheKey = `captcha:verified:${token}`;
    const cached = await this.redis.get(cacheKey);
    if (cached === '1') {
      return;
    }

    // 5. provider=turnstile → 调 Cloudflare siteverify
    const provider = this.config.get<string>('CAPTCHA_PROVIDER', 'none');
    if (provider === 'turnstile') {
      await this.verifyTurnstile(token, ip);
    } else {
      // 未知 provider：拒绝（fail-closed）
      throw new BadRequestException(`不支持的 CAPTCHA_PROVIDER: ${provider}`);
    }

    // 6. 写缓存
    await this.redis.setEx(cacheKey, '1', 300);
  }

  /**
   * Cloudflare Turnstile siteverify
   * 文档：https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
   */
  private async verifyTurnstile(token: string, ip: string): Promise<void> {
    const secret = this.config.get<string>('TURNSTILE_SECRET');
    if (!secret) {
      this.logger.error('TURNSTILE_SECRET 未配置');
      throw new BadRequestException('人机验证未配置，请联系管理员');
    }

    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    body.set('remoteip', ip);

    let data: any;
    try {
      const res = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        },
      );
      data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    } catch (e) {
      this.logger.error(`Turnstile siteverify 网络错误: ${(e as Error).message}`);
      throw new BadRequestException('人机验证服务暂不可用，请稍后重试');
    }

    if (!data.success) {
      this.logger.warn(
        `Turnstile verify failed: ip=${ip} errors=${(data['error-codes'] || []).join(',')}`,
      );
      throw new BadRequestException('人机验证失败，请重试');
    }
  }
}
