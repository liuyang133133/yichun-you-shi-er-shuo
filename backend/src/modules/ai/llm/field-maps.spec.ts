import { buildChips, CHIP_FIELDS_BY_TYPE } from './field-maps';

describe('CHIP_FIELDS_BY_TYPE', () => {
  it('house 包含小区/户型/租金/面积/楼层/装修', () => {
    const keys = CHIP_FIELDS_BY_TYPE.house.map((def) => def.key);
    expect(keys).toEqual(expect.arrayContaining(['areaName', 'layout', 'price', 'areaSize', 'floor', 'decoration']));
  });
  it('job 包含职位/公司/薪资/学历/经验', () => {
    const keys = CHIP_FIELDS_BY_TYPE.job.map((def) => def.key);
    expect(keys).toEqual(expect.arrayContaining(['title', 'companyName', 'salaryMin', 'education', 'experience']));
  });
  it('secondhand 包含物品/价格/成色', () => {
    const keys = CHIP_FIELDS_BY_TYPE.secondhand.map((def) => def.key);
    expect(keys).toEqual(expect.arrayContaining(['categoryHint', 'price', 'condition']));
  });
  it('lifebiz 包含类别/联系', () => {
    const keys = CHIP_FIELDS_BY_TYPE.lifebiz.map((def) => def.key);
    expect(keys).toEqual(expect.arrayContaining(['categoryHint', 'contactHint']));
  });
});

describe('buildChips', () => {
  it('house: 6 个字段映射正确, 价格带 "元/月"', () => {
    const chips = buildChips('house', {
      areaName: '金水湾',
      layout: '两室一厅',
      price: 1200,
      areaSize: 80,
    }, { areaName: 0.95, layout: 0.9, price: 0.85, areaSize: 0.7 });
    expect(chips).toEqual([
      { label: '小区', value: '金水湾', confidence: 0.95 },
      { label: '户型', value: '两室一厅', confidence: 0.9 },
      { label: '租金', value: '1200 元/月', confidence: 0.85 },
      { label: '面积', value: '80', confidence: 0.7 },
    ]);
  });

  it('job: 薪资带范围, 缺字段跳过', () => {
    const chips = buildChips('job', {
      title: '销售经理',
      companyName: '碧水木业',
      salaryMin: 5000,
      salaryMax: 8000,
    }, { title: 0.9, companyName: 0.8, salaryMin: 0.85, salaryMax: 0.85 });
    expect(chips).toEqual([
      { label: '职位', value: '销售经理', confidence: 0.9 },
      { label: '公司', value: '碧水木业', confidence: 0.8 },
      { label: '薪资', value: '5000-8000 元/月', confidence: 0.85 },
    ]);
  });

  it('空字段返回空数组', () => {
    expect(buildChips('house', {}, {})).toEqual([]);
  });
});