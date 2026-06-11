import { IsInt, IsString, MinLength, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  receiverId!: number;

  @IsString()
  @MinLength(1, { message: '消息内容不能为空' })
  @MaxLength(1000, { message: '消息内容最多 1000 字' })
  content!: string;
}
