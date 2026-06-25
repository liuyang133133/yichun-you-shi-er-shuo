/**
 * T-007: 推送设备 Token 服务（V1.1 用，先建表 + 基本 API）
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeviceTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 注册 / 更新设备 Token（同一 userId+token upsert）
   */
  async register(userId: bigint, data: {
    platform: string;
    token: string;
    deviceId?: string;
  }) {
    return this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token: data.token } },
      update: {
        platform: data.platform,
        deviceId: data.deviceId,
        lastSeenAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      },
      create: {
        userId,
        platform: data.platform,
        token: data.token,
        deviceId: data.deviceId,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * 注销设备（软删）
   */
  async unregister(userId: bigint, token: string) {
    return this.prisma.deviceToken.updateMany({
      where: { userId, token, deletedAt: null },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
  }

  /**
   * 列出用户的所有有效设备
   */
  async list(userId: bigint) {
    return this.prisma.deviceToken.findMany({
      where: { userId, deletedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    });
  }
}