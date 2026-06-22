import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AiService } from './ai.service';
import { ExtractRequestDto, ExtractResponse } from './dto/extract.dto';
import { SuggestTitleRequestDto, SuggestTitleResponse } from './dto/suggest-title.dto';
import { ScoreRequestDto, ScoreResponse } from './dto/score.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * 智能发布: 从大白话提取结构化字段
   */
  @Post('draft/extract')
  async extract(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ExtractRequestDto,
  ): Promise<ExtractResponse> {
    return this.aiService.extract(BigInt(user.sub), dto);
  }

  /**
   * 标题建议 (Phase 1 复用 extract 的结果, 不二次调 LLM)
   */
  @Post('draft/suggest-title')
  async suggestTitle(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SuggestTitleRequestDto,
  ): Promise<SuggestTitleResponse> {
    return this.aiService.suggestTitle(BigInt(user.sub), dto);
  }

  /**
   * 质量评分 (Phase 2: 4 维质量分 + 1-5 条具体建议, 10min 缓存)
   */
  @Post('draft/score')
  async score(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ScoreRequestDto,
  ): Promise<ScoreResponse> {
    return this.aiService.score(BigInt(user.sub), dto);
  }

  /**
   * AI 健康检查 (公开, 无需登录)
   */
  @Public()
  @Get('health')
  async health() {
    return {
      available: true,
      model: 'claude-haiku-4-5-20251001',
      version: 'phase-1',
    };
  }
}
