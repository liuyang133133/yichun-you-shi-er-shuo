import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminGuard } from '../admin/guards/admin-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 创建用户（注册）
   * - 生产环境应通过 SMS 验证码注册（auth/login-sms），不走此接口
   * - 此接口保留供 admin 后台或导入脚本使用
   * - 不允许外部直接 POST 注册（由 admin 鉴权保护）
   */
  @UseGuards(AdminGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  /**
   * 公开用户列表（脱敏 phone）
   */
  @Public()
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.userService.findAllPublic(page, pageSize);
  }

  @Public()
  @Get('count')
  count() {
    return this.userService.count();
  }

  /**
   * 公开用户详情（脱敏 phone）
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOnePublic(BigInt(id));
  }

  /**
   * 修改用户（必须 admin）
   * - 普通用户修改自己信息走 /auth/me 或专门端点
   */
  @UseGuards(AdminGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(BigInt(id), dto);
  }

  /**
   * 删除用户（必须 admin）
   * - 生产建议改软删（status=2），此处保留硬删作为 admin 强操作
   */
  @UseGuards(AdminGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(BigInt(id));
  }
}
