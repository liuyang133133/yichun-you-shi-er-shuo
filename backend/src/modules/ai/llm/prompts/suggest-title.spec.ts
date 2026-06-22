import { buildSuggestTitleUserPrompt, SUGGEST_TITLE_SYSTEM_PROMPT } from './suggest-title';

describe('SUGGEST_TITLE_SYSTEM_PROMPT', () => {
  it('包含 3 风格描述', () => {
    expect(SUGGEST_TITLE_SYSTEM_PROMPT).toContain('口语');
    expect(SUGGEST_TITLE_SYSTEM_PROMPT).toContain('正式');
    expect(SUGGEST_TITLE_SYSTEM_PROMPT).toContain('吸引');
  });

  it('含禁用词规则', () => {
    expect(SUGGEST_TITLE_SYSTEM_PROMPT).toContain('联系方式');
    expect(SUGGEST_TITLE_SYSTEM_PROMPT).toContain('违规词');
  });
});

describe('buildSuggestTitleUserPrompt', () => {
  it('house: 包含 type + 关键字段', () => {
    const prompt = buildSuggestTitleUserPrompt('house', {
      areaName: '金水湾',
      layout: '两室一厅',
      price: 1200,
    });
    expect(prompt).toContain('金水湾');
    expect(prompt).toContain('两室一厅');
    expect(prompt).toContain('1200');
    expect(prompt).toContain('house');
  });

  it('job: 薪资范围正确格式化', () => {
    const prompt = buildSuggestTitleUserPrompt('job', {
      title: '销售经理',
      salaryMin: 5000,
      salaryMax: 8000,
    });
    expect(prompt).toContain('5000-8000');
  });
});