import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * 敏感词过滤（DFA 字典树实现）
 *
 * 用途：post/comment/report 写入前过滤
 * 词表：V1 默认 50+ 词（生产建议接阿里云内容安全 / 关键词库服务）
 * 存储：Redis 缓存（key: sensitive:words:list）
 *
 * 用法：
 *   await this.sensitiveWordService.check('xxx内容');
 *   if (contains) throw new BadRequestException('内容包含敏感词');
 */
@Injectable()
export class SensitiveWordService {
  private readonly logger = new Logger(SensitiveWordService.name);
  private readonly REDIS_KEY = 'sensitive:words:list';
  private readonly DEFAULT_WORDS = [
    // 涉黄（基础）
    '色情', '裸聊', '一夜情', '上门服务', '包养', '找小姐',
    // 博彩
    '赌博', '博彩', '百家乐', '澳门威尼斯', '六合彩', '时时彩',
    // 毒品
    '毒品', '冰毒', '海洛因', '大麻', 'K粉', '摇头丸',
    // 违禁品
    '枪支', '弹药', '管制刀具', '迷药', '春药',
    // 诈骗
    '兼职刷单', '刷信誉', '套现', '代开发票', '高仿', 'A货',
    // 政治敏感
    '反动', '法轮', '邪教', '台独', '港独',
    // 虚假广告
    '稳赚不赔', '100%中奖', '免费送', '点击赚钱',
  ];

  // DFA 字典树节点（用 Map 实现）
  private root: Map<string, any> = new Map();
  private initialized = false;

  constructor(private readonly redis: RedisService) {}

  /**
   * 检查文本是否含敏感词
   * 返回：{ hit: boolean, words: string[] }
   */
  async check(text: string): Promise<{ hit: boolean; words: string[] }> {
    if (!text) return { hit: false, words: [] };
    await this.ensureLoaded();
    const hits: string[] = [];
    const lower = text.toLowerCase();

    let i = 0;
    while (i < lower.length) {
      let node: Map<string, any> | undefined = this.root.get(lower[i]);
      if (!node) { i++; continue; }

      let j = i + 1;
      let matched = '';
      while (node && j <= lower.length) {
        if (node.get('END')) {
          matched = lower.slice(i, j);
        }
        const ch = lower[j];
        node = node.get(ch) as Map<string, any> | undefined;
        j++;
      }
      // 末尾也要检查
      if (node?.get('END') && !matched) {
        matched = lower.slice(i, j);
      }
      if (matched) {
        hits.push(matched);
        i += matched.length;
      } else {
        i++;
      }
    }

    return { hit: hits.length > 0, words: Array.from(new Set(hits)) };
  }

  /**
   * 同步 check + 抛错
   */
  async assertClean(text: string, field = '内容'): Promise<void> {
    const r = await this.check(text);
    if (r.hit) {
      this.logger.warn(`[敏感词] ${field} 含敏感词: ${r.words.join(',')} | 原文前 50 字: ${text.slice(0, 50)}`);
      throw new BadRequestException(`${field}包含违规内容，请修改后重试`);
    }
  }

  /**
   * 替换敏感词为 ***
   */
  async mask(text: string): Promise<string> {
    const r = await this.check(text);
    if (!r.hit) return text;
    let masked = text;
    for (const w of r.words) {
      const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      masked = masked.replace(re, '*'.repeat(w.length));
    }
    return masked;
  }

  /**
   * 热加载敏感词表（Redis 优先，fallback 默认）
   */
  async ensureLoaded(): Promise<void> {
    if (this.initialized) return;
    let words: string[] = this.DEFAULT_WORDS;
    try {
      const cached = await this.redis.get(this.REDIS_KEY);
      if (cached) {
        words = JSON.parse(cached);
      } else {
        await this.redis.setEx(this.REDIS_KEY, JSON.stringify(words), 86400);
      }
    } catch (e) {
      this.logger.warn(`[敏感词] 加载 Redis 失败，使用默认词表: ${(e as Error).message}`);
    }
    this.buildTree(words);
    this.initialized = true;
  }

  /**
   * 构建 DFA 字典树
   */
  private buildTree(words: string[]): void {
    this.root.clear();
    for (const word of words) {
      const w = word.toLowerCase();
      let node = this.root;
      for (const ch of w) {
        let child = node.get(ch) as Map<string, any> | undefined;
        if (!child) {
          child = new Map<string, any>();
          node.set(ch, child);
        }
        node = child;
      }
      node.set('END', true);
    }
  }

  /**
   * 重新加载（admin 改了敏感词表后调用）
   */
  async reload(words: string[]): Promise<void> {
    await this.redis.setEx(this.REDIS_KEY, JSON.stringify(words), 86400);
    this.buildTree(words);
    this.initialized = true;
  }
}
