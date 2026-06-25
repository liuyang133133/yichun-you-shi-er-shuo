/**
 * T-006: 后台登录日志查询服务
 *
 * 6 种筛选（userId / phone / ip / status / from / to）+ 列表 + 详情 + CSV 导出
 * 异常登录检测：失败 status='failed' 自动高亮（前端样式 + 此处返回 isFailed flag）
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminLoginLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列表（带 6 筛选）
   */
  async findAll(query: {
    userId?: string;
    phone?: string;
    ip?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      userId, phone, ip, status, from, to,
      page = 1, pageSize = 20,
    } = query;
    const where: Prisma.LoginLogWhereInput = {};
    if (userId) where.userId = BigInt(userId);
    if (ip) where.ip = { contains: ip };
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as any).gte = new Date(from);
      if (to) (where.createdAt as any).lte = new Date(to);
    }
    if (phone) {
      // 通过 user.phone 关联过滤
      where.user = { phone: { contains: phone } };
    }

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.loginLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, phone: true, nickname: true, role: true, status: true },
          },
        },
      }),
      this.prisma.loginLog.count({ where }),
    ]);

    return {
      list: list.map((log) => ({
        id: log.id.toString(),
        userId: log.userId.toString(),
        userPhone: log.user.phone,
        userNickname: log.user.nickname,
        userRole: log.user.role,
        userStatus: log.user.status,
        ip: log.ip,
        userAgent: log.userAgent,
        device: log.device,
        status: log.status,
        failReason: log.failReason,
        isFailed: log.status !== 'success',
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
    const log = await this.prisma.loginLog.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: {
          select: { id: true, phone: true, nickname: true, role: true, status: true },
        },
      },
    });
    if (!log) return null;
    return {
      id: log.id.toString(),
      user: log.user,
      userId: log.userId.toString(),
      ip: log.ip,
      userAgent: log.userAgent,
      device: log.device,
      status: log.status,
      failReason: log.failReason,
      isFailed: log.status !== 'success',
      createdAt: log.createdAt,
    };
  }

  /**
   * 下拉数据
   */
  async listOptions() {
    const [statuses] = await Promise.all([
      this.prisma.loginLog.groupBy({
        by: ['status'],
        _count: { status: true },
        orderBy: { _count: { status: 'desc' } },
      }),
    ]);
    return {
      statuses: statuses.map((s) => ({ value: s.status, count: s._count.status })),
    };
  }

  /**
   * 异常登录检测：同一 IP 最近 1 小时内失败次数 >= 5 次
   * 返回异常 IP 列表（前端可在 IP 列标红）
   */
  async detectAbnormalIps(windowHours = 1, threshold = 5): Promise<Set<string>> {
    const cutoff = new Date(Date.now() - windowHours * 3600 * 1000);
    const grouped = await this.prisma.loginLog.groupBy({
      by: ['ip'],
      where: {
        status: { not: 'success' },
        ip: { not: null },
        createdAt: { gte: cutoff },
      },
      _count: { ip: true },
      having: { ip: { _count: { gte: threshold } } },
    });
    return new Set(grouped.map((g) => g.ip!).filter(Boolean));
  }

  /**
   * CSV 导出
   */
  async exportCsv(query: {
    userId?: string;
    phone?: string;
    ip?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const where: Prisma.LoginLogWhereInput = {};
    if (query.userId) where.userId = BigInt(query.userId);
    if (query.ip) where.ip = { contains: query.ip };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) (where.createdAt as any).gte = new Date(query.from);
      if (query.to) (where.createdAt as any).lte = new Date(query.to);
    }
    if (query.phone) where.user = { phone: { contains: query.phone } };

    const list = await this.prisma.loginLog.findMany({
      where,
      take: 10000,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { phone: true, nickname: true } } },
    });

    const headers = [
      'id', 'userId', 'phone', 'nickname', 'ip', 'userAgent',
      'device', 'status', 'failReason', 'createdAt',
    ];
    const escapeCsv = (v: any): string => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines = [headers.join(',')];
    for (const log of list) {
      lines.push([
        log.id.toString(),
        log.userId.toString(),
        escapeCsv(log.user.phone),
        escapeCsv(log.user.nickname),
        escapeCsv(log.ip),
        escapeCsv(log.userAgent),
        escapeCsv(log.device),
        escapeCsv(log.status),
        escapeCsv(log.failReason),
        log.createdAt.toISOString(),
      ].join(','));
    }
    return '﻿' + lines.join('\r\n');
  }
}