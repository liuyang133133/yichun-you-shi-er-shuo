import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建用户
   */
  async create(dto: CreateUserDto) {
    // 检查手机号是否已存在
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('该手机号已注册');
    }

    // 加密密码
    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        nickname: dto.nickname ?? '',
        avatar: dto.avatar,
        gender: dto.gender ?? 0,
        bio: dto.bio,
        status: 0,
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        gender: true,
        bio: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // 不返回 password
      },
    });
  }

  /**
   * 查询所有用户（支持分页）
   */
  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          nickname: true,
          avatar: true,
          gender: true,
          bio: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 公开用户列表（脱敏 phone）
   * 用于公开 GET /users
   */
  async findAllPublic(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          avatar: true,
          gender: true,
          bio: true,
          createdAt: true,
          // 显式不选：phone, status, role, lastLoginAt
        },
      }),
      this.prisma.user.count(),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 根据 ID 查询用户（含敏感字段：phone/status/role）
   * 仅内部或 admin 使用
   */
  async findOne(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        gender: true,
        bio: true,
        status: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }
    return user;
  }

  /**
   * 公开查询用户（脱敏 phone / status / role / lastLoginAt）
   * 用于公开 GET /users/:id
   */
  async findOnePublic(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        gender: true,
        bio: true,
        createdAt: true,
        // 显式不选：phone, status, role, lastLoginAt, updatedAt
      },
    });
    return user; // 找不到直接返回 null，不抛 404（保持 RESTful）
  }

  /**
   * 根据手机号查询（内部用）
   */
  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * 更新用户
   */
  async update(id: bigint, dto: UpdateUserDto) {
    await this.findOne(id); // 检查存在
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        gender: true,
        bio: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  /**
   * SHOULD-16: 删除用户改软删（status=2），保留数据可恢复
   * 物理硬删会破坏帖子/评论/收藏/站内信关联
   * @param id 用户 ID
   * @param currentUser 操作者（sub, role）
   */
  async remove(id: bigint, currentUser?: { sub: string; role?: string }) {
    // 鉴权：仅 admin 可删，且不能删自己
    if (currentUser) {
      if (currentUser.role !== 'admin') {
        throw new ForbiddenException('只有管理员能删除用户');
      }
      if (String(currentUser.sub) === String(id)) {
        throw new BadRequestException('不能删除自己，请联系其他管理员');
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('用户不存在');
    }
    if (existing.status === 2) {
      return { id: id.toString(), status: 2, alreadyDeleted: true };
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 2, updatedAt: new Date() },
    });

    // 备注：access token 7d 内仍有效，需等自然过期或后续接入 jwt 黑名单刷新
    return { id: id.toString(), status: 2, softDeleted: true };
  }

  /**
   * 统计总数
   */
  async count() {
    return this.prisma.user.count();
  }
}
