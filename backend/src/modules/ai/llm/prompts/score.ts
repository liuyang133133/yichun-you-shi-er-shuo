import { AiPostType } from '../../dto/extract.dto';

export const SCORE_SYSTEM_PROMPT = `你是伊春本地分类信息平台的质量审核 AI。
对用户帖子打 4 维质量分，每维 0-25 分，总分 0-100。

评分标准：
- **title (0-25)**:
  - 长度 10-30 字 +10；含核心属性词（小区/户型/价格/品牌/职位）+10；通顺无错字 +5
- **description (0-25)**:
  - 长度 30-200 字 +10；包含具体细节（配套/福利/成色/服务时间）+10；无套话 +5
- **completeness (0-25)**:
  - 必填字段覆盖度（按 type 不同，缺一扣 5 分）
- **contact (0-25)**:
  - 有电话/微信 +15；描述里说"私聊可议价" +5；提到"可看房/可面试/可面交" +5

输出严格 JSON: { "score": number, "breakdown": {title, description, completeness, contact}, "suggestions": [string, ...] }
suggestions 必须具体可执行，如"标题加价格"而不是"标题质量差"。`;

export function buildScoreUserPrompt(
  type: AiPostType,
  title: string,
  description: string | undefined,
  fields: Record<string, any>,
): string {
  const lines: string[] = [
    `Type: ${type}`,
    `Title: ${title}`,
  ];
  if (description) lines.push(`Description: ${description}`);
  if (fields && Object.keys(fields).length > 0) {
    lines.push('Fields:');
    for (const [k, v] of Object.entries(fields)) {
      if (v !== null && v !== undefined && v !== '') {
        lines.push(`- ${k}: ${v}`);
      }
    }
  }
  return lines.join('\n');
}