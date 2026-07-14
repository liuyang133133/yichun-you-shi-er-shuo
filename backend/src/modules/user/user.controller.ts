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
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminGuard } from '../admin/guards/admin-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('JWT')
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
  @ApiOperation({ summary: '创建用户（admin）' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  /**
   * 公开用户列表（脱敏 phone）
   */
  @Public()
  @Get()
  @ApiOperation({ summary: '公开用户列表（脱敏手机号）' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.userService.findAllPublic(page, pageSize);
  }

  @Public()
  @Get('count')
  @ApiOperation({ summary: '用户总数' })
  count() {
    return this.userService.count();
  }

  /**
   * 当前登录用户信息（推荐用这个, 客户端拿到自己的 user 资料）
   * [BB-003 Fix] 之前 GET /users/me 落到 :id → BigInt('me') SyntaxError → 500
   */
  @Get('me')
  @ApiOperation({ summary: '当前登录用户信息 (JWT)' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.userService.findOnePublic(BigInt(user.sub));
  }

  /**
   * 公开用户详情（脱敏 phone）
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: '用户详情（脱敏）' })
  findOne(@Param('id') id: string) {
    // [BB-003 Fix] 防御: 非数字 id 直接返回 400, 避免 BigInt 抛 500
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException(`Invalid user id: ${id}`);
    }
    return this.userService.findOnePublic(BigInt(id));
  }

  /**
   * 修改用户
   * F-6 修复:普通用户改自己 OR admin 改任意人都允许
   * - UpdateUserDto 已排除 phone/password/role/status(只允许 nickname/avatar/bio/gender)
   * - 即使是普通用户,也无法提权 / 改密
   */
  @Patch(':id')
  @ApiOperation({ summary: '修改用户资料' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // 鉴权: 自己 OR admin
    const targetId = BigInt(id);
    const isSelf = String(targetId) === String(user.sub);
    const isAdmin = user.role === 'admin';
    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('只能修改自己的资料');
    }
    // [A-P0-03] P0 修复: 透传 operator 用于审计
    return this.userService.update(targetId, dto, {
      sub: user.sub,
      role: user.role,
    });
  }

  /**
   * 删除用户（必须 admin）
   * SHOULD-16: 改软删（status=2），保留数据可恢复
   * - 不能删除自己
   * - 已删除的用户再删返回 alreadyDeleted: true（幂等）
   */
  @UseGuards(AdminGuard)
  @Roles('admin')
  @Delete(':id')
  @ApiOperation({ summary: '删除用户（软删，admin）' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userService.remove(BigInt(id), user);
  }
}
