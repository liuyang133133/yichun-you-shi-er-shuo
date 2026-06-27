/**
 * T-009: 通知模板管理服务
 *
 * 模板 CRUD + 群发（按 event/role/area 筛选用户）
 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { NotificationEvent, NotificationEventCode } from '../../notification/notification-event';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminNotificationTemplateService {
  private readonly logger = new Logger(AdminNotificationTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 列表（分页 + 筛选 event/channel/includeDeleted）
   */
  async findAll(query: {
    event?: string;
    channel?: string;
    enabled?: boolean;
    includeDeleted?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const {
      event, channel, enabled, includeDeleted = false,
      page = 1, pageSize = 20,
    } = query;
    const where: Prisma.NotificationTemplateWhereInput = {};
    if (event) where.event = event;
    if (channel) where.channel = channel;
    if (enabled !== undefined) where.enabled = enabled;
    if (!includeDeleted) where.deletedAt = null;

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where,
        orderBy: [{ event: 'asc' }, { channel: 'asc' }, { priority: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 详情
   */
  async findOne(id: string) {
    const t = await this.prisma.notificationTemplate.findUnique({ where: { id: BigInt(id) } });
    if (!t) throw new NotFoundException(`模板 ID ${id} 不存在`);
    return t;
  }

  /**
   * 创建
   */
  async create(adminId: bigint, data: {
    event: NotificationEventCode;
    channel?: string;
    key: string;
    title: string;
    body: string;
    variables?: any;
    enabled?: boolean;
    priority?: number;
  }) {
    return this.prisma.notificationTemplate.create({
      data: {
        event: data.event,
        channel: data.channel ?? 'site',
        key: data.key,
        title: data.title,
        body: data.body,
        variables: data.variables as any,
        enabled: data.enabled ?? true,
        priority: data.priority ?? 3,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
  }

  /**
   * 更新
   */
  async update(adminId: bigint, id: string, data: {
    title?: string;
    body?: string;
    variables?: any;
    enabled?: boolean;
    priority?: number;
  }) {
    const t = await this.findOne(id);
    return this.prisma.notificationTemplate.update({
      where: { id: t.id },
      data: {
        ...data,
        updatedBy: adminId,
      },
    });
  }

  /**
   * 软删
   */
  async remove(adminId: bigint, id: string) {
    const t = await this.findOne(id);
    return this.prisma.notificationTemplate.update({
      where: { id: t.id },
      data: {
        deletedAt: new Date(),
        deletedBy: adminId,
        updatedBy: adminId,
        enabled: false,
      },
    });
  }

  /**
   * 切换启用/停用
   */
  async toggle(adminId: bigint, id: string) {
    const t = await this.findOne(id);
    return this.prisma.notificationTemplate.update({
      where: { id: t.id },
      data: {
        enabled: !t.enabled,
        updatedBy: adminId,
      },
    });
  }

  /**
   * 群发通知（按 event + 筛选条件）
   * 接收者：所有 user (status=0) - 可按 role 过滤
   */
  async broadcast(adminId: bigint, data: {
    title: string;
    body: string;
    event: NotificationEventCode;
    role?: 'user' | 'admin';
    payload?: any;
    priority?: number;
  }) {
    if (!data.title?.trim() || !data.body?.trim()) {
      throw new BadRequestException('标题和内容必填');
    }
    // 1) 找出目标用户
    const where: Prisma.UserWhereInput = { status: 0, deletedAt: null };
    if (data.role) where.role = data.role;
    const targetUsers = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    if (targetUsers.length === 0) {
      return { sent: 0, target: 0 };
    }

    // 2) 批量 emit
    const inputs = targetUsers.map((u) => ({
      userId: u.id,
      event: data.event,
      title: data.title,
      body: data.body,
      payload: data.payload as any,
      priority: data.priority ?? 3,
    }));
    const results = await this.notificationService.emitBatch(inputs);
    const sent = results.filter((r) => r !== null).length;

    this.logger.log(
      `群发 ${data.event} 通知：admin=${adminId} target=${targetUsers.length} sent=${sent}`,
    );

    return { sent, target: targetUsers.length };
  }

  /**
   * 预览模板（替换变量）
   */
  async preview(id: string, variables: Record<string, string>) {
    const t = await this.findOne(id);
    return {
      title: renderTemplate(t.title, variables),
      body: renderTemplate(t.body, variables),
    };
  }
}

/**
 * 简单模板变量替换：{{varName}} → value
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}