/**
 * T-005: AuditLogWriter - 自动填充 ip/userAgent/requestId
 *
 * 用法（替换直接 auditLog.create 调用）：
 *   await this.auditWriter.write({
 *     adminUserId, module: 'post', action: 'audit_pass',
 *     targetType: 'post', targetId: id, reason, beforeSnapshot, afterSnapshot,
 *   });
 *
 * 自动从请求上下文填充：
 *   - requestId  (从 header x-request-id 或生成 UUID)
 *   - ip         (request.ip)
 *   - userAgent  (request.headers['user-agent'])
 */
import { Injectable, Scope, Inject, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AuditLogInput {
  adminUserId: bigint;
  module: string;
  action: string;
  targetType: string;
  targetId?: bigint | null;
  reason?: string | null;
  metadata?: any;
  beforeSnapshot?: any;
  afterSnapshot?: any;
}

@Injectable({ scope: Scope.DEFAULT })
export class AuditLogWriter {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REQUEST) private readonly request?: Request,
  ) {}

  /**
   * 写入 AuditLog，自动附加 request context
   */
  async write(input: AuditLogInput) {
    const ctx = this.extractContext();
    return this.prisma.auditLog.create({
      data: {
        adminUserId: input.adminUserId,
        module: input.module,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ?? undefined,
        beforeSnapshot: input.beforeSnapshot ?? undefined,
        afterSnapshot: input.afterSnapshot ?? undefined,
        requestId: ctx.requestId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
  }

  /**
   * 事务版（在 $transaction 回调中使用）
   * 返回 PrismaPromise，直接传给 $transaction([...])
   */
  writeOp(input: AuditLogInput) {
    const ctx = this.extractContext();
    return this.prisma.auditLog.create({
      data: {
        adminUserId: input.adminUserId,
        module: input.module,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ?? undefined,
        beforeSnapshot: input.beforeSnapshot ?? undefined,
        afterSnapshot: input.afterSnapshot ?? undefined,
        requestId: ctx.requestId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
  }

  private extractContext() {
    const req = this.request;
    if (!req) return { requestId: null, ip: null, userAgent: null };
    return {
      requestId:
        (req.headers['x-request-id'] as string) ||
        (req.headers['X-Request-Id'] as string) ||
        randomUUID(),
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        null,
      userAgent: (req.headers['user-agent'] as string) || null,
    };
  }
}