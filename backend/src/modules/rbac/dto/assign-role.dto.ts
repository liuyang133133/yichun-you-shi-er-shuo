import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignRoleDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  roleId!: number;

  /** ISO 字符串；不传 = 永久 */
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class CreateRoleDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number;
}

export class SetRolePermissionsDto {
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds!: number[];
}
