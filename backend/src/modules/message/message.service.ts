import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SensitiveWordService } from '../../common/filters/sensitive-word.filter';
import { Prisma } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    // P0-Fix (D-P0-02): 注入敏感词服务
    private readonly sensitiveWord: SensitiveWordService,
  ) {}

  /**
   * 发送站内信
   * - 不能给自己发
   * - 收件人必须存在
   * - 集成敏感词过滤 (P0-Fix D-P0-02)
   *
   * [T-024-h] 接收 receiverPhone 替代 receiverId, 走 phone 查询
   * [T-024-i] DTO 兼容 receiverId (会话页已知道 otherId, 公开 /users/:id 脱敏拿不到完整 phone)
   */
  async send(senderId: bigint, dto: SendMessageDto) {
    // ===== [D-P0-02] P0 修复: 敏感词同步拦截 =====
    await this.sensitiveWord.assertClean(dto.content, '消息内容');

    if (!dto.receiverPhone && !dto.receiverId) {
      throw new BadRequestException('收件人信息不能为空');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { phone: true, status: true, id: true },
    });
    if (!sender) {
      throw new BadRequestException('发送方账号异常');
    }

    // 按 phone 或 id 查 receiver
    let receiver: { id: bigint; phone: string; status: number } | null = null;
    if (dto.receiverPhone) {
      // 不能给自己发 (按手机号比较)
      if (dto.receiverPhone === sender.phone) {
        throw new BadRequestException('不能给自己发消息');
      }
      receiver = await this.prisma.user.findUnique({
        where: { phone: dto.receiverPhone },
        select: { id: true, phone: true, status: true },
      });
    } else if (dto.receiverId !== undefined) {
      if (BigInt(dto.receiverId) === sender.id) {
        throw new BadRequestException('不能给自己发消息');
      }
      receiver = await this.prisma.user.findUnique({
        where: { id: BigInt(dto.receiverId) },
        select: { id: true, phone: true, status: true },
      });
    }

    if (!receiver) {
      throw new NotFoundException('收件人不存在或手机号错误');
    }
    if (receiver.status === 1) {
      throw new BadRequestException('收件人已被封禁');
    }

    return this.prisma.message.create({
      data: {
        senderId,
        receiverId: receiver.id,
        content: dto.content,
      },
    });
  }

  /**
   * 收件箱（我收到的）
   * GET /api/v1/messages/inbox
   */
  async inbox(userId: bigint, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.MessageWhereInput = { receiverId: userId };
    const [list, total, unreadCount] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.message.count({ where }),
      this.prisma.message.count({ where: { receiverId: userId, isRead: 0 } }),
    ]);
    return { list, total, page, pageSize, unreadCount };
  }

  /**
   * 发件箱（我发出的）
   * GET /api/v1/messages/outbox
   */
  async outbox(userId: bigint, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.MessageWhereInput = { senderId: userId };
    const [list, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          receiver: { select: { id: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 与某人的对话列表（双向）
   * GET /api/v1/messages/with/:userId
   */
  async conversation(userId: bigint, otherId: bigint, page = 1, pageSize = 50) {
    if (otherId === userId) {
      throw new BadRequestException('不能查看与自己的对话');
    }
    const skip = (page - 1) * pageSize;
    const where: Prisma.MessageWhereInput = {
      OR: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId },
      ],
    };
    const [list, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, nickname: true, avatar: true } },
          receiver: { select: { id: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);
    // 标记我收到的消息为已读
    await this.prisma.message.updateMany({
      where: { senderId: otherId, receiverId: userId, isRead: 0 },
      data: { isRead: 1, readAt: new Date() },
    });
    return { list, total, page, pageSize };
  }

  /**
   * 标记单条已读
   */
  async markRead(userId: bigint, messageId: bigint) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('消息不存在');
    if (msg.receiverId !== userId) {
      throw new ForbiddenException('只能标记自己的消息');
    }
    if (msg.isRead === 1) return msg;
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isRead: 1, readAt: new Date() },
    });
  }

  /**
   * 全部标记已读
   */
  async markAllRead(userId: bigint) {
    const r = await this.prisma.message.updateMany({
      where: { receiverId: userId, isRead: 0 },
      data: { isRead: 1, readAt: new Date() },
    });
    return { updated: r.count };
  }

  /**
   * 未读数
   */
  async unreadCount(userId: bigint) {
    const count = await this.prisma.message.count({
      where: { receiverId: userId, isRead: 0 },
    });
    return { count };
  }

  // ============== [D-P0-03] P0 修复: 撤回 + 隐藏 ==============

  /**
   * 撤回消息 (发送方, 5 分钟内)
   * - 未读: 硬删 (对方收件箱直接消失)
   * - 已读: 软删 (deletedAt, Prisma 中间件隐藏)
   */
  async recall(userId: bigint, messageId: bigint) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('消息不存在');
    if (msg.senderId !== userId) {
      throw new ForbiddenException('只能撤回自己发送的消息');
    }
    const ageMin = (Date.now() - msg.createdAt.getTime()) / 60_000;
    if (ageMin > 5) {
      throw new BadRequestException('超过 5 分钟无法撤回');
    }
    if (msg.isRead === 0) {
      // 未读: 硬删
      await this.prisma.message.delete({ where: { id: messageId } });
      return { id: messageId.toString(), recalled: true, hardDeleted: true };
    }
    // 已读: 软删 (Prisma 中间件自动隐藏)
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    return { id: messageId.toString(), recalled: true, hardDeleted: false };
  }

  /**
   * 隐藏消息 (收发双方可调用, 仅影响自己视角)
   * 注: 当前 Prisma 中间件不分 sender/receiver, 软删后双方都看不到
   *   改进方案: 新建 MessageHide 表 (留 V1.1)
   */
  async remove(userId: bigint, messageId: bigint) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('消息不存在');
    if (msg.senderId !== userId && msg.receiverId !== userId) {
      throw new ForbiddenException('无权操作此消息');
    }
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    return { id: messageId.toString(), hidden: true };
  }
}
