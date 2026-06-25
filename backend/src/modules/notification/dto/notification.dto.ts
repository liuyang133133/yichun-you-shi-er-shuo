/**
 * T-007: 通知 DTO
 */
export class UpdateSettingDto {
  enabled?: boolean;
  /** 静默时段：{ start: "22:00", end: "08:00", timezone: "Asia/Shanghai" } */
  quietHours?: { start: string; end: string; timezone?: string };
}

export class RegisterDeviceDto {
  platform: 'ios' | 'android' | 'web';
  token: string;
  deviceId?: string;
}

export class ListNotificationsDto {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}