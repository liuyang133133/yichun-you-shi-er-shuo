export type PostType = 'house' | 'job' | 'secondhand' | 'lifebiz';

export interface TDK {
  title: string;
  description: string;
  keywords: string[];
}

export const DEFAULT_TDK: TDK = {
  title: '伊春有事儿说 - 小兴安岭本地生活信息平台',
  description: '伊春本地房屋出租、二手交易、招聘求职、便民信息。',
  keywords: ['伊春', '伊春有事儿说', '伊春本地信息'],
};

export const TYPE_TDK: Record<PostType, TDK> = {
  house: {
    title: '伊春房屋出租出售 - 真实房源 | 伊春有事儿说',
    description: '伊春本地房屋出租出售信息，金水湾、南郡、桦林等小区真实房源，房东直租无中介费。',
    keywords: ['伊春租房', '伊春二手房', '伊春房屋出租', '伊春卖房'],
  },
  job: {
    title: '伊春招聘求职 - 本地好工作 | 伊春有事儿说',
    description: '伊春本地招聘信息，销售、餐饮、技工、互联网等岗位，求职者找工作平台。',
    keywords: ['伊春招聘', '伊春求职', '伊春找工作', '伊春招聘网'],
  },
  secondhand: {
    title: '伊春二手交易 - 二手物品买卖 | 伊春有事儿说',
    description: '伊春本地二手交易信息，数码、家电、服饰、图书等闲置物品。',
    keywords: ['伊春二手', '伊春二手交易', '伊春闲置', '伊春二手市场'],
  },
  lifebiz: {
    title: '伊春便民信息 - 顺风车/家政/打听事 | 伊春有事儿说',
    description: '伊春本地便民信息发布平台，顺风车、家政、维修、打听事等。',
    keywords: ['伊春便民', '伊春顺风车', '伊春家政', '伊春打听事'],
  },
};

// 区县 TDK - Phase 2.2a 简化: type+area 组合用默认
export const AREA_TDK: Record<string, TDK> = {};