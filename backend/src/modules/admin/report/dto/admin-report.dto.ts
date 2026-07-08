import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

/**
 * 举报处置 DTO
 * POST /api/v1/admin/reports/:id/handle
 * body: { action: 'handled' | 'ignored'; postAction?: 'down' }
 */
export class AdminReportHandleDto {
  @IsIn(['handled', 'ignored'])
  action!: 'handled' | 'ignored';

  @IsOptional()
  @IsIn(['down'])
  postAction?: 'down';
}