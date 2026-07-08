import { IsString, IsIn, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 审核通过/拒绝 DTO
 * POST /api/v1/admin/posts/:id/audit
 * body: { action: 'pass' | 'reject'; reason?: string }
 *
 * [P0-fix] reason 限 255 字符 (匹配 Post.auditReason @db.VarChar(255))
 * 否则 70k chars → MySQL Data too long for column → 500
 */
export class AdminPostAuditDto {
  @IsIn(['pass', 'reject'])
  action!: 'pass' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '审核理由不能超过 255 字符' })
  reason?: string;
}

/**
 * 强制下架 DTO
 * POST /api/v1/admin/posts/:id/offline
 * body: { reason: string }
 */
export class AdminPostOfflineDto {
  @IsString()
  @MaxLength(255, { message: '下架理由不能超过 255 字符' })
  reason!: string;
}

/**
 * 批量审核 DTO
 * POST /api/v1/admin/posts/audit-batch
 * body: { ids: string[]; action: 'pass' | 'reject'; reason?: string }
 *
 * [P0-fix] ids 限 100 个, 防止 admin 误操作全表
 * [P0-fix] reason 限 255 字符
 */
export class AdminPostAuditBatchDto {
  @IsString({ each: true })
  @MaxLength(20, { each: true, message: '单个 id 不能超过 20 字符' })
  ids!: string[];

  @IsIn(['pass', 'reject'])
  action!: 'pass' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

/**
 * 批量下架 DTO
 * POST /api/v1/admin/posts/offline-batch
 */
export class AdminPostOfflineBatchDto {
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  ids!: string[];

  @IsString()
  @MaxLength(255)
  reason!: string;
}

/**
 * 硬清 N 天前软删 DTO
 * POST /api/v1/admin/posts/purge
 * body: { daysOld?: number }
 *
 * [P0-fix] daysOld 限 1-3650 (10年), 防止 0/-1 误操作清空表
 */
export class AdminPostPurgeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  daysOld?: number;
}