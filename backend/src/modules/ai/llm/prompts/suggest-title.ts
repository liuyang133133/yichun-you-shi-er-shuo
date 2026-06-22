import { AiPostType } from '../../dto/extract.dto';

export const SUGGEST_TITLE_SYSTEM_PROMPT = `你是伊春本地分类信息平台"伊春有事儿说"的标题优化助手。
基于用户帖子的关键字段，生成 3 个不同风格的中文标题：

1. **口语风** (concise): 15 字以内，直白描述核心卖点
2. **正式风** (professional): 20-25 字，包含关键属性词
3. **吸引风** (attractive): 20-30 字，含 1 个 emoji，刺激点击

约束：
- 必须包含 type 对应的关键属性（如 house 必须有 areaName + layout + price）
- 禁止虚假/夸大
- 禁止联系方式（电话/微信/QQ）
- 禁止"急售""最低价"等违规词

输出严格 JSON: { "titles": ["...", "...", "..."] }`;

export function buildSuggestTitleUserPrompt(
  type: AiPostType,
  fields: Record<string, any>,
): string {
  const lines: string[] = [
    `Type: ${type}`,
    'Fields:',
  ];

  // job 类型: 把 salaryMin + salaryMax 合并为 "薪资范围" 行 (LLM 更易解析)
  if (type === 'job' && (fields.salaryMin != null || fields.salaryMax != null)) {
    const min = fields.salaryMin ?? '?';
    const max = fields.salaryMax ?? '?';
    lines.push(`- salaryRange: ${min}-${max}`);
  }

  for (const [k, v] of Object.entries(fields)) {
    if (k === 'salaryMin' || k === 'salaryMax') continue; // 已合并
    if (v === null || v === undefined || v === '') continue;
    lines.push(`- ${k}: ${v}`);
  }
  return lines.join('\n');
}