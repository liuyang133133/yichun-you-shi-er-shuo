/**
 * T-007: 通知事件常量 + 8 类事件 payload 类型
 *
 * 8 类事件：
 *   - comment  收到评论
 *   - audit    帖子/评论审核结果
 *   - order    订单状态变化（V1 占位，T-029 实现）
 *   - auth     认证 / 密码 / 设备登录
 *   - system   系统公告（管理员群发）
 *   - appeal   申诉进度（封禁 / 举报）
 *   - follow   关注动态（V1 占位，T-044 实现）
 *   - invite   邀请奖励
 */
export const NotificationEvent = {
  COMMENT: 'comment',
  AUDIT: 'audit',
  ORDER: 'order',
  AUTH: 'auth',
  SYSTEM: 'system',
  APPEAL: 'appeal',
  FOLLOW: 'follow',
  INVITE: 'invite',
} as const;

export type NotificationEventCode = typeof NotificationEvent[keyof typeof NotificationEvent];

/** 事件 payload 类型（按需扩展） */
export interface NotificationPayload {
  /** 资源类型：post / comment / user / order / system */
  type?: string;
  /** 资源 ID */
  id?: string | number;
  /** 跳转 URL（前端用） */
  url?: string;
  /** 其他自定义字段（透传） */
  [key: string]: any;
}

/** emit 输入 */
export interface EmitInput {
  userId: bigint;
  event: NotificationEventCode;
  /** 直接传 title + body（不进模板） */
  title: string;
  body: string;
  payload?: NotificationPayload;
  /** 1-5 优先级 */
  priority?: number;
  /** 默认 'site' 站内信；V1.1 扩 email / sms / push */
  channel?: 'site' | 'email' | 'sms' | 'push';
}