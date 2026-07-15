/**
 * [P2-06] V1.0 验收修复单测
 *
 * 验证 CommentService.findByPost 的 post 存在性校验：
 *   - post 不存在 → 抛 NotFoundException(404)
 *   - post 已软删 → 返回空列表(允许读)
 *   - post 存在 + 无评论 → 返回空列表
 *   - post 存在 + 有顶级评论 + 回复 → 返回正确组装
 */
import { CommentService } from './comment.service';
import { NotFoundException } from '@nestjs/common';

describe('CommentService.findByPost - [P2-06] post 存在性校验', () => {
  let service: CommentService;
  let mockPrisma: any;
  // [P1-1 2026-07-15] NotificationService 注入 (本测试不直接验证, 用 mock stub)
  const mockNotification = { emit: jest.fn().mockResolvedValue(null) };

  beforeEach(() => {
    mockPrisma = {
      post: {
        findUnique: jest.fn(),
      },
      comment: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new CommentService(mockPrisma, mockNotification as any);
  });

  it('1. post 不存在 → 抛 NotFoundException(404)', async () => {
    mockPrisma.post.findUnique.mockResolvedValue(null);
    await expect(service.findByPost(99999n)).rejects.toBeInstanceOf(NotFoundException);
    // 关键: 不能再去查 comment (避免无意义 IO)
    expect(mockPrisma.comment.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.comment.count).not.toHaveBeenCalled();
  });

  it('2. post 已软删 (status=deleted) → 返回空列表, 不查 comment', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ id: 1n, status: 'deleted' });
    const result = await service.findByPost(1n);
    expect(result).toEqual({ list: [], total: 0, page: 1, pageSize: 20 });
    // 软删帖不再返回评论内容
    expect(mockPrisma.comment.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.comment.count).not.toHaveBeenCalled();
  });

  it('3. post 存在 + 顶级 + 回复 → 正确组装', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ id: 1n, status: 'online' });
    const mockedComment = {
      id: 100n,
      postId: 1n,
      content: '一条留言',
      parentId: null,
      user: { id: 7n, nickname: 'u', avatar: null },
      children: [
        {
          id: 101n,
          parentId: 100n,
          content: '一条回复',
          user: { id: 8n, nickname: 'u2', avatar: null },
        },
      ],
    };
    mockPrisma.comment.findMany.mockResolvedValue([mockedComment]);
    mockPrisma.comment.count.mockResolvedValue(1);

    const result = await service.findByPost(1n);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.list).toHaveLength(1);
    expect(result.list[0].children).toHaveLength(1);
    // findMany 用了正确 where (postId + parentId=null + status=0)
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ postId: 1n, parentId: null, status: 0 }),
        orderBy: { createdAt: 'asc' },
      }),
    );
  });

  it('4. 分页参数透传 page/pageSize', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ id: 1n, status: 'online' });
    mockPrisma.comment.findMany.mockResolvedValue([]);
    mockPrisma.comment.count.mockResolvedValue(0);

    const result = await service.findByPost(1n, { page: 3, pageSize: 5 });
    expect(result).toEqual({ list: [], total: 0, page: 3, pageSize: 5 });
    // skip = (page-1)*pageSize = 10
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });
});
