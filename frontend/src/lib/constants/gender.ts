/**
 * 性别枚举文案
 *
 * 后端 User.gender 字段为 TinyInt (0/1/2),前端用此常量做 UI 映射。
 * 修改此文件需同步检查 /me 资料编辑抽屉(/me/security 也已下线该字段)。
 */
export const GENDER_OPTIONS = [
  { value: 0, label: '不透露' },
  { value: 1, label: '男'     },
  { value: 2, label: '女'     },
] as const;

export type GenderValue = 0 | 1 | 2;

/** 校验 gender 是否为合法值 */
export function isValidGender(v: unknown): v is GenderValue {
  return v === 0 || v === 1 || v === 2;
}