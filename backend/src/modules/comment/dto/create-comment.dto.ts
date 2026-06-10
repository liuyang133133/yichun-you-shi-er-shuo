import { IsString, IsOptional, IsInt, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @IsString()
  @Length(1, 500, { message: '留言内容 1-500 字符' })
  content!: string;

  /**
   * 回复的父留言 ID（顶级留言不传）
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  parentId?: number;
}
