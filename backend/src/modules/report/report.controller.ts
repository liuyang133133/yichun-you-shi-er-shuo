import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth('JWT')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * POST /api/v1/reports
   * 提交举报（需登录）
   */
  @HttpCode(201)
  @Post()
  @ApiOperation({ summary: '提交举报' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.create(
      BigInt(user.sub),
      BigInt(dto.postId),
      dto.reason,
      dto.description,
    );
  }

  /**
   * GET /api/v1/reports
   * 我的举报记录（需登录）
   */
  @Get()
  @ApiOperation({ summary: '我的举报记录' })
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.reportService.findMyReports(BigInt(user.sub), {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  /**
   * GET /api/v1/reports/reasons
   * 举报理由选项（公开，前端下拉用）
   */
  @Public()
  @Get('reasons')
  @ApiOperation({ summary: '举报理由选项（公开）' })
  getReasons() {
    return this.reportService.getReasons();
  }

  /**
   * GET /api/v1/reports/:id
   * 查看自己的某条举报
   */
  @Get(':id')
  @ApiOperation({ summary: '查看我的某条举报' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.reportService.findOne(BigInt(id));
  }
}
