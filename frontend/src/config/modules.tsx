/**
 * modules.tsx — 9 大业务模块元数据集中地
 *
 * F-2: 4 大模块 + 5 个伊春本地刚需分类
 * (carpool/lostfound/contact/forestry/dating)
 *
 * 统一 PostCard / Hero / Detail 页面三处对模块视觉的处理
 */

import type { ComponentType } from 'react';
import { Home, ShoppingBag, Briefcase, Megaphone, Car, Search, Phone, TreePine, Heart } from 'lucide-react';

export type PostType =
  | 'house'
  | 'secondhand'
  | 'job'
  | 'lifebiz'
  | 'carpool'
  | 'lostfound'
  | 'contact'
  | 'forestry'
  | 'dating';

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
    title: '房屋出租',
    subtitle: 'House Rental',
    desc: '整租 / 合租 / 短租 / 商铺',
    icon: Home,
    gradient: 'from-blue-500 via-blue-600 to-indigo-700',
    emoji: '🏠',
    cardGradient: 'from-blue-500 via-blue-600 to-indigo-700',
    chipTone: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    keywords: ['伊春租房', '伊春二手房', '伊春房屋出租', '伊春卖房'],
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
  // F-2: 5 个伊春本地刚需分类（业务审计 P0 修复）
  {
    code: 'carpool',
    title: '拼车/顺风车',
    subtitle: 'Carpool',
    desc: '跨县 / 同城 / 长途 / 通勤',
    icon: Car,
    gradient: 'from-violet-500 via-purple-600 to-fuchsia-700',
    emoji: '🚗',
    cardGradient: 'from-violet-500 via-purple-600 to-fuchsia-700',
    chipTone: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800',
    keywords: ['伊春拼车', '伊春顺风车', '伊美区拼车', '南岔拼车', '跨县拼车'],
  },
  {
    code: 'lostfound',
    title: '失物招领',
    subtitle: 'Lost & Found',
    desc: '寻物 / 拾物 / 寻宠 / 寻人',
    icon: Search,
    gradient: 'from-cyan-500 via-sky-600 to-blue-700',
    emoji: '🔍',
    cardGradient: 'from-cyan-500 via-sky-600 to-blue-700',
    chipTone: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-800',
    keywords: ['伊春失物招领', '伊春寻物', '伊春拾物', '伊春寻宠'],
  },
  {
    code: 'contact',
    title: '便民电话',
    subtitle: 'Contacts',
    desc: '供暖 / 物业 / 派出所 / 医院',
    icon: Phone,
    gradient: 'from-lime-500 via-green-600 to-emerald-700',
    emoji: '📞',
    cardGradient: 'from-lime-500 via-green-600 to-emerald-700',
    chipTone: 'bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-950/40 dark:text-lime-300 dark:ring-lime-800',
    keywords: ['伊春便民电话', '伊春供暖电话', '伊春物业电话', '伊春派出所'],
  },
  {
    code: 'forestry',
    title: '林下经济',
    subtitle: 'Forestry',
    desc: '蓝莓 / 木耳 / 松子 / 榛子 / 蘑菇',
    icon: TreePine,
    gradient: 'from-green-500 via-emerald-600 to-teal-700',
    emoji: '🌲',
    cardGradient: 'from-green-500 via-emerald-600 to-teal-700',
    chipTone: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-800',
    keywords: ['伊春林下经济', '伊春蓝莓', '伊春木耳', '伊春松子', '小兴安岭特产'],
  },
  {
    code: 'dating',
    title: '同城交友',
    subtitle: 'Dating & Meetup',
    desc: '同城活动 / 兴趣交友 / 相亲',
    icon: Heart,
    gradient: 'from-rose-500 via-pink-600 to-red-700',
    emoji: '💕',
    cardGradient: 'from-rose-500 via-pink-600 to-red-700',
    chipTone: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    keywords: ['伊春交友', '伊春相亲', '伊春同城活动', '伊春征婚'],
  },
];

export const MODULE_BY_CODE: Record<PostType, ModuleMeta> = MODULES.reduce(
  (acc, m) => {
    acc[m.code] = m;
    return acc;
  },
  {} as Record<PostType, ModuleMeta>,
);