import { generateSlug, generateSlugBase } from './slug.util';

describe('slug.util', () => {
  describe('generateSlug', () => {
    it('中文标题（带数字+标点）→ 转拼音 + 数字 + hash 后缀', () => {
      const slug = generateSlug('伊春市伊春区房屋出租 ¥1200/月');
      // 期望: yichun-shi-yichun-qu-fangwu-chuzu + 1200 + hash (未命中汉字保留)
      expect(slug).toMatch(/^yichun-shi-yichun-qu-fangwu-chuzu-1200-/);
      expect(slug).toMatch(/-[a-z0-9]{4}$/);
      expect(slug.length).toBeLessThanOrEqual(60);
    });

    it('二手本田飞度 2018 款 → 拼音 + 数字 + hash', () => {
      const slug = generateSlug('二手本田飞度 2018 款');
      expect(slug).toMatch(/^ershou-bentian-feidu-2018-/);
      expect(slug).toMatch(/-[a-z0-9]{4}$/);
    });

    it('招聘 收银员 周末双休 → 拼音 + hash', () => {
      const slug = generateSlug('招聘 收银员 周末双休');
      // 包含 zhaopin、shouyin 等拼音片段即可，具体组合依赖映射优先级
      expect(slug).toMatch(/zhaopin/);
      expect(slug).toMatch(/zhoumo/);
      expect(slug).toMatch(/-[a-z0-9]{4}$/);
    });

    it('纯英文标题 → 小写 + 空格转 - + hash', () => {
      const slug = generateSlug('Hello World!');
      expect(slug).toMatch(/^hello-world-[a-z0-9]{4}$/);
    });

    it('空字符串 → fallback "post-<hash>"', () => {
      const slug = generateSlug('');
      expect(slug).toMatch(/^post-[a-z0-9]{4}$/);
    });

    it('长度不超过 60 字符（极端长标题）', () => {
      const longTitle = '招聘'.repeat(50);
      const slug = generateSlug(longTitle);
      expect(slug.length).toBeLessThanOrEqual(60);
      expect(slug).toMatch(/[a-z0-9]{4}$/);
    });

    it('hash 是 deterministic（同 title → 同 hash）', () => {
      const a = generateSlug('伊春房屋出租');
      const b = generateSlug('伊春房屋出租');
      expect(a).toBe(b);
    });

    it('不同 title → hash 不同', () => {
      const a = generateSlug('伊春房屋出租');
      const b = generateSlug('伊春二手交易');
      expect(a).not.toBe(b);
    });

    it('连续标点折叠成单个 -', () => {
      const slug = generateSlug('Hello!!!World???');
      expect(slug).toMatch(/^hello-world-[a-z0-9]{4}$/);
    });
  });

  describe('generateSlugBase', () => {
    it('中文标题生成 base（无 hash）', () => {
      const base = generateSlugBase('伊春房屋出租');
      expect(base).toBe('yichun-fangwu-chuzu');
    });

    it('空字符串 → "post"', () => {
      expect(generateSlugBase('')).toBe('post');
    });

    it('纯标点 → "post"', () => {
      expect(generateSlugBase('!!!')).toBe('post');
    });
  });
});