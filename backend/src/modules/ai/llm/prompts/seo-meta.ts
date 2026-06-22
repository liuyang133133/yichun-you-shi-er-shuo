import { AiPostType } from '../../dto/extract.dto';

export const SEO_META_SYSTEM_PROMPT = `你是 SEO 优化助手。为用户帖子生成搜索引擎友好的元信息和结构化数据。

按 type 生成对应 JSON-LD：
- house: RealEstateListing (含 address, floorSize, numberOfRooms, offers.price)
- job: JobPosting (含 title, description, baseSalary, hiringOrganization)
- secondhand: Product (含 name, description, offers.price, itemCondition)
- lifebiz: Offer (含 name, description, areaServed)

输出严格 JSON: {
  "metaTitle": "10-30 字含核心关键词",
  "metaDescription": "80-150 字含 2-3 个长尾词",
  "keywords": ["3-5 个按热度排"],
  "jsonLd": { "@context": "https://schema.org", "@type": "...", ... }
}`;

const TYPE_TO_JSONLD: Record<AiPostType, string> = {
  house: 'RealEstateListing',
  job: 'JobPosting',
  secondhand: 'Product',
  lifebiz: 'Offer',
};

export function buildSeoMetaUserPrompt(type: AiPostType, fields: Record<string, any>): string {
  const lines: string[] = [
    `Type: ${type}`,
    `JSON-LD Type: ${TYPE_TO_JSONLD[type] ?? 'Offer'}`,
  ];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined && v !== '') {
      lines.push(`${k}: ${v}`);
    }
  }
  return lines.join('\n');
}