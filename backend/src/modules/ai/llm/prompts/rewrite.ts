import { AiPostType } from '../../dto/extract.dto';

export const REWRITE_SYSTEM_PROMPT = `你是文案改写助手。基于用户原文，生成 3 个不同风格的改写版本：

1. **concise** (精简): 长度 -30%，去套话
2. **attractive** (吸引): 加入具体细节 + 情感诉求
3. **seo** (SEO 友好): 自然嵌入 1-2 个长尾关键词

约束：
- 不改核心信息（地址/价格/型号/联系方式）
- 不编造事实
- 输出严格 JSON: { "versions": [{ "text": string, "style": "concise"|"attractive"|"seo", "estimatedScoreGain": number }] }
estimatedScoreGain 是 0-15 的整数，表示相对原文预计提升的质量分。`;

export function buildRewriteUserPrompt(
  type: AiPostType,
  field: 'title' | 'description',
  original: string,
  context?: Record<string, any>,
): string {
  const lines: string[] = [
    `Type: ${type}`,
    `Field: ${field}`,
    `Original: ${original}`,
  ];
  if (context && Object.keys(context).length > 0) {
    lines.push('Context:');
    for (const [k, v] of Object.entries(context)) {
      if (v !== null && v !== undefined && v !== '') {
        lines.push(`- ${k}: ${v}`);
      }
    }
  }
  return lines.join('\n');
}