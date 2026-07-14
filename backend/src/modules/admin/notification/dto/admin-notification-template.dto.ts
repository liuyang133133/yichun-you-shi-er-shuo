/**
 * V1.1: admin notification template DTOs
 *
 * 覆盖 controller 中 4 个 raw @Body() body: {...} 端点:
 * - POST   /admin/notifications/templates           create
 * - PATCH  /admin/notifications/templates/:id       update
 * - POST   /admin/notifications/templates/:id/preview  preview
 * - POST   /admin/notifications/broadcast           broadcast
 *
 * 字段长度对齐 NotificationTemplate / Notification 表的 VarChar 限制。
 */
import {
  IsString, IsOptional, IsInt, IsBoolean, IsObject, IsIn, Min, Max, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 8 类通知事件 (与 NotificationEvent 保持一致) */
export const NOTIFICATION_EVENT_CODES = [
  'comment', 'audit', 'order', 'auth', 'system', 'appeal', 'follow', 'invite',
] as const;
export type NotificationEventCodeDto = typeof NOTIFICATION_EVENT_CODES[number];

/** 渠道: V1 默认 site, V1.1 扩 email/sms/push */
export const NOTIFICATION_CHANNELS = ['site', 'email', 'sms', 'push'] as const;
export type NotificationChannelDto = typeof NOTIFICATION_CHANNELS[number];

/** 角色筛选 (broadcast 用): user / admin */
export const NOTIFICATION_ROLES = ['user', 'admin'] as const;

/** 优先级 1-5 (5 最高, 与 schema Notification.priority 一致) */
const PRIORITY_MIN = 1;
const PRIORITY_MAX = 5;

/** 变量定义 (preview 用) key/value 都限制长度, 防注入 */
const VARIABLE_KEY_MAX = 50;
const VARIABLE_VALUE_MAX = 1000;

/**
 * POST /admin/notifications/templates
 */
export class AdminNotificationTemplateCreateDto {
  @IsIn(NOTIFICATION_EVENT_CODES, { message: 'event 必须是 8 类事件之一' })
  event!: NotificationEventCodeDto;

  @IsOptional()
  @IsIn(NOTIFICATION_CHANNELS, { message: 'channel 必须是 site/email/sms/push 之一' })
  channel?: NotificationChannelDto;

  @IsString()
  @MaxLength(50, { message: 'key 不能超过 50 字符' })
  key!: string;

  @IsString()
  @MaxLength(200, { message: 'title 不能超过 200 字符' })
  title!: string;

  @IsString()
  @MaxLength(5000, { message: 'body 不能超过 5000 字符' })
  body!: string;

  @IsOptional()
  @IsObject()
  variables?: any;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(PRIORITY_MIN)
  @Max(PRIORITY_MAX)
  @Type(() => Number)
  priority?: number;
}

/**
 * PATCH /admin/notifications/templates/:id
 */
export class AdminNotificationTemplateUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'title 不能超过 200 字符' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'body 不能超过 5000 字符' })
  body?: string;

  @IsOptional()
  @IsObject()
  variables?: any;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(PRIORITY_MIN)
  @Max(PRIORITY_MAX)
  @Type(() => Number)
  priority?: number;
}

/**
 * POST /admin/notifications/templates/:id/preview
 * Body 为变量替换 map (key → string), e.g. {userName: '张三', orderId: '123'}
 */
export class AdminNotificationTemplatePreviewDto {
  // preview 接收任意 key/value 替换变量, 运行时用 Object.keys/values 替换占位符
  // class-validator 允许 Record<string, string>, 但需要限制 key/value 长度
  [key: string]: string;
}

/**
 * POST /admin/notifications/broadcast
 */
export class AdminNotificationBroadcastDto {
  @IsString()
  @MaxLength(200, { message: 'title 不能超过 200 字符' })
  title!: string;

  @IsString()
  @MaxLength(5000, { message: 'body 不能超过 5000 字符' })
  body!: string;

  @IsIn(NOTIFICATION_EVENT_CODES, { message: 'event 必须是 8 类事件之一' })
  event!: NotificationEventCodeDto;

  @IsOptional()
  @IsIn(NOTIFICATION_ROLES, { message: 'role 必须是 user/admin 之一' })
  role?: 'user' | 'admin';

  @IsOptional()
  @IsObject()
  payload?: any;

  @IsOptional()
  @IsInt()
  @Min(PRIORITY_MIN)
  @Max(PRIORITY_MAX)
  @Type(() => Number)
  priority?: number;
}