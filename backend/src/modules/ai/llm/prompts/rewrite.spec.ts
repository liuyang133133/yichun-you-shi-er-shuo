import { REWRITE_SYSTEM_PROMPT, buildRewriteUserPrompt } from './rewrite';

describe('REWRITE_SYSTEM_PROMPT', () => {
  it('含 3 风格描述', () => {
    expect(REWRITE_SYSTEM_PROMPT).toContain('concise');
    expect(REWRITE_SYSTEM_PROMPT).toContain('attractive');
    expect(REWRITE_SYSTEM_PROMPT).toContain('seo');
  });
  it('含约束 (不改核心/不编造)', () => {
    expect(REWRITE_SYSTEM_PROMPT).toContain('不改');
    expect(REWRITE_SYSTEM_PROMPT).toContain('不编造');
  });
});

describe('buildRewriteUserPrompt', () => {
  it('包含 type + field + original + context', () => {
    const p = buildRewriteUserPrompt('house', 'title', '金水湾出租 1200', { layout: '两室一厅' });
    expect(p).toContain('house');
    expect(p).toContain('title');
    expect(p).toContain('金水湾出租 1200');
    expect(p).toContain('两室一厅');
  });
});