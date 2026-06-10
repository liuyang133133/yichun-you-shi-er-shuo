import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AreaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取完整区域树（市 → 区县 → 街道）
   */
  async findTree() {
    const all = await this.prisma.area.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return this.buildTree(all, null);
  }

  /**
   * 按 level 列出（1=市 / 2=区县 / 3=街道）
   */
  async findByLevel(level: number) {
    return this.prisma.area.findMany({
      where: { level },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * 列出指定 parent 的子区域
   */
  async findChildren(parentId: bigint | null) {
    return this.prisma.area.findMany({
      where: { parentId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * 查询单个
   */
  async findOne(id: bigint) {
    const area = await this.prisma.area.findUnique({ where: { id } });
    if (!area) {
      throw new NotFoundException(`区域 ID ${id} 不存在`);
    }
    return area;
  }

  /**
   * 统计
   */
  async count() {
    return this.prisma.area.count();
  }

  // ============= 内部 =============

  private buildTree(
    all: Array<{ id: bigint; parentId: bigint | null; [k: string]: any }>,
    parentId: bigint | null,
  ): any[] {
    const children = all.filter((a) => a.parentId === parentId);
    return children.map((a) => ({
      ...a,
      children: this.buildTree(all, a.id),
    }));
  }
}
