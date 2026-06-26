/**
 * T-018: AgreementService
 *
 * 协议管理服务：
 *   - findByKey(key)         返回该 key 的当前生效版本（isCurrent=true）
 *   - findAll()              返回所有 key 的当前版本列表
 *   - create(dto)            新建一个版本（默认 isCurrent=false）
 *   - setCurrent(key, ver)   把指定版本标记为当前（事务内把同 key 旧版本置 false）
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAgreementDto } from './dto';

@Injectable()
export class AgreementService {
  private readonly logger = new Logger(AgreementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 公开：按 key 返回当前生效版本（isCurrent=true 且未软删） */
  async findByKey(key: string) {
    const r = await this.prisma.agreement.findFirst({
      where: {
        key,
        isCurrent: true,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    });
    if (!r) {
      throw new NotFoundException(`协议不存在: ${key}`);
    }
    return r;
  }

  /** 公开：返回所有 key 的当前版本（用于用户首次登录确认列表） */
  async findAll() {
    return this.prisma.agreement.findMany({
      where: { isCurrent: true, deletedAt: null },
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
    });
  }

  /** admin：新建一个版本（默认 isCurrent=false） */
  async create(dto: CreateAgreementDto) {
    try {
      const r = await this.prisma.agreement.create({
        data: {
          key: dto.key,
          version: dto.version,
          title: dto.title,
          content: dto.content,
          effectiveAt: new Date(dto.effectiveAt),
          isCurrent: dto.isCurrent ?? false,
          createdBy: dto.createdBy,
        },
      });
      this.logger.log(`Agreement created: key=${r.key} version=${r.version} id=${r.id}`);
      return r;
    } catch (e) {
      // Prisma 唯一约束违反 (P2002) → (key, version) 已存在
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException(
          `协议版本已存在: key=${dto.key} version=${dto.version}`,
        );
      }
      throw e;
    }
  }

  /** admin：把指定版本标记为 isCurrent（事务内把同 key 旧版本置 false） */
  async setCurrent(key: string, version: number, operatorId?: bigint) {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.agreement.findFirst({
        where: { key, version, deletedAt: null },
      });
      if (!target) {
        throw new NotFoundException(
          `协议版本不存在: key=${key} version=${version}`,
        );
      }
      // 把同 key 其他版本置 false
      await tx.agreement.updateMany({
        where: { key, isCurrent: true, deletedAt: null, NOT: { version } },
        data: { isCurrent: false, updatedBy: operatorId },
      });
      // 把目标版本置 true
      const updated = await tx.agreement.update({
        where: { id: target.id },
        data: { isCurrent: true, updatedBy: operatorId },
      });
      this.logger.log(
        `Agreement setCurrent: key=${key} version=${version} operatorId=${operatorId}`,
      );
      return updated;
    });
  }
}
