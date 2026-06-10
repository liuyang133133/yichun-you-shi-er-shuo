import { IsString, IsOptional, IsInt, Min, Max, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(11, 11, { message: '手机号必须为 11 位' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @IsOptional()
  @IsString()
  @Length(6, 100, { message: '密码长度 6-100' })
  password?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50, { message: '昵称最多 50 字符' })
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  gender?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  bio?: string;
}
