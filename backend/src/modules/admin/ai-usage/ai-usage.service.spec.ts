import { AiUsageService } from './ai-usage.service';

describe('AiUsageService.getStats', () => {
  let service: AiUsageService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      aiUsageLog: {
        count: jest.fn().mockResolvedValue(100),
        aggregate: jest.fn().mockResolvedValue({ _avg: { latencyMs: 3000 }, _sum: { costUsd: 1.5 } }),
        findMany: jest.fn().mockResolvedValue([
          { kind: 'extract', _count: 70 },
          { kind: 'suggest-title', _count: 30 },
        ]),
        groupBy: jest.fn()
          .mockResolvedValueOnce([{ kind: 'extract', _count: 70 }])
          .mockResolvedValueOnce([{ type: 'house', _count: 50 }, { type: 'job', _count: 20 }])
          .mockResolvedValueOnce([{ errorCode: 'AI_UNAVAILABLE', _count: 3 }])
          .mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1n, phone: '13900000001' }]) },
      post: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _avg: { qualityScore: null } }),
      },
    };
    service = new AiUsageService(mockPrisma);
  });

  it('今日统计返回 6 维度', async () => {
    const stats = await service.getStats('today');
    expect(stats).toMatchObject({
      totalCalls: 100,
      avgLatencyMs: 3000,
      totalCostUsd: 1.5,
      totalCostCny: expect.any(Number),
      byKind: expect.any(Object),
      byType: expect.any(Object),
      topUsers: expect.any(Array),
      errorBreakdown: expect.any(Array),
      seoCoverageRate: 0,
      avgQualityScore: 0,
      businessPostRate: 0,
    });
  });

  it('week/month 范围都接受', async () => {
    await expect(service.getStats('week')).resolves.toBeDefined();
    await expect(service.getStats('month')).resolves.toBeDefined();
  });
});
