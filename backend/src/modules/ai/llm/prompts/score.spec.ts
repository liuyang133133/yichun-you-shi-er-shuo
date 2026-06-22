import { SCORE_SYSTEM_PROMPT, buildScoreUserPrompt } from './score';

describe('SCORE_SYSTEM_PROMPT', () => {
  it('含 4 维评分标准', () => {
    expect(SCORE_SYSTEM_PROMPT).toContain('title');
    expect(SCORE_SYSTEM_PROMPT).toContain('description');
    expect(SCORE_SYSTEM_PROMPT).toContain('completeness');
    expect(SCORE_SYSTEM_PROMPT).toContain('contact');
    expect(SCORE_SYSTEM_PROMPT).toContain('0-100');
  });
});

describe('buildScoreUserPrompt', () => {
  it('包含 type + title + description + fields', () => {
    const p = buildScoreUserPrompt('house', '金水湾两室一厅 1200', '家电齐全 拎包入住', {
      areaName: '金水湾',
      layout: '两室一厅',
      price: 1200,
    });
    expect(p).toContain('house');
    expect(p).toContain('金水湾两室一厅 1200');
    expect(p).toContain('家电齐全');
    expect(p).toContain('areaName');
  });
});