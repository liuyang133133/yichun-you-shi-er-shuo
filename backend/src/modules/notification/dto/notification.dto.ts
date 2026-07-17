/**
 * T-007: 通知 DTO
 */
import { Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min,
} from 'class-validator';

export class UpdateSettingDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
  /** 静默时段：{ start: "22:00", end: "08:00", timezone: "Asia/Shanghai" } */
  @IsOptional()
  quietHours?: { start: string; end: string; timezone?: string };
}

export class RegisterDeviceDto {
  @IsIn(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';

  @IsString()
  token!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ListNotificationsDto {
  /**
   * [T-024-g 2026-07-15] 修复: 之前字段没 class-validator 装饰器,
   * ValidationPipe (whitelist + forbidNonWhitelisted) 把 page/pageSize/unreadOnly
   * 当成白名单外属性抛 400, 让前端列表查不到任何通知 (只剩 unread-count 静默调用能成功).
   * 铃铛 badge 跟通知列表对不上的根因 (其他端点修复方式同).
   */
  @IsOptional()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
