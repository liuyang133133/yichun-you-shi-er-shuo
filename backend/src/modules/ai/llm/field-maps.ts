import { AiPostType } from '../dto/extract.dto';

export interface ChipDef {
  label: string;
  key: string;
  format?: (value: any, fields: Record<string, any>) => string;
}

export const CHIP_FIELDS_BY_TYPE: Record<AiPostType, ChipDef[]> = {
  house: [
    { label: '小区', key: 'areaName' },
    { label: '户型', key: 'layout' },
    { label: '租金', key: 'price', format: (v, f) => f.dealType === 'sale' ? `${v} 万` : `${v} 元/月` },
    { label: '面积', key: 'areaSize' },
    { label: '楼层', key: 'floor' },
    { label: '装修', key: 'decoration' },
  ],
  job: [
    { label: '职位', key: 'title' },
    { label: '公司', key: 'companyName' },
    { label: '薪资', key: 'salaryMin', format: (v, f) => f.salaryMax ? `${v}-${f.salaryMax} 元/月` : `${v} 元/月` },
    { label: '学历', key: 'education' },
    { label: '经验', key: 'experience' },
  ],
  secondhand: [
    { label: '物品', key: 'categoryHint' },
    { label: '价格', key: 'price', format: (v) => `${v} 元` },
    { label: '成色', key: 'condition' },
  ],
  lifebiz: [
    { label: '类别', key: 'categoryHint' },
    { label: '联系', key: 'contactHint' },
  ],
};

export interface ExtractChip {
  label: string;
  value: string;
  confidence: number;
}

export function buildChips(
  type: AiPostType,
  fields: Record<string, any>,
  fieldsConfidence: Record<string, number>,
): ExtractChip[] {
  const map = CHIP_FIELDS_BY_TYPE[type] || [];
  return map
    .map((def) => {
      const v = fields[def.key];
      if (v === null || v === undefined || v === '') return null;
      return {
        label: def.label,
        value: def.format ? def.format(v, fields) : String(v),
        confidence: fieldsConfidence[def.key] ?? 0.8,
      };
    })
    .filter((c): c is ExtractChip => c !== null);
}