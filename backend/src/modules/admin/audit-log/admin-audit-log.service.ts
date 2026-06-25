/**
 * T-005: 后台操作日志查询服务
 *
 * 提供 7 种筛选（module / action / adminUserId / targetType / targetId / from / to）
 * + 列表 + CSV 导出
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列表（带 7 种筛选）
   */
  async findAll(query: {
    module?: string;
    action?: string;
    adminUserId?: string;
    targetType?: string;
    targetId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      module, action, adminUserId, targetType, targetId,
      from, to, page = 1, pageSize = 20,
    } = query;
    const where: Prisma.AuditLogWhereInput = {};
    if (module) where.module = module;
    if (action) where.action = action;
    if (adminUserId) where.adminUserId = BigInt(adminUserId);
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = BigInt(targetId);
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as any).gte = new Date(from);
      if (to) (where.createdAt as any).lte = new Date(to);
    }

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, phone: true, nickname: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      list: list.map((log) => ({
        id: log.id.toString(),
        adminUserId: log.adminUserId.toString(),
        adminPhone: log.admin.phone,
        adminNickname: log.admin.nickname,
        module: log.module,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId?.toString() ?? null,
        reason: log.reason,
        metadata: log.metadata,
        beforeSnapshot: log.beforeSnapshot,
        afterSnapshot: log.afterSnapshot,
        requestId: log.requestId,
        ip: log.ip,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 详情
   */
  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id: BigInt(id) },
      include: {
        admin: {
          select: { id: true, phone: true, nickname: true, role: true },
        },
      },
    });
    if (!log) return null;
    return {
      id: log.id.toString(),
      adminUserId: log.adminUserId.toString(),
      admin: {
        id: log.admin.id.toString(),
        phone: log.admin.phone,
        nickname: log.admin.nickname,
        role: log.admin.role,
      },
      module: log.module,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId?.toString() ?? null,
      reason: log.reason,
      metadata: log.metadata,
      beforeSnapshot: log.beforeSnapshot,
      afterSnapshot: log.afterSnapshot,
      requestId: log.requestId,
      ip: log.ip,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    };
  }

  /**
   * 所有可选 module / action（用于前端下拉）
   */
  async listModules() {
    const [modules, actions, targetTypes] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['module'],
        _count: { module: true },
        orderBy: { _count: { module: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['targetType'],
        _count: { targetType: true },
        orderBy: { _count: { targetType: 'desc' } },
      }),
    ]);
    return {
      modules: modules.map((m) => ({ value: m.module, count: m._count.module })),
      actions: actions.map((a) => ({ value: a.action, count: a._count.action })),
      targetTypes: targetTypes.map((t) => ({ value: t.targetType, count: t._count.targetType })),
    };
  }

  /**
   * CSV 导出（带 7 种筛选）
   */
  async exportCsv(query: {
    module?: string;
    action?: string;
    adminUserId?: string;
    targetType?: string;
    targetId?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.adminUserId) where.adminUserId = BigInt(query.adminUserId);
    if (query.targetType) where.targetType = query.targetType;
    if (query.targetId) where.targetId = BigInt(query.targetId);
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) (where.createdAt as any).gte = new Date(query.from);
      if (query.to) (where.createdAt as any).lte = new Date(query.to);
    }

    // 限制导出最大 10000 行（防 OOM）
    const list = await this.prisma.auditLog.findMany({
      where,
      take: 10000,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { phone: true, nickname: true } },
      },
    });

    // CSV header
    const headers = [
      'id', 'adminUserId', 'adminPhone', 'adminNickname',
      'module', 'action', 'targetType', 'targetId',
      'reason', 'metadata', 'beforeSnapshot', 'afterSnapshot',
      'requestId', 'ip', 'userAgent', 'createdAt',
    ];
    const escapeCsv = (v: any): string => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      // CSV: 转义 " 和 ,
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines = [headers.join(',')];
    for (const log of list) {
      lines.push([
        log.id.toString(),
        log.adminUserId.toString(),
        escapeCsv(log.admin.phone),
        escapeCsv(log.admin.nickname),
        escapeCsv(log.module),
        escapeCsv(log.action),
        escapeCsv(log.targetType),
        log.targetId?.toString() ?? '',
        escapeCsv(log.reason),
        escapeCsv(log.metadata),
        escapeCsv(log.beforeSnapshot),
        escapeCsv(log.afterSnapshot),
        escapeCsv(log.requestId),
        escapeCsv(log.ip),
        escapeCsv(log.userAgent),
        log.createdAt.toISOString(),
      ].join(','));
    }

    // BOM 让 Excel 识别 UTF-8
    return '﻿' + lines.join('\r\n');
  }
}