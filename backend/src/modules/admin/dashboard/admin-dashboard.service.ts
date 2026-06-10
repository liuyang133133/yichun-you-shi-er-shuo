import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 看板数据
   * GET /api/v1/admin/dashboard
   * - 总用户数 / 今日新增
   * - 总信息数 / 今日新增 / 待审核
   * - 总举报 / 待处理
   * - 总公司 / 总简历
   * - 4 大模块信息数
   */
  async getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      todayUsers,
      totalPosts,
      todayPosts,
      pendingPosts,
      activePosts,
      totalReports,
      pendingReports,
      totalCompanies,
      totalResumes,
      totalCategories,
      totalFavorites,
      totalComments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.post.count({ where: { auditStatus: 'pending' } }),
      this.prisma.post.count({ where: { status: 'active' } }),
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.company.count(),
      this.prisma.resume.count(),
      this.prisma.category.count(),
      this.prisma.favorite.count(),
      this.prisma.comment.count(),
    ]);

    // 4 大模块信息数
    const postByType = await this.prisma.post.groupBy({
      by: ['type'],
      _count: { _all: true },
    });
    const typeStats: Record<string, number> = {};
    for (const r of postByType) {
      typeStats[r.type] = r._count._all;
    }

    return {
      users: { total: totalUsers, today: todayUsers },
      posts: {
        total: totalPosts,
        today: todayPosts,
        pending: pendingPosts,
        active: activePosts,
        byType: typeStats,
      },
      reports: { total: totalReports, pending: pendingReports },
      companies: { total: totalCompanies },
      resumes: { total: totalResumes },
      categories: { total: totalCategories },
      favorites: { total: totalFavorites },
      comments: { total: totalComments },
      generatedAt: new Date().toISOString(),
    };
  }
}
