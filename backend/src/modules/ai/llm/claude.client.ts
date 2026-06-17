import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeCallOptions {
  system?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface ClaudeCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
}

/**
 * Claude API 客户端封装
 * - 启动期校验 API key 存在 (但不强校验有效性, dev 阶段可延迟到第一次调用)
 * - 统一超时控制 (默认 5s)
 * - 错误结构化, 上层可捕获
 */
@Injectable()
export class ClaudeClient implements OnModuleInit {
  private readonly logger = new Logger(ClaudeClient.name);
  private client: Anthropic | null = null;
  private model = 'claude-haiku-4-5-20251001';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey && !apiKey.includes('PLACEHOLDER')) {
      this.client = new Anthropic({ apiKey });
      const m = this.config.get<string>('ANTHROPIC_MODEL');
      if (m) this.model = m;
      this.logger.log(`Claude client initialized (model=${this.model})`);
    } else {
      this.logger.warn(
        'ANTHROPIC_API_KEY not configured or is placeholder, AI endpoints will return 503',
      );
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * 调用 Claude API
   * 抛出错误时上层应捕获并降级
   */
  async call(opts: ClaudeCallOptions): Promise<ClaudeCallResult> {
    if (!this.client) {
      throw new Error(
        'AI_UNAVAILABLE: Claude client not initialized, please check ANTHROPIC_API_KEY',
      );
    }

    const start = Date.now();
    const maxTokens = opts.maxTokens ?? 1024;
    const temperature = opts.temperature ?? 0.2;
    const timeoutMs = opts.timeoutMs ?? 5000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          system: opts.system,
          messages: opts.messages,
        },
        { signal: controller.signal },
      );

      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      return {
        text,
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
        model: this.model,
        latencyMs: Date.now() - start,
      };
    } catch (e: any) {
      const code = e?.status || e?.code || 'UNKNOWN';
      throw new Error(`CLAUDE_${code}: ${e?.message ?? String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
