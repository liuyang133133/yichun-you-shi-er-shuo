import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建分类
   */
  async create(dto: CreateCategoryDto) {
    // 检查同名同 parent 是否已存在
    const parentId = dto.parentId ? BigInt(dto.parentId) : null;
    const existing = await this.prisma.category.findFirst({
      where: {
        name: dto.name,
        parentId: parentId === null ? null : parentId,
      },
    });
    if (existing) {
      throw new ConflictException(`分类「${dto.name}」已存在`);
    }

    return this.prisma.category.create({
      data: {
        parentId,
        code: dto.code,
        name: dto.name,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status ?? 1,
      },
    });
  }

  /**
   * 列出所有分类（可按顶级 code 过滤）
   * - code 匹配顶级 OR 子分类的 parent.code（子分类 code 独立，不一定匹配顶级）
   */
  async findAll(code?: string) {
    const where = code ? { OR: [{ code }, { parent: { code } }] } : undefined;
    return this.prisma.category.findMany({
      where,
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * 获取分类树（按顶级 code 分组）
   * - 同 findAll：code 过滤顶级 + 子分类（通过 parent.code）
   */
  async findTree(code?: string) {
    const where = code ? { OR: [{ code }, { parent: { code } }] } : undefined;
    const all = await this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    // 构造树
    const map = new Map<number, any>();
    const roots: any[] = [];

    for (const cat of all) {
      const node = { ...cat, children: [] };
      map.set(Number(cat.id), node);
    }

    for (const cat of all) {
      const node = map.get(Number(cat.id));
      if (cat.parentId === null || cat.parentId === undefined) {
        roots.push(node);
      } else {
        const parent = map.get(Number(cat.parentId));
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }

    return roots;
  }

  /**
   * 查询单个
   */
  async findOne(id: bigint) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) {
      throw new NotFoundException(`分类 ID ${id} 不存在`);
    }
    return cat;
  }

  /**
   * 更新
   */
  async update(id: bigint, dto: Partial<CreateCategoryDto>) {
    await this.findOne(id);
    const { parentId, ...rest } = dto;
    return this.prisma.category.update({
      where: { id },
      data: {
        ...rest,
        ...(parentId !== undefined ? { parentId: BigInt(parentId) } : {}),
      },
    });
  }

  /**
   * 删除
   */
  async remove(id: bigint) {
    await this.findOne(id);

    // 检查是否有子分类
    const childCount = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ConflictException('请先删除子分类');
    }

    // 检查是否有信息使用
    const postCount = await this.prisma.post.count({
      where: { categoryId: id },
    });
    if (postCount > 0) {
      throw new ConflictException(`该分类下还有 ${postCount} 条信息，无法删除`);
    }

    await this.prisma.category.delete({ where: { id } });
    return { id: id.toString(), deleted: true };
  }

  /**
   * 统计
   */
  async count() {
    return this.prisma.category.count();
  }
}
