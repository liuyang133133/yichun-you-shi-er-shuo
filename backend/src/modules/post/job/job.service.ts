import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePostJobDto } from './create-post-job.dto';
import { FilterJobDto } from './filter-job.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: bigint, postId: bigint, dto: CreatePostJobDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, type: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能给自己发布的信息添加职位详情');
    if (post.type !== 'job') throw new BadRequestException(`type=${post.type} 的信息不是招聘`);

    // 校验公司存在 + 是当前用户创建的
    const company = await this.prisma.company.findUnique({ where: { id: BigInt(dto.companyId) } });
    if (!company) throw new NotFoundException(`公司 ID ${dto.companyId} 不存在`);
    if (company.creatorUserId !== userId) {
      throw new ForbiddenException('只能使用自己创建的公司发布职位');
    }

    const existing = await this.prisma.postJob.findUnique({ where: { postId } });
    if (existing) throw new ConflictException('职位详情已存在，请用 PATCH 编辑');

    return this.prisma.postJob.create({
      data: {
        postId,
        companyId: BigInt(dto.companyId),
        jobType: dto.jobType,
        salaryMin: dto.salaryMin !== undefined ? new Prisma.Decimal(dto.salaryMin) : null,
        salaryMax: dto.salaryMax !== undefined ? new Prisma.Decimal(dto.salaryMax) : null,
        salaryUnit: dto.salaryUnit,
        education: dto.education,
        experience: dto.experience,
        industry: dto.industry,
        welfare: dto.welfare ? (dto.welfare as any) : Prisma.DbNull,
        recruitCount: dto.recruitCount ?? 1,
        workCity: dto.workCity,
        workAddress: dto.workAddress,
      },
    });
  }

  async update(userId: bigint, postId: bigint, dto: Partial<CreatePostJobDto>) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, type: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能修改自己发布的职位详情');
    if (post.type !== 'job') throw new BadRequestException('非招聘类型不能编辑');

    const data: Prisma.PostJobUpdateInput = {};
    if (dto.jobType !== undefined) data.jobType = dto.jobType;
    if (dto.salaryMin !== undefined) data.salaryMin = new Prisma.Decimal(dto.salaryMin);
    if (dto.salaryMax !== undefined) data.salaryMax = new Prisma.Decimal(dto.salaryMax);
    if (dto.salaryUnit !== undefined) data.salaryUnit = dto.salaryUnit;
    if (dto.education !== undefined) data.education = dto.education;
    if (dto.experience !== undefined) data.experience = dto.experience;
    if (dto.industry !== undefined) data.industry = dto.industry;
    if (dto.welfare !== undefined) {
      data.welfare = dto.welfare.length > 0 ? (dto.welfare as any) : Prisma.DbNull;
    }
    if (dto.recruitCount !== undefined) data.recruitCount = dto.recruitCount;
    if (dto.workCity !== undefined) data.workCity = dto.workCity;
    if (dto.workAddress !== undefined) data.workAddress = dto.workAddress;

    return this.prisma.postJob.update({ where: { postId }, data });
  }

  async remove(userId: bigint, postId: bigint) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, type: true },
    });
    if (!post) throw new NotFoundException(`信息 ID ${postId} 不存在`);
    if (post.userId !== userId) throw new ForbiddenException('只能删除自己发布的职位详情');
    await this.prisma.postJob.delete({ where: { postId } });
    return { postId: postId.toString(), deleted: true };
  }

  /**
   * 职位筛选（公开）
   * GET /api/v1/jobs
   */
  async filterJobs(query: FilterJobDto) {
    const {
      companyId, areaId, jobType, education, experience, industry, workCity,
      minSalary, maxSalary, keyword, sort = 'latest',
      page = 1, pageSize = 20,
    } = query;

    const postWhere: Prisma.PostWhereInput = { type: 'job', status: 'active' };
    if (areaId) postWhere.areaId = BigInt(areaId);
    if (keyword) {
      postWhere.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const jobWhere: Prisma.PostJobWhereInput = {};
    if (companyId) jobWhere.companyId = BigInt(companyId);
    if (jobType) jobWhere.jobType = jobType;
    if (education) jobWhere.education = education;
    if (experience) jobWhere.experience = experience;
    if (industry) jobWhere.industry = industry;
    if (workCity) jobWhere.workCity = workCity;
    if (minSalary !== undefined || maxSalary !== undefined) {
      // 薪资范围查询：salaryMin <= 期望最大 且 salaryMax >= 期望最小
      jobWhere.AND = [];
      if (minSalary !== undefined) {
        jobWhere.AND.push({ OR: [{ salaryMax: { gte: new Prisma.Decimal(minSalary) } }, { salaryMax: null }] });
      }
      if (maxSalary !== undefined) {
        jobWhere.AND.push({ OR: [{ salaryMin: { lte: new Prisma.Decimal(maxSalary) } }, { salaryMin: null }] });
      }
    }
    if (Object.keys(jobWhere).length > 0) {
      postWhere.job = jobWhere;
    }

    let orderBy: Prisma.PostOrderByWithRelationInput;
    switch (sort) {
      case 'salary_asc': orderBy = { job: { salaryMin: 'asc' } }; break;
      case 'salary_desc': orderBy = { job: { salaryMin: 'desc' } }; break;
      case 'latest':
      default: orderBy = { createdAt: 'desc' };
    }

    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.post.findMany({
        where: postWhere,
        skip, take: pageSize,
        orderBy,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          category: { select: { id: true, name: true, code: true } },
          area: { select: { id: true, name: true, level: true } },
          job: { include: { company: { select: { id: true, name: true, logo: true, verified: true } } } },
        },
      }),
      this.prisma.post.count({ where: postWhere }),
    ]);

    return { list, total, page, pageSize };
  }
}
