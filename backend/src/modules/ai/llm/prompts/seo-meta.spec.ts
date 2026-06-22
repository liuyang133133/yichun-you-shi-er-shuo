import { SEO_META_SYSTEM_PROMPT, buildSeoMetaUserPrompt } from './seo-meta';

describe('SEO_META_SYSTEM_PROMPT', () => {
  it('含 4 type 的 JSON-LD 规范', () => {
    expect(SEO_META_SYSTEM_PROMPT).toContain('RealEstateListing');
    expect(SEO_META_SYSTEM_PROMPT).toContain('JobPosting');
    expect(SEO_META_SYSTEM_PROMPT).toContain('Product');
    expect(SEO_META_SYSTEM_PROMPT).toContain('Offer');
  });
  it('输出 JSON 结构', () => {
    expect(SEO_META_SYSTEM_PROMPT).toContain('metaTitle');
    expect(SEO_META_SYSTEM_PROMPT).toContain('metaDescription');
    expect(SEO_META_SYSTEM_PROMPT).toContain('keywords');
    expect(SEO_META_SYSTEM_PROMPT).toContain('jsonLd');
  });
});

describe('buildSeoMetaUserPrompt', () => {
  it('house: 包含 type + title + key fields', () => {
    const p = buildSeoMetaUserPrompt('house', {
      title: '金水湾两室一厅 1200', description: '...', areaName: '金水湾', price: 1200, layout: '两室一厅', areaSize: 80,
    });
    expect(p).toContain('house');
    expect(p).toContain('金水湾');
    expect(p).toContain('RealEstateListing');
  });
});