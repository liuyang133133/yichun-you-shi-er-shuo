import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFavoriteDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  postId!: number;
}
