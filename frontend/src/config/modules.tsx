/**
 * modules.tsx — 4 大业务模块元数据集中地
 *
 * V1.0: 房屋租售 / 二手交易 / 招聘求职 / 便民信息
 *
 * 统一 PostCard / Hero / Detail 页面三处对模块视觉的处理
 */

import type { ComponentType } from 'react';
import { Home, ShoppingBag, Briefcase, Megaphone } from 'lucide-react';

export type PostType = 'house' | 'secondhand' | 'job' | 'lifebiz';

export interface ModuleMeta {
  code: PostType;
  title: string;
  subtitle: string;       // 英文
  desc: string;           // 一句话副标题
  icon: ComponentType<{ className?: string }>;
  /** Tailwind gradient class (from-via-to) — 用于 Hero/banner */
  gradient: string;
  /** Emoji — 用于 PostCard 占位 */
  emoji: string;
  /** 占位 emoji 卡片色调 (from-via-to) */
  cardGradient: string;
  /** 类型 chip 样式 (bg + text + ring) */
  chipTone: string;
  /** 关键词（搜索/SEO） */
  keywords: string[];
}

export const MODULES: ModuleMeta[] = [
  {
    code: 'house',
    title: '房屋租售',
    subtitle: 'House Rental & Sale',
    desc: '整租 / 合租 / 短租 / 商铺',
    icon: Home,
    gradient: 'from-blue-500 via-blue-600 to-indigo-700',
    emoji: '🏠',
    cardGradient: 'from-blue-500 via-blue-600 to-indigo-700',
    chipTone: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    keywords: ['伊春租房', '伊春二手房', '伊春房屋租售', '伊春卖房'],
  },
  {
    code: 'secondhand',
    title: '二手交易',
    subtitle: 'Secondhand',
    desc: '数码 / 家电 / 服饰 / 图书',
    icon: ShoppingBag,
    gradient: 'from-pink-500 via-rose-600 to-fuchsia-700',
    emoji: '🛍️',
    cardGradient: 'from-pink-500 via-rose-600 to-fuchsia-700',
    chipTone: 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:ring-pink-800',
    keywords: ['伊春二手', '伊春二手交易', '伊春闲置', '伊春二手市场'],
  },
  {
    code: 'job',
    title: '招聘求职',
    subtitle: 'Job & Career',
    desc: '销售 / 餐饮 / 技工 / 互联网',
    icon: Briefcase,
    gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    emoji: '💼',
    cardGradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    chipTone: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    keywords: ['伊春招聘', '伊春求职', '伊春找工作', '伊春招聘网'],
  },
  {
    code: 'lifebiz',
    title: '便民信息',
    subtitle: 'Local Services',
    desc: '顺风车 / 家政 / 打听事 / 维修',
    icon: Megaphone,
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    emoji: '📌',
    cardGradient: 'from-amber-500 via-orange-600 to-red-600',
    chipTone: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    keywords: ['伊春便民', '伊春顺风车', '伊春家政', '伊春打听事'],
  },
];

export const MODULE_BY_CODE: Record<PostType, ModuleMeta> = MODULES.reduce(
  (acc, m) => {
    acc[m.code] = m;
    return acc;
  },
  {} as Record<PostType, ModuleMeta>,
);