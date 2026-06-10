import { IsString, Length, Matches, IsOptional, MinLength } from 'class-validator';

/**
 * 发送短信验证码
 */
export class SmsCodeDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的 11 位手机号' })
  phone!: string;
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
