/**
 * seo-tdk.ts — 页面 Title/Description/Keywords
 *
 * 复用 modules.tsx 的 keywords 字段，单一来源
 */
import { MODULE_BY_CODE, type PostType } from './modules';

export type { PostType };

export interface TDK {
  title: string;
  description: string;
  keywords: string[];
}

export const DEFAULT_TDK: TDK = {
  title: '伊春有事儿说 - 小兴安岭本地生活信息平台',
  description: '伊春本地房屋租售、二手交易、招聘求职、便民信息。',
  keywords: ['伊春', '伊春有事儿说', '伊春本地信息'],
};

export const TYPE_TDK: Record<PostType, TDK> = Object.keys(MODULE_BY_CODE).reduce(
  (acc, code) => {
    const m = MODULE_BY_CODE[code as PostType];
    acc[m.code] = {
      title: `伊春${m.title} - 本地真实信息 | 伊春有事儿说`,
      description: `伊春本地${m.title}信息，${m.desc}，本地人发布，本地人浏览。`,
      keywords: m.keywords,
    };
    return acc;
  },
  {} as Record<PostType, TDK>,
);

// 区县 TDK - 简化: type+area 组合用默认
export const AREA_TDK: Record<string, TDK> = {};