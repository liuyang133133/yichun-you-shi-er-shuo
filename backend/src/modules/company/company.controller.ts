import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /**
   * GET /api/v1/companies  公司列表（公开）
   */
  @Public()
  @Get()
  findAll(
    @Query('keyword') keyword?: string,
    @Query('industry') industry?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.companyService.findAll({
      keyword,
      industry,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  /**
   * GET /api/v1/companies/:id  详情
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(BigInt(id));
  }

  /**
   * GET /api/v1/companies/:id/jobs  在招职位
   */
  @Public()
  @Get(':id/jobs')
  findJobs(@Param('id') id: string) {
    return this.companyService.findJobs(BigInt(id));
  }

  /**
   * POST /api/v1/companies  创建
   */
  @HttpCode(201)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCompanyDto) {
    return this.companyService.create(BigInt(user.sub), dto);
  }

  /**
   * PATCH /api/v1/companies/:id
   */
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCompanyDto>,
  ) {
    return this.companyService.update(BigInt(user.sub), BigInt(id), dto);
  }

  /**
   * DELETE /api/v1/companies/:id
   * [D-P1-06] 改硬删为软删, 返回 {softDeleted: true}
   */
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.companyService.remove(BigInt(user.sub), BigInt(id));
  }

  /**
   * [D-P1-06] 恢复软删公司 (公开 API, 仅创建者可恢复)
   * POST /api/v1/companies/:id/restore
   */
  @Post(':id/restore')
  @HttpCode(200)
  restore(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.companyService.restore(BigInt(user.sub), BigInt(id));
  }
}
