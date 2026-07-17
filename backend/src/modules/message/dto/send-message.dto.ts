import { IsInt, IsOptional, IsString, Matches, Min, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMessageDto {
  /**
   * [T-024-h 2026-07-15] 修复: 之前 receiverId: int 强校验, 但 UI 是按手机号,
   * 前端绕路 search(phone) 走脱敏公开列表 → 找不到完整手机号.
   * 改为接收手机号 + service 用 phone 查 user.
   *
   * [T-024-i 2026-07-16] 双人会话页 (/me/messages/with/:userId) 已知 otherId,
   * 公开 /users/:id 返回脱敏 phone 拿不到完整号 — 允许两种字段择一:
   * - receiverPhone: string (compose box 用)
   * - receiverId: int (conversation 页用, 已知道 user id)
   */
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的 11 位手机号' })
  receiverPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  receiverId?: number;

  @IsString()
  @MinLength(1, { message: '消息内容不能为空' })
  @MaxLength(1000, { message: '消息内容最多 1000 字' })
  content!: string;
}
