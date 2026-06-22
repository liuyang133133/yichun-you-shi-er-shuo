import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ClaudeClient } from './llm/claude.client';
import { GlmClient } from './llm/glm.client';
import { EXTRACT_SYSTEM_PROMPT, buildExtractUserPrompt } from './llm/prompts/extract';
import { SUGGEST_TITLE_SYSTEM_PROMPT, buildSuggestTitleUserPrompt } from './llm/prompts/suggest-title';
import { SCORE_SYSTEM_PROMPT, buildScoreUserPrompt } from './llm/prompts/score';
import { redactPii, sha256 } from '../../common/utils/pii-redact.util';
import {
  ExtractRequestDto,
  ExtractResponse,
  AiPostType,
} from './dto/extract.dto';
import { buildChips } from './llm/field-maps';
import { SuggestTitleRequestDto, SuggestTitleResponse } from './dto/suggest-title.dto';
import { ScoreRequestDto, ScoreResponse, ScoreBreakdown } from './dto/score.dto';
import { RewriteRequestDto, RewriteResponse, RewriteVersion } from './dto/rewrite.dto';
import { REWRITE_SYSTEM_PROMPT, buildRewriteUserPrompt } from './llm/prompts/rewrite';

const CACHE_TTL_SECONDS = 5 * 60;
const RATE_LIMIT_PER_DAY = 200;

/**
 * LLM 抽象接口 — service 只依赖此接口,
 * 由 ai.module.ts 注入具体实现 (ClaudeClient 或 GlmClient)。
 */
interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlmCallOptions {
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

interface LlmCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
}

interface LlmClient {
  isAvailable(): boolean;
  call(opts: LlmCallOptions): Promise<LlmCallResult>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly llm: LlmClient;
  private readonly llmModel: string;

  constructor(
    claude: ClaudeClient,
    glm: GlmClient,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const provider = (this.config.get<string>('AI_PROVIDER') || 'glm').toLowerCase();
    if (provider === 'claude') {
      this.llm = claude;
      this.llmModel =
        this.config.get<string>('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001';
      this.logger.log(`AI provider: Claude (${this.llmModel})`);
    } else {
      this.llm = glm;
      this.llmModel = this.config.get<string>('GLM_MODEL') ?? 'glm-4-air';
      this.logger.log(`AI provider: GLM (${this.llmModel})`);
    }
  }

  /**
   * extract 入口: PII 脱敏 → 查缓存 → 调 LLM → 写日志 → 返回
   */
  async extract(userId: bigint | null, dto: ExtractRequestDto): Promise<ExtractResponse> {
    const start = Date.now();
    const textHash = sha256(dto.rawText);
    const cacheKey = `ai:extract:${textHash}`;

    // 1) 限频
    await this.checkRateLimit(userId, 'extract');

    // 2) 查缓存
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ExtractResponse;
      const result = { ...parsed, cached: true };
      await this.logUsage(userId, 'extract', 0, 0, 0, 0, true, null, textHash);
      return result;
    }

    // 3) LLM 不可用 → 503
    if (!this.llm.isAvailable()) {
      throw new HttpException('AI 暂不可用', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 4) PII 脱敏
    const safeText = redactPii(dto.rawText);

    // 5) 调 LLM
    let llmResult: LlmCallResult;
    try {
      llmResult = await this.llm.call({
        system: EXTRACT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildExtractUserPrompt(safeText, dto.typeHint) }],
        maxTokens: 1500,
        temperature: 0.2,
        timeoutMs: 60000,
      });
    } catch (e: any) {
      await this.logUsage(userId, 'extract', 0, 0, 0, Date.now() - start, false, e?.message, textHash);
      throw new HttpException('AI 调用失败', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 6) 解析 LLM JSON
    const parsed = this.parseLlmJson(llmResult.text, dto.typeHint);
    const durationMs = Date.now() - start;
    const costUsd = this.estimateCost(llmResult.inputTokens, llmResult.outputTokens);

    const response: ExtractResponse = {
      type: parsed.type,
      typeConfidence: parsed.typeConfidence,
      fields: parsed.fields,
      fieldsConfidence: parsed.fieldsConfidence,
      missingFields: parsed.missingFields,
      chips: buildChips(parsed.type, parsed.fields, parsed.fieldsConfidence),
      suggestions: parsed.suggestions,
      rawTextHash: textHash,
      durationMs,
      cached: false,
      isBusiness: parsed.isBusiness ?? false,
      businessType: parsed.businessType ?? null,
      businessConfidence: parsed.businessConfidence ?? 0,
      isForestEconomy: parsed.isForestEconomy ?? false,
      forestCategory: parsed.forestCategory ?? null,
      forestConfidence: parsed.forestConfidence ?? 0,
    };

    // 7) 写缓存
    await this.redis.setEx(cacheKey, JSON.stringify({ ...response, cached: false }), CACHE_TTL_SECONDS);

    // 8) 写日志
    await this.logUsage(
      userId,
      'extract',
      llmResult.inputTokens,
      llmResult.outputTokens,
      costUsd,
      durationMs,
      true,
      null,
      textHash,
    );

    return response;
  }

  /**
   * suggest-title: 用 extract 的 fields 二次调 LLM, 生成 3 个标题
   * Phase 2: 真调 LLM, 30 分钟缓存
   */
  async suggestTitle(userId: bigint | null, dto: SuggestTitleRequestDto): Promise<SuggestTitleResponse> {
    const start = Date.now();

    // 1) 限频
    await this.checkRateLimit(userId, 'suggest-title');

    // 2) 缓存 key (按 fields 排序后序列化, 保证字段顺序无关)
    const fieldsKey = Object.keys(dto.fields || {}).sort().reduce((acc, k) => {
      acc[k] = dto.fields[k];
      return acc;
    }, {} as Record<string, any>);
    const inputHash = sha256(JSON.stringify(fieldsKey));
    const cacheKey = `ai:title:${dto.type}:${inputHash}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { titles: string[] };
      await this.logUsage(userId, 'suggest-title', 0, 0, 0, 0, true, null, inputHash);
      return { titles: parsed.titles, cached: true, durationMs: Date.now() - start };
    }

    // 3) LLM 不可用 → 503
    if (!this.llm.isAvailable()) {
      throw new HttpException('AI 暂不可用', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 4) PII 脱敏 (对 fields 做序列化后脱敏)
    const safeFields = JSON.parse(redactPii(JSON.stringify(dto.fields)));

    // 5) 调 LLM
    let llmResult: LlmCallResult;
    try {
      llmResult = await this.llm.call({
        system: SUGGEST_TITLE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildSuggestTitleUserPrompt(dto.type, safeFields) }],
        maxTokens: 500,
        temperature: 0.7,
        timeoutMs: 60000,
      });
    } catch (e: any) {
      await this.logUsage(userId, 'suggest-title', 0, 0, 0, Date.now() - start, false, e?.message, inputHash);
      throw new HttpException('AI 调用失败', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 6) 解析 (允许 markdown ```json 包装)
    const titles = this.parseTitles(llmResult.text);
    const durationMs = Date.now() - start;

    // 7) 写缓存 (30 min, 仅缓存非空结果以避免 LLM 抖动锁死)
    if (titles.length > 0) {
      await this.redis.setEx(cacheKey, JSON.stringify({ titles }), 30 * 60);
    }

    // 8) 写日志
    await this.logUsage(
      userId,
      'suggest-title',
      llmResult.inputTokens,
      llmResult.outputTokens,
      this.estimateCost(llmResult.inputTokens, llmResult.outputTokens),
      durationMs,
      true,
      null,
      inputHash,
    );

    return { titles, cached: false, durationMs };
  }

  /**
   * score: 4 维质量分 (title + description + completeness + contact)
   * Phase 2: 真调 LLM, 10 分钟缓存
   */
  async score(userId: bigint | null, dto: ScoreRequestDto): Promise<ScoreResponse> {
    const start = Date.now();

    // 1) 限频
    await this.checkRateLimit(userId, 'score');

    // 2) 缓存 key (按 type + title + description + fields + contactHint 序列化)
    const contentHash = sha256(
      JSON.stringify({
        type: dto.type,
        title: dto.title,
        description: dto.description,
        fields: dto.fields,
        contactHint: dto.contactPhone ? 'present' : 'absent',
      }),
    );
    const cacheKey = `ai:score:${contentHash}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ScoreResponse;
      await this.logUsage(userId, 'score', 0, 0, 0, 0, true, null, contentHash);
      return { ...parsed, cached: true, durationMs: Date.now() - start };
    }

    // 3) LLM 不可用 → 503
    if (!this.llm.isAvailable()) {
      throw new HttpException('AI 暂不可用', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 4) PII 脱敏 (对 fields 做序列化后脱敏)
    const safeFields = dto.fields ? JSON.parse(redactPii(JSON.stringify(dto.fields))) : {};

    // 5) 调 LLM
    let llmResult: LlmCallResult;
    try {
      llmResult = await this.llm.call({
        system: SCORE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildScoreUserPrompt(dto.type, dto.title, dto.description, safeFields),
          },
        ],
        maxTokens: 500,
        temperature: 0.3,
        timeoutMs: 60000,
      });
    } catch (e: any) {
      await this.logUsage(userId, 'score', 0, 0, 0, Date.now() - start, false, e?.message, contentHash);
      throw new HttpException('AI 调用失败', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 6) 解析 LLM JSON
    const parsed = this.parseScoreJson(llmResult.text);
    const durationMs = Date.now() - start;
    const costUsd = this.estimateCost(llmResult.inputTokens, llmResult.outputTokens);

    const response: ScoreResponse = {
      score: parsed.score,
      breakdown: parsed.breakdown,
      suggestions: parsed.suggestions,
      cached: false,
      durationMs,
    };

    // 7) 写缓存 (10 min)
    await this.redis.setEx(cacheKey, JSON.stringify(response), 10 * 60);

    // 8) 写日志
    await this.logUsage(
      userId,
      'score',
      llmResult.inputTokens,
      llmResult.outputTokens,
      costUsd,
      durationMs,
      true,
      null,
      contentHash,
    );

    return response;
  }

  /**
   * rewrite: 3 风格改写 (concise / attractive / seo) + 预计分提升
   * Phase 2.2: 30 分钟缓存 (长于 score, 因为改写更用户驱动)
   */
  async rewrite(userId: bigint | null, dto: RewriteRequestDto): Promise<RewriteResponse> {
    const start = Date.now();

    // 1) 限频 (10/min, 更严)
    await this.checkRateLimit(userId, 'rewrite');

    // 2) 缓存 key (按 type + field + original + context 序列化)
    const contentHash = sha256(
      JSON.stringify({
        type: dto.type,
        field: dto.field,
        original: dto.original,
        context: dto.context,
      }),
    );
    const cacheKey = `ai:rewrite:${contentHash}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      await this.logUsage(userId, 'rewrite', 0, 0, 0, 0, true, null, contentHash);
      return { versions: parsed.versions, cached: true, durationMs: Date.now() - start };
    }

    // 3) LLM 不可用 → 503
    if (!this.llm.isAvailable()) {
      throw new HttpException('AI 暂不可用', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 4) PII 脱敏
    const safeContext = dto.context ? JSON.parse(redactPii(JSON.stringify(dto.context))) : {};
    const safeOriginal = redactPii(dto.original);

    // 5) 调 LLM
    let llmResult: LlmCallResult;
    try {
      llmResult = await this.llm.call({
        system: REWRITE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildRewriteUserPrompt(dto.type, dto.field, safeOriginal, safeContext),
          },
        ],
        maxTokens: 800,
        temperature: 0.8,
        timeoutMs: 60000,
      });
    } catch (e: any) {
      await this.logUsage(userId, 'rewrite', 0, 0, 0, Date.now() - start, false, e?.message, contentHash);
      throw new HttpException('AI 调用失败', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 6) 解析 LLM JSON
    const versions = this.parseRewriteJson(llmResult.text);
    const durationMs = Date.now() - start;
    const costUsd = this.estimateCost(llmResult.inputTokens, llmResult.outputTokens);

    const response: RewriteResponse = { versions, cached: false, durationMs };

    // 7) 写缓存 (30 min, 仅缓存非空结果以避免 LLM 抖动锁死)
    if (versions.length > 0) {
      await this.redis.setEx(cacheKey, JSON.stringify(response), 30 * 60);
    }

    // 8) 写日志
    await this.logUsage(
      userId,
      'rewrite',
      llmResult.inputTokens,
      llmResult.outputTokens,
      costUsd,
      durationMs,
      true,
      null,
      contentHash,
    );

    return response;
  }

  private parseRewriteJson(text: string): RewriteVersion[] {
    const safeParse = (raw: string): RewriteVersion[] | null => {
      try {
        const obj = JSON.parse(raw);
        if (Array.isArray(obj.versions)) {
          return obj.versions
            .filter((v: any) => v.text && v.style)
            .map((v: any) => ({
              text: v.text,
              style: v.style,
              estimatedScoreGain: Math.max(0, Math.min(15, Math.round(v.estimatedScoreGain || 0))),
            }))
            .slice(0, 3);
        }
      } catch {}
      return null;
    };

    // 1) 纯 JSON
    let result = safeParse(text);
    if (result) return result;

    // 2) markdown ```json``` 包装
    const m = text.match(/```(?:json)?\s*(\{[\s\S]+?\})\s*```/);
    if (m) {
      result = safeParse(m[1]);
      if (result) return result;
    }

    // 3) 兜底: 返回空数组
    return [];
  }

  private parseScoreJson(
    text: string,
  ): { score: number; breakdown: ScoreBreakdown; suggestions: string[] } {
    const safeParse = (raw: string) => {
      try {
        const obj = JSON.parse(raw);
        if (typeof obj.score === 'number') {
          return {
            score: Math.max(0, Math.min(100, Math.round(obj.score))),
            breakdown: obj.breakdown || {
              title: 0,
              description: 0,
              completeness: 0,
              contact: 0,
            },
            suggestions: Array.isArray(obj.suggestions) ? obj.suggestions : [],
          };
        }
      } catch {}
      return null;
    };

    // 1) 纯 JSON
    let result = safeParse(text);
    if (result) return result;

    // 2) markdown ```json``` 包装
    const m = text.match(/```(?:json)?\s*(\{[\s\S]+?\})\s*```/);
    if (m) {
      result = safeParse(m[1]);
      if (result) return result;
    }

    // 3) 兜底: 50 分 + 提示失败
    return {
      score: 50,
      breakdown: { title: 0, description: 0, completeness: 0, contact: 0 },
      suggestions: ['AI 评分失败'],
    };
  }

  private parseTitles(text: string): string[] {
    const obj = this.parseLlmJson(text);
    return Array.isArray(obj?.titles) ? obj.titles.slice(0, 3) : [];
  }

  // ============ 私有方法 ============

  private async checkRateLimit(userId: bigint | null, kind: string): Promise<void> {
    if (!userId) return;
    // 每分钟按 kind 分桶 (避免某端点刷爆全局)
    const minuteKey = `ai:rl:${kind}:${userId}:${Math.floor(Date.now() / 60000)}`;
    const minuteCount = await this.redis.incr(minuteKey);
    if (minuteCount === 1) await this.redis.expire(minuteKey, 60);

    // 全局总池 (200/天, 跨 kind 共用)
    const dayKey = `ai:daily:${userId}:${this.todayKey()}`;
    const dayCount = await this.redis.incr(dayKey);
    if (dayCount === 1) await this.redis.expire(dayKey, 24 * 60 * 60);

    const MINUTE_LIMIT = kind === 'rewrite' ? 10 : 30; // rewrite 更严
    if (minuteCount > MINUTE_LIMIT) {
      throw new HttpException('操作太频繁, 请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (dayCount > RATE_LIMIT_PER_DAY) {
      throw new HttpException('今日 AI 调用次数已达上限', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private parseLlmJson(text: string, typeHint?: string): any {
    try {
      return JSON.parse(text);
    } catch {}
    const m = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {}
    }
    const m2 = text.match(/\{[\s\S]+\}/);
    if (m2) {
      try {
        return JSON.parse(m2[0]);
      } catch {}
    }
    this.logger.warn(`LLM 返回非 JSON: ${text.slice(0, 200)}`);
    return {
      type: typeHint ?? 'house',
      typeConfidence: 0.3,
      fields: {},
      fieldsConfidence: {},
      missingFields: [],
      suggestions: { titles: [], tags: [] },
      isBusiness: false,
      businessType: null,
      businessConfidence: 0,
      isForestEconomy: false,
      forestCategory: null,
      forestConfidence: 0,
    };
  }

  private estimateCost(inputTokens: number, outputTokens: number): number {
    // GLM-4.5-Air 约 0.00006 元/1k input, 0.00011 元/1k output (¥)
    // 简化: 用 Claude 估算系数 (Phase 1 不影响业务, 仅审计)
    return (inputTokens * 0.8 + outputTokens * 4) / 1_000_000;
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  private async logUsage(
    userId: bigint | null,
    kind: string,
    inputTokens: number,
    outputTokens: number,
    costUsd: number,
    latencyMs: number,
    success: boolean,
    errorCode: string | null,
    inputHash: string,
  ): Promise<void> {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          userId: userId ?? null,
          kind,
          model: this.llmModel,
          inputTokens,
          outputTokens,
          costUsd,
          latencyMs,
          cached: false,
          success,
          errorCode,
          inputHash,
        },
      });
    } catch (e: any) {
      this.logger.warn(`写 ai_usage_logs 失败: ${e?.message ?? e}`);
    }
  }
}
