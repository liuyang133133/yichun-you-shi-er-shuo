import { IsString, Length, Matches, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * 发送短信验证码
 */
export class SmsCodeDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的 11 位手机号' })
  phone!: string;

  /** SHOULD-9: 人机验证 token（生产环境 CAPTCHA_PROVIDER=turnstile 时必填） */
  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'captchaToken 长度非法' })
  captchaToken?: string;
}

/**
 * 短信验证码登录
 */
export class LoginBySmsDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的 11 位手机号' })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: '验证码必须是 6 位' })
  code!: string;

  /** SHOULD-9: 人机验证 token */
  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'captchaToken 长度非法' })
  captchaToken?: string;
}

/**
 * 密码登录
 */
export class LoginByPasswordDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的 11 位手机号' })
  phone!: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  password!: string;

  /** SHOULD-9: 人机验证 token */
  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'captchaToken 长度非法' })
  captchaToken?: string;
}

/**
 * 刷新 token
 */
export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

/**
 * 注册（密码）
 */
export class RegisterDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的 11 位手机号' })
  phone!: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  nickname?: string;
}

/**
 * [T-024-o 2026-07-16] 发送密码重置验证码 (公开)
 * POST /auth/reset-code
 * 用于: 忘记密码 (登录页) + 设置初始密码 (/me/security 已登录用户用)
 * 复用现有 smsService.sendLoginCode — 同一套限频 + 验证码生命周期
 */
export class ResetCodeDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的 11 位手机号' })
  phone!: string;
}

/**
 * [T-024-o 2026-07-16] 重置/设置密码 (公开, 短信码 + 新密码)
 * POST /auth/reset
 * 用于: 忘记密码 + 已登录用户无密码设置密码
 * 成功后会撤销该 user 所有 token (强制重新登录)
 */
export class ResetPasswordDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的 11 位手机号' })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: '验证码必须是 6 位' })
  code!: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  newPassword!: string;
}

/**
 * [T-024-o 2026-07-16] 已登录用户改密 (需登录 + 旧密码)
 * PATCH /users/me/password
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: '旧密码至少 6 位' })
  oldPassword!: string;

  @IsString()
  @MinLength(6, { message: '新密码至少 6 位' })
  newPassword!: string;
}
