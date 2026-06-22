import { EXTRACT_SYSTEM_PROMPT, buildExtractUserPrompt } from './extract';

describe('extract prompt', () => {
  describe('EXTRACT_SYSTEM_PROMPT', () => {
    it('包含 4 type 的字段说明', () => {
      // house
      expect(EXTRACT_SYSTEM_PROMPT).toContain('areaName');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('layout');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('dealType');
      // job
      expect(EXTRACT_SYSTEM_PROMPT).toContain('companyName');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('salaryMin');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('salaryMax');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('education');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('experience');
      // secondhand
      expect(EXTRACT_SYSTEM_PROMPT).toContain('categoryHint');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('condition');
      // lifebiz
      expect(EXTRACT_SYSTEM_PROMPT).toContain('contactHint');
    });

    it('提醒 LLM 区分 companyName 和 areaName', () => {
      expect(EXTRACT_SYSTEM_PROMPT).toContain('companyName 不是 areaName');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('碧水木业');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('金水湾');
    });

    it('提醒 LLM 拆 salaryMin/salaryMax', () => {
      expect(EXTRACT_SYSTEM_PROMPT).toContain('salaryMin=8000');
      expect(EXTRACT_SYSTEM_PROMPT).toContain('salaryMax=12000');
    });

    it('包含 4 type 字段映射表 (rule 8)', () => {
      // house 行
      expect(EXTRACT_SYSTEM_PROMPT).toMatch(/house.*dealType.*areaName.*layout/);
      // job 行
      expect(EXTRACT_SYSTEM_PROMPT).toMatch(/job.*companyName.*salaryMin/);
      // secondhand 行
      expect(EXTRACT_SYSTEM_PROMPT).toMatch(/secondhand.*categoryHint.*price.*condition/);
      // lifebiz 行
      expect(EXTRACT_SYSTEM_PROMPT).toMatch(/lifebiz.*categoryHint.*contactHint/);
    });
  });

  describe('buildExtractUserPrompt', () => {
    it('包含用户原文', () => {
      const prompt = buildExtractUserPrompt('出租金水湾 两室一厅 月租1200');
      expect(prompt).toContain('出租金水湾 两室一厅 月租1200');
    });

    it('有 typeHint 时附加声明', () => {
      const prompt = buildExtractUserPrompt('招聘销售', 'job');
      expect(prompt).toContain('job');
      expect(prompt).toContain('用户已选择发布类型');
    });

    it('无 typeHint 时不附加 type 声明', () => {
      const prompt = buildExtractUserPrompt('招聘销售');
      expect(prompt).not.toContain('用户已选择发布类型');
    });
  });
});
