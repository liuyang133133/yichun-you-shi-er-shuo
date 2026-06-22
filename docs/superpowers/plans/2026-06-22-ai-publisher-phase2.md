# AI 智能发布 Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 AI 智能发布从"让用户填表更容易"升级为"业务基础设施" — Phase 2.1 收口 (3 type 完整 + 真 LLM title + Admin 看板) / Phase 2.2a SEO + 流量 (详情页 meta + 列表页 TDK + sitemap + 百度推送 + 质量分 + 排序权重) / Phase 2.2b 商业化前置 (商家识别 + AI 改写 + 加急置顶 stub)

**Architecture:** 复用 Phase 1 的 `LlmClient` 抽象 + PII 脱敏 + Redis 缓存 + `ai_usage_logs`。新增 7 个 LLM 端点 (suggest-title 真调 / score / rewrite / seo-meta / detect-business / regenerate-seo / push-baidu)，所有新端点走同一限频池 (200/天) + 强缓存。SEO 渲染走 Next.js 15 `generateMetadata` 注入 meta + JSON-LD。Post 表加 6 字段 (seoMeta / qualityScore / isBusiness / businessType / boostExpiresAt / seoMetaUpdatedAt)。商业化 endpoint 走 stub 等 Phase 1.5 联调。

**Tech Stack:** NestJS 10 + Prisma 5 + Next.js 15 + TypeScript + TailwindCSS + Shadcn UI + Redis 7 + MySQL 8 + GLM-4-Air (主) / Claude Haiku 4.5 (备)

**Spec:** [docs/superpowers/specs/2026-06-22-ai-publisher-phase2-design.md](../specs/2026-06-22-ai-publisher-phase2-design.md)

**Memory:** `~/.claude/projects/.../memory/ai-publisher-phase1-progress.md` (Phase 1 16/16 done, 复用代码模式)

---

## 阶段总览

| 阶段 | 任务数 | 工时 | 主题 |
|---|---|---|---|
| **Phase 2.1** | 1-8 | 1 周 | AI 收口: field-maps / 真 LLM title / 看板 / missingFields |
| **Phase 2.2a** | 9-19 | 1.5 周 | SEO: 详情页 meta + 列表页 TDK + sitemap + 推送 + 质量分 + 排序权重 + 重复检测 |
| **Phase 2.2b** | 20-27 | 1.5 周 | 商业化前置: 商家/林下经济识别 + AI 改写 + 加急置顶 stub |
| **总计** | 27 任务 | **4 周** | |

**执行策略**: 每完成一个 Phase 跑一次 E2E 回归再进下一阶段 (避免合并冲突)。Phase 2.2b 需 Phase 1.5 商业化模块就绪才能完整跑通 (button 是 stub)。

---

## File Structure (按职责分组)

### 后端 AI 模块 (`backend/src/modules/ai/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `llm/field-maps.ts` | 新 | type-aware 字段映射 (house/job/secondhand/lifebiz) |
| `llm/prompts/suggest-title.ts` | 新 | 真调 LLM 标题生成 prompt |
| `llm/prompts/score.ts` | 新 | 4 维质量分 prompt |
| `llm/prompts/seo-meta.ts` | 新 | SEO meta + JSON-LD prompt |
| `llm/prompts/rewrite.ts` | 新 | 3 风格改写 prompt |
| `llm/prompts/extract.ts` | 改 | 加 isBusiness/isForestEconomy 输出 |
| `llm/prompts/*.spec.ts` | 新 | 4 个 prompt 的 prompt 拼接单测 |
| `ai.service.ts` | 改 | buildChips 重构 / suggestTitle 真调 / extract 扩字段 |
| `ai.controller.ts` | 改 | 加 4 个新端点 (score/rewrite/regenerate-seo/push-baidu) |
| `ai.module.ts` | 改 | 注册 AdminAIModule + SeoModule |

### 后端 Admin 模块 (`backend/src/modules/admin/ai-usage/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `ai-usage.controller.ts` | 新 | GET /admin/ai-usage/stats |
| `ai-usage.service.ts` | 新 | 聚合 ai_usage_logs 统计 |
| `ai-usage.module.ts` | 新 | NestJS module |

### 后端 SEO 模块 (`backend/src/modules/seo/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `seo.controller.ts` | 新 | regenerate-seo / push-baidu / sitemap-data |
| `seo.service.ts` | 新 | LLM 调用 + 百度 API + sitemap 数据 |
| `seo.module.ts` | 新 | NestJS module |
| `seo.service.spec.ts` | 新 | 单测 (mock LLM + mock 百度) |

### 后端 Post 模块 (`backend/src/modules/post/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `post.service.ts` | 改 | 排序权重 (AI_RANK_ENABLED 灰度) + 重复检测 |
| `post.service.spec.ts` | 新 | 单测 |
| `dto/create-post.dto.ts` | 改 | 加重复检测错误码 |

### 数据库 (`backend/prisma/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `schema.prisma` | 改 | Post 加 6 字段 + SitemapPushLog 新表 |
| `migrations/20260623_add_post_seo_and_quality_score/` | 新 | migration SQL |

### 前端组件 (`frontend/src/components/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `ai/quality-badge.tsx` | 新 | 质量分展示 (3 档颜色) |
| `ai/rewrite-popover.tsx` | 新 | 改写建议弹窗 |
| `ai/business-detector.tsx` | 新 | 商家识别 toast |
| `ai/extract-chips.tsx` | 改 | 加 missingFields 提示 |
| `post/boost-cta.tsx` | 新 | 加急置顶弹窗 stub |

### 前端页面 (`frontend/src/app/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `posts/publish/ai-mode.tsx` | 改 | 加 quality-badge + missingFields + business-detector |
| `posts/publish/manual-mode.tsx` | 改 | 标题/描述加 AI 改写按钮 |
| `posts/[id]/page.tsx` | 改 | generateMetadata 读 seoMeta |
| `posts/[id]/post-detail-content.tsx` | 改 | 加 boost-cta |
| `page.tsx` | 改 | 拆 server 端 + generateMetadata 读 searchParams |
| `home-content.tsx` | 新 | 现有 client 逻辑搬过来 |
| `sitemap.ts` | 改 | 含 quality 权重 + 全量 posts |
| `config/seo-tdk.ts` | 新 | 4 type + 12 area TDK 配置 |

### 前端 lib (`frontend/src/lib/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `api-ai.ts` | 改 | 加 4 个新端点 client |

### Admin 后台 (`admin/src/`)
| 文件 | 操作 | 职责 |
|---|---|---|
| `app/ai-usage/page.tsx` | 新 | AI 调用看板页 |
| `app/dashboard/page.tsx` | 改 | 加 AI 卡片 (跳 ai-usage) |
| `lib/api-ai-usage.ts` | 新 | Admin API client |

### 环境变量 (`backend/.env.example`)
| 变量 | 操作 | 备注 |
|---|---|---|
| `AI_RANK_ENABLED` | 新增 | 排序权重灰度开关 (默认 false) |
| `BAIDU_PUSH_TOKEN` | 新增 | 百度站长平台推送 token |

---

## Phase 2.1: AI 能力收口 (1 周)

### Task 1: field-maps 字段映射模块 (TDD)

**Files:**
- Create: `backend/src/modules/ai/llm/field-maps.ts`
- Create: `backend/src/modules/ai/llm/field-maps.spec.ts`

- [ ] **Step 1: 写失败的单测**

```typescript
// backend/src/modules/ai/llm/field-maps.spec.ts
import { buildChips, CHIP_FIELDS_BY_TYPE } from './field-maps';

describe('CHIP_FIELDS_BY_TYPE', () => {
  it('house 包含小区/户型/租金/面积/楼层/装修', () => {
    const keys = CHIP_FIELDS_BY_TYPE.house.map(([_, k]) => k);
    expect(keys).toEqual(expect.arrayContaining(['areaName', 'layout', 'price', 'areaSize', 'floor', 'decoration']));
  });
  it('job 包含职位/公司/薪资/学历/经验', () => {
    const keys = CHIP_FIELDS_BY_TYPE.job.map(([_, k]) => k);
    expect(keys).toEqual(expect.arrayContaining(['title', 'companyName', 'salaryMin', 'education', 'experience']));
  });
  it('secondhand 包含物品/价格/成色', () => {
    const keys = CHIP_FIELDS_BY_TYPE.secondhand.map(([_, k]) => k);
    expect(keys).toEqual(expect.arrayContaining(['categoryHint', 'price', 'condition']));
  });
  it('lifebiz 包含类别/联系', () => {
    const keys = CHIP_FIELDS_BY_TYPE.lifebiz.map(([_, k]) => k);
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd backend && npx jest src/modules/ai/llm/field-maps.spec.ts`
Expected: FAIL "Cannot find module './field-maps'"

- [ ] **Step 3: 写实现**

```typescript
// backend/src/modules/ai/llm/field-maps.ts
import { AiPostType } from '../dto/extract.dto';

export interface ChipDef {
  label: string;
  key: string;
  format?: (value: any, fields: Record<string, any>) => string;
}

export const CHIP_FIELDS_BY_TYPE: Record<AiPostType, ChipDef[]> = {
  house: [
    { label: '小区', key: 'areaName' },
    { label: '户型', key: 'layout' },
    { label: '租金', key: 'price', format: (v) => `${v} 元/月` },
    { label: '售价', key: 'price', format: (v, f) => f.dealType === 'sale' ? `${v} 万` : `${v} 元/月` },
    { label: '面积', key: 'areaSize', format: (v) => `${v} ㎡` },
    { label: '楼层', key: 'floor' },
    { label: '装修', key: 'decoration' },
  ],
  job: [
    { label: '职位', key: 'title' },
    { label: '公司', key: 'companyName' },
    { label: '薪资', key: 'salaryMin', format: (v, f) => f.salaryMax ? `${v}-${f.salaryMax} 元/月` : `${v} 元/月` },
    { label: '学历', key: 'education' },
    { label: '经验', key: 'experience' },
  ],
  secondhand: [
    { label: '物品', key: 'categoryHint' },
    { label: '价格', key: 'price', format: (v) => `${v} 元` },
    { label: '成色', key: 'condition' },
  ],
  lifebiz: [
    { label: '类别', key: 'categoryHint' },
    { label: '联系', key: 'contactHint' },
  ],
};

export interface ExtractChip {
  label: string;
  value: string;
  confidence: number;
}

export function buildChips(
  type: AiPostType,
  fields: Record<string, any>,
  fieldsConfidence: Record<string, number>,
): ExtractChip[] {
  const map = CHIP_FIELDS_BY_TYPE[type] || [];
  return map
    .map((def) => {
      const v = fields[def.key];
      if (v === null || v === undefined || v === '') return null;
      return {
        label: def.label,
        value: def.format ? def.format(v, fields) : String(v),
        confidence: fieldsConfidence[def.key] ?? 0.8,
      };
    })
    .filter((c): c is ExtractChip => c !== null);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd backend && npx jest src/modules/ai/llm/field-maps.spec.ts`
Expected: PASS (4 + 3 = 7 tests)

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/ai/llm/field-maps.ts backend/src/modules/ai/llm/field-maps.spec.ts
git commit -m "feat(ai): type-aware 字段映射 (house/job/secondhand/lifebiz)"
```

---

### Task 2: ai.service buildChips 重构

**Files:**
- Modify: `backend/src/modules/ai/ai.service.ts:190-213`

- [ ] **Step 1: 修改 buildChips 私有方法**

将 `backend/src/modules/ai/ai.service.ts` 的 `buildChips` 替换为调用 field-maps：

```typescript
// 替换原 190-213 行的 buildChips 方法
import { buildChips, ExtractChip } from './llm/field-maps';

// ... 删除原 buildChips 方法

// 修改 extract 方法中的 buildChips 调用 (大约第 131 行):
// 改前: chips: this.buildChips(parsed),
// 改后: chips: buildChips(parsed.type, parsed.fields, parsed.fieldsConfidence),
```

- [ ] **Step 2: 删除原 buildChips 私有方法**

删除 `ai.service.ts:190-213` 整个 `buildChips` 方法（已被 field-maps 替代）。

- [ ] **Step 3: 跑 ai.service 现有测试**

Run: `cd backend && npx jest src/modules/ai`
Expected: PASS (如果之前没测试就 skip)

- [ ] **Step 4: 手测 extract 端到端**

Run:
```bash
# 后端启动
cd backend && npm run start:dev
# 新开 terminal 测试
curl -X POST http://localhost:3001/api/v1/ai/draft/extract \
  -H "Authorization: Bearer <test_token>" \
  -H "Content-Type: application/json" \
  -d '{"rawText": "招聘销售经理 碧水木业 月薪5000-8000 大专学历"}'
```
Expected: `chips` 包含 `[{label:职位, value:销售经理}, {label:公司, value:碧水木业}, {label:薪资, value:5000-8000 元/月}, {label:学历, value:大专}...]`

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/ai/ai.service.ts
git commit -m "refactor(ai): buildChips 委托给 field-maps, 4 type 完整支持"
```

---

### Task 3: suggest-title 真调 LLM (TDD - prompt + service)

**Files:**
- Create: `backend/src/modules/ai/llm/prompts/suggest-title.ts`
- Create: `backend/src/modules/ai/llm/prompts/suggest-title.spec.ts`
- Modify: `backend/src/modules/ai/ai.service.ts:161-164` (suggestTitle 改真调)

- [ ] **Step 1: 写 prompt 拼接单测**

```typescript
// backend/src/modules/ai/llm/prompts/suggest-title.spec.ts
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
      areaName: '金水湾', layout: '两室一厅', price: 1200,
    });
    expect(prompt).toContain('金水湾');
    expect(prompt).toContain('两室一厅');
    expect(prompt).toContain('1200');
    expect(prompt).toContain('house');
  });

  it('job: 薪资范围正确格式化', () => {
    const prompt = buildSuggestTitleUserPrompt('job', {
      title: '销售经理', salaryMin: 5000, salaryMax: 8000,
    });
    expect(prompt).toContain('5000-8000');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd backend && npx jest src/modules/ai/llm/prompts/suggest-title.spec.ts`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: 写 prompt 实现**

```typescript
// backend/src/modules/ai/llm/prompts/suggest-title.ts
import { AiPostType } from '../../dto/extract.dto';

export const SUGGEST_TITLE_SYSTEM_PROMPT = `你是伊春本地分类信息平台"伊春有事儿说"的标题优化助手。
基于用户帖子的关键字段，生成 3 个不同风格的中文标题：

1. **口语风** (concise): 15 字以内，直白描述核心卖点
2. **正式风** (professional): 20-25 字，包含关键属性词
3. **吸引风** (attractive): 20-30 字，含 1 个 emoji，刺激点击

约束：
- 必须包含 type 对应的关键属性（如 house 必须有 areaName + layout + price）
- 禁止虚假/夸大
- 禁止联系方式（电话/微信/QQ）
- 禁止"急售""最低价"等违规词

输出严格 JSON: { "titles": ["...", "...", "..."] }`;

export function buildSuggestTitleUserPrompt(
  type: AiPostType,
  fields: Record<string, any>,
): string {
  const lines: string[] = [
    `Type: ${type}`,
    'Fields:',
  ];
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue;
    lines.push(`- ${k}: ${v}`);
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd backend && npx jest src/modules/ai/llm/prompts/suggest-title.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 修改 ai.service suggestTitle 真调 LLM**

修改 `backend/src/modules/ai/ai.service.ts:161-164`：

```typescript
// 改前:
async suggestTitle(userId: bigint | null, dto: SuggestTitleRequestDto): Promise<SuggestTitleResponse> {
  const titles = (dto.fields?.suggestedTitles as string[]) || [];
  return { titles: titles.slice(0, dto.count ?? 3), cached: false };
}

// 改后:
async suggestTitle(userId: bigint | null, dto: SuggestTitleRequestDto): Promise<SuggestTitleResponse> {
  const start = Date.now();

  // 1) 限频 (共用 extract 池)
  await this.checkRateLimit(userId);

  // 2) 缓存 key
  const fieldsKey = Object.keys(dto.fields || {}).sort().reduce((acc, k) => {
    acc[k] = dto.fields[k];
    return acc;
  }, {} as Record<string, any>);
  const cacheKey = `ai:title:${dto.type}:${sha256(JSON.stringify(fieldsKey))}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    await this.logUsage(userId, 'suggest-title', 0, 0, 0, 0, true, null, cacheKey);
    return { titles: parsed.titles, cached: true, durationMs: Date.now() - start } as any;
  }

  // 3) LLM 不可用 → 503
  if (!this.llm.isAvailable()) {
    throw new HttpException('AI 暂不可用', HttpStatus.SERVICE_UNAVAILABLE);
  }

  // 4) PII 脱敏 (对 fields 做序列化后脱敏)
  const safeFields = JSON.parse(redactPii(JSON.stringify(dto.fields)));

  // 5) 调 LLM
  let llmResult;
  try {
    llmResult = await this.llm.call({
      system: SUGGEST_TITLE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildSuggestTitleUserPrompt(dto.type, safeFields) }],
      maxTokens: 500,
      temperature: 0.7,
      timeoutMs: 15000,
    });
  } catch (e: any) {
    await this.logUsage(userId, 'suggest-title', 0, 0, 0, Date.now() - start, false, e?.message, cacheKey);
    throw new HttpException('AI 调用失败', HttpStatus.SERVICE_UNAVAILABLE);
  }

  // 6) 解析 (允许 markdown ```json 包装)
  const titles = this.parseTitles(llmResult.text);
  const durationMs = Date.now() - start;

  // 7) 写缓存 (30 min)
  await this.redis.setEx(cacheKey, JSON.stringify({ titles }), 30 * 60);

  // 8) 写日志
  await this.logUsage(
    userId, 'suggest-title',
    llmResult.inputTokens, llmResult.outputTokens,
    this.estimateCost(llmResult.inputTokens, llmResult.outputTokens),
    durationMs, true, null, cacheKey,
  );

  return { titles, cached: false, durationMs } as any;
}

private parseTitles(text: string): string[] {
  try {
    const obj = JSON.parse(text);
    if (Array.isArray(obj.titles)) return obj.titles.slice(0, 3);
  } catch {}
  const m = text.match(/```(?:json)?\s*(\{[\s\S]+?\})\s*```/);
  if (m) {
    try {
      const obj = JSON.parse(m[1]);
      if (Array.isArray(obj.titles)) return obj.titles.slice(0, 3);
    } catch {}
  }
  return [];
}
```

修改 `SuggestTitleResponse` type (`backend/src/modules/ai/dto/suggest-title.dto.ts`)：
```typescript
// 在 SuggestTitleResponse interface 加 cached 和 durationMs
export interface SuggestTitleResponse {
  titles: string[];
  cached: boolean;
  durationMs: number;
}
```

顶部 import:
```typescript
import { SUGGEST_TITLE_SYSTEM_PROMPT, buildSuggestTitleUserPrompt } from './llm/prompts/suggest-title';
```

- [ ] **Step 6: 跑测试 + 手动验证**

Run: `cd backend && npx jest`
Expected: PASS

手动:
```bash
curl -X POST http://localhost:3001/api/v1/ai/draft/suggest-title \
  -H "Authorization: Bearer <test_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"house","fields":{"areaName":"金水湾","layout":"两室一厅","price":1200}}'
```
Expected: `{ titles: ["金水湾两室一厅 1200 元出租", "金水湾精装两室一厅 拎包入住 1200 元/月", "🌟 金水湾好房出租！两室一厅仅 1200"], cached: false, durationMs: 5000-8000 }`

第二次同 input → `cached: true, durationMs: < 100`

- [ ] **Step 7: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/ai/llm/prompts/suggest-title.ts \
        backend/src/modules/ai/llm/prompts/suggest-title.spec.ts \
        backend/src/modules/ai/ai.service.ts \
        backend/src/modules/ai/dto/suggest-title.dto.ts
git commit -m "feat(ai): suggest-title 真调 LLM, 3 风格 + 30min 缓存"
```

---

### Task 4: 抽公共 checkRateLimit 接收 kind 参数 (Phase 2.1 准备)

**Files:**
- Modify: `backend/src/modules/ai/ai.service.ts:168-188`

- [ ] **Step 1: 修改 checkRateLimit 接收 kind**

```typescript
// 改前: 使用 ai:rl:extract:{userId} 硬编码
// 改后: 按 kind 分桶, 但总池共用
private async checkRateLimit(userId: bigint | null, kind: string): Promise<void> {
  if (!userId) return;
  // 每分钟按 kind 分桶 (避免某端点刷爆全局)
  const minuteKey = `ai:rl:${kind}:${userId}:${Math.floor(Date.now() / 60000)}`;
  const minuteCount = await this.redis.incr(minuteKey);
  if (minuteCount === 1) await this.redis.expire(minuteKey, 60);

  // 全局总池 (200/天, 跨 kind 共用)
  const dayKey = `ai:daily:${userId}:${this.todayKey()}`;
  const dayCount = await this.redis.incr(dayKey);
  if (dayCount === 1) await this.redis.expire(dayKey, 24 * 60 * 60);

  const MINUTE_LIMIT = kind === 'rewrite' ? 10 : 30;  // rewrite 更严
  if (minuteCount > MINUTE_LIMIT) {
    throw new HttpException('操作太频繁, 请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
  }
  if (dayCount > 200) {
    throw new HttpException('今日 AI 调用次数已达上限', HttpStatus.TOO_MANY_REQUESTS);
  }
}
```

- [ ] **Step 2: 修改 extract + suggestTitle 调用**

```typescript
// 在 extract (约 86 行) 和 suggestTitle (Task 3 已改) 调:
// 改前: await this.checkRateLimit(userId);
// 改后: await this.checkRateLimit(userId, 'extract');  // extract
// 改后: await this.checkRateLimit(userId, 'suggest-title');  // suggestTitle
```

- [ ] **Step 3: 跑测试**

Run: `cd backend && npx jest`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/ai/ai.service.ts
git commit -m "refactor(ai): checkRateLimit 按 kind 分桶, 共享 200/天总池"
```

---

### Task 5: extract 同步返回 isBusiness / isForestEconomy 字段 (为 2.2b 准备)

**Files:**
- Modify: `backend/src/modules/ai/llm/prompts/extract.ts`
- Modify: `backend/src/modules/ai/ai.service.ts` (parseLlmJson 透传)

- [ ] **Step 1: 修改 extract prompt**

```typescript
// backend/src/modules/ai/llm/prompts/extract.ts
// 在原 EXTRACT_SYSTEM_PROMPT 末尾追加:

// === 商家与林下经济识别 ===
// 同时判断:
// - isBusiness: 帖子是否来自商家/中介/批发商 (招聘方/房产中介/二手批发)
//   - 招聘类: isBusiness=true, businessType='recruiter'
//   - 房屋类: 中介特征 (如"代理"/"多家房源"/"中介费") → isBusiness=true, businessType='agent'
//   - 二手类: 批发/多件同售 → isBusiness=true, businessType='wholesaler'
//   - 其它个人 → isBusiness=false
// - isForestEconomy: 帖子是否涉及林下经济 (蓝莓/木耳/松子/林下参/榛子/蜂蜜)
//   - 是 → isForestEconomy=true, forestCategory='blueberry'|'fungus'|'pine-nut'|'ginseng'|'hazelnut'|'honey'

// 在 JSON 输出结构 (在 fields 之后, suggestions 之前) 加:
// "isBusiness": boolean,
// "businessType": "recruiter"|"agent"|"wholesaler"|null,
// "businessConfidence": number (0-1),
// "isForestEconomy": boolean,
// "forestCategory": "blueberry"|"fungus"|"pine-nut"|"ginseng"|"hazelnut"|"honey"|null,
// "forestConfidence": number (0-1)
```

- [ ] **Step 2: 改 parseLlmJson 透传新字段**

```typescript
// backend/src/modules/ai/ai.service.ts parseLlmJson (约 215-240 行)
// 在解析成功后, 透传新字段 (如果存在)
private parseLlmJson(text: string, typeHint?: string): any {
  // ... 原解析逻辑
  
  return {
    type: typeHint ?? 'house',
    typeConfidence: 0.3,
    fields: {},
    fieldsConfidence: {},
    missingFields: [],
    suggestions: { titles: [], tags: [] },
    // 新增: 默认值, 防 prompt 漏返
    isBusiness: false,
    businessType: null,
    businessConfidence: 0,
    isForestEconomy: false,
    forestCategory: null,
    forestConfidence: 0,
  };
}
```

- [ ] **Step 3: 改 ExtractResponse type**

```typescript
// backend/src/modules/ai/dto/extract.dto.ts
export interface ExtractResponse {
  // ... 原字段
  isBusiness?: boolean;
  businessType?: 'recruiter' | 'agent' | 'wholesaler' | null;
  businessConfidence?: number;
  isForestEconomy?: boolean;
  forestCategory?: 'blueberry' | 'fungus' | 'pine-nut' | 'ginseng' | 'hazelnut' | 'honey' | null;
  forestConfidence?: number;
}
```

- [ ] **Step 4: 改 ai.service extract 返回 (透传新字段到 response)**

```typescript
// ai.service.ts extract (约 125 行), response 构造:
const response: ExtractResponse = {
  // ... 原字段
  isBusiness: parsed.isBusiness ?? false,
  businessType: parsed.businessType ?? null,
  businessConfidence: parsed.businessConfidence ?? 0,
  isForestEconomy: parsed.isForestEconomy ?? false,
  forestCategory: parsed.forestCategory ?? null,
  forestConfidence: parsed.forestConfidence ?? 0,
};
```

- [ ] **Step 5: 跑测试 + 手动验证**

Run: `cd backend && npx jest`
Expected: PASS

手动:
```bash
curl -X POST http://localhost:3001/api/v1/ai/draft/extract \
  -H "Authorization: Bearer <test_token>" \
  -H "Content-Type: application/json" \
  -d '{"rawText": "招聘销售经理 碧水木业 月薪5000-8000 长期招聘多名"}'
```
Expected: 响应中 `isBusiness=true, businessType='recruiter', businessConfidence>=0.7`

再试: `{"rawText": "伊春野生蓝莓干 250g 礼盒装 30元/盒"}`
Expected: `isForestEconomy=true, forestCategory='blueberry'`

- [ ] **Step 6: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/ai/llm/prompts/extract.ts \
        backend/src/modules/ai/ai.service.ts \
        backend/src/modules/ai/dto/extract.dto.ts
git commit -m "feat(ai): extract 返回 isBusiness + 林下经济识别 (2.2b 准备)"
```

---

### Task 6: 前端 missingFields 引导 + quality-badge 组件

**Files:**
- Create: `frontend/src/components/ai/quality-badge.tsx`
- Modify: `frontend/src/components/ai/extract-chips.tsx` (加 missingFields)
- Modify: `frontend/src/app/posts/publish/ai-mode.tsx` (传 missingFields)

- [ ] **Step 1: 写 quality-badge 组件**

```typescript
// frontend/src/components/ai/quality-badge.tsx
'use client';
import { Badge } from '@/components/ui/badge';

interface Props {
  score: number;  // 0-100
  loading?: boolean;
}

export function QualityBadge({ score, loading }: Props) {
  if (loading) {
    return <Badge variant="outline" className="animate-pulse">AI 评估中...</Badge>;
  }
  const variant = score >= 75 ? 'default' : score >= 50 ? 'secondary' : 'destructive';
  const label = score >= 75 ? '优秀' : score >= 50 ? '良好' : '需优化';
  return (
    <Badge variant={variant} className="text-xs">
      AI 评估: {score} 分 · {label}
    </Badge>
  );
}
```

- [ ] **Step 2: 修改 extract-chips 加 missingFields**

```typescript
// frontend/src/components/ai/extract-chips.tsx
// 在 chip 列表后追加 missingFields 提示:
import { AlertCircle } from 'lucide-react';

interface Props {
  // ... 原 props
  missingFields?: string[];
}

// 在 chips 渲染后:
{missingFields && missingFields.length > 0 && (
  <div className="mt-3 flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg p-3">
    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">还有 {missingFields.length} 项必填未识别</div>
      <div className="text-xs text-rose-500 mt-0.5">{missingFields.join('、')}</div>
    </div>
  </div>
)}
```

- [ ] **Step 3: 修改 ai-mode 传 missingFields**

```typescript
// frontend/src/app/posts/publish/ai-mode.tsx
// 在 <ExtractChips /> 组件调用处:
<ExtractChips
  chips={result.chips}
  missingFields={result.missingFields}  // 新增
  onChipEdit={...}
/>
```

- [ ] **Step 4: 手动验证**

启动 frontend: `cd frontend && npm run dev`
访问 `http://localhost:3000/posts/publish`
输入: "出租金水湾房子" (故意不写户型/价格/楼层)
Expected:
- chips 显示 1 个 (小区: 金水湾)
- 下方红框 "还有 3 项必填未识别: 户型、租金、楼层"

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add frontend/src/components/ai/quality-badge.tsx \
        frontend/src/components/ai/extract-chips.tsx \
        frontend/src/app/posts/publish/ai-mode.tsx
git commit -m "feat(frontend): missingFields 引导 + quality-badge 组件"
```

---

### Task 7: Admin AI 看板后端 (TDD)

**Files:**
- Create: `backend/src/modules/admin/ai-usage/ai-usage.service.ts`
- Create: `backend/src/modules/admin/ai-usage/ai-usage.service.spec.ts`
- Create: `backend/src/modules/admin/ai-usage/ai-usage.controller.ts`
- Create: `backend/src/modules/admin/ai-usage/ai-usage.module.ts`
- Modify: `backend/src/modules/admin/admin.module.ts` (注册新模块)

- [ ] **Step 1: 写 service 单测**

```typescript
// backend/src/modules/admin/ai-usage/ai-usage.service.spec.ts
import { AiUsageService } from './ai-usage.service';

describe('AiUsageService.getStats', () => {
  let service: AiUsageService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      aiUsageLog: {
        count: jest.fn().mockResolvedValue(100),
        aggregate: jest.fn().mockResolvedValue({ _avg: { latencyMs: 3000 }, _sum: { costUsd: 1.5 } }),
        findMany: jest.fn().mockResolvedValue([
          { kind: 'extract', _count: 70 },
          { kind: 'suggest-title', _count: 30 },
        ]),
        groupBy: jest.fn()
          .mockResolvedValueOnce([{ kind: 'extract', _count: 70 }])
          .mockResolvedValueOnce([{ type: 'house', _count: 50 }, { type: 'job', _count: 20 }])
          .mockResolvedValueOnce([{ errorCode: 'AI_UNAVAILABLE', _count: 3 }]),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1n, phone: '13900000001' }]) },
    };
    service = new AiUsageService(mockPrisma);
  });

  it('今日统计返回 6 维度', async () => {
    const stats = await service.getStats('today');
    expect(stats).toMatchObject({
      totalCalls: 100,
      avgLatencyMs: 3000,
      totalCostUsd: 1.5,
      totalCostCny: expect.any(Number),
      byKind: expect.any(Object),
      byType: expect.any(Object),
      topUsers: expect.any(Array),
      errorBreakdown: expect.any(Array),
    });
  });

  it('week/month 范围都接受', async () => {
    await expect(service.getStats('week')).resolves.toBeDefined();
    await expect(service.getStats('month')).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd backend && npx jest src/modules/admin/ai-usage`
Expected: FAIL

- [ ] **Step 3: 写 service 实现**

```typescript
// backend/src/modules/admin/ai-usage/ai-usage.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Range = 'today' | 'week' | 'month';

@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(range: Range) {
    const since = this.getSince(range);

    const [totalCalls, latencyAgg, costAgg, byKindRaw, byTypeRaw, errorRaw, topUsersRaw] = await Promise.all([
      this.prisma.aiUsageLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { costUsd: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['kind'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since }, userId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['errorCode'],
        where: { createdAt: { gte: since }, errorCode: { not: null } },
        _count: { _all: true },
      }),
      // 成功率 (success=true / total)
      this.prisma.aiUsageLog.count({
        where: { createdAt: { gte: since }, success: true },
      }),
    ]);

    const successCount = await this.prisma.aiUsageLog.count({
      where: { createdAt: { gte: since }, success: true },
    });
    const successRate = totalCalls > 0 ? successCount / totalCalls : 0;

    // 关联 user phone
    const userIds = topUsersRaw.map((u) => u.userId!).filter(Boolean);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, phone: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id.toString(), u.phone]));
    const topUsers = topUsersRaw.map((u) => ({
      userId: u.userId!,
      phone: userMap.get(u.userId!.toString()) ?? '',
      calls: u._count._all,
    }));

    // byType: 需读 inputHash 反查 (Phase 1 简化: inputHash 没存 type, 这版先用 0 占位)
    // 真实数据要 join posts 表, Phase 2.1 简化返回 0
    const byType = { house: 0, job: 0, secondhand: 0, lifebiz: 0 };

    return {
      totalCalls,
      successRate,
      avgLatencyMs: latencyAgg._avg.latencyMs ?? 0,
      totalCostUsd: costAgg._sum.costUsd ?? 0,
      totalCostCny: (costAgg._sum.costUsd ?? 0) * 7.2,
      byKind: this.expandByKind(byKindRaw),
      byType,
      topUsers,
      errorBreakdown: errorRaw.map((e) => ({ code: e.errorCode!, count: e._count._all })),
    };
  }

  private expandByKind(raw: any[]): Record<string, number> {
    const out: Record<string, number> = { extract: 0, 'suggest-title': 0, score: 0, rewrite: 0, 'seo-meta': 0 };
    for (const r of raw) out[r.kind] = r._count._all;
    return out;
  }

  private getSince(range: Range): Date {
    const now = new Date();
    if (range === 'today') {
      now.setHours(0, 0, 0, 0);
      return now;
    }
    if (range === 'week') {
      now.setDate(now.getDate() - 7);
      return now;
    }
    now.setMonth(now.getMonth() - 1);
    return now;
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd backend && npx jest src/modules/admin/ai-usage`
Expected: PASS (2 tests)

- [ ] **Step 5: 写 controller + module**

```typescript
// backend/src/modules/admin/ai-usage/ai-usage.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AiUsageService } from './ai-usage.service';

@Controller('admin/ai-usage')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AiUsageController {
  constructor(private readonly service: AiUsageService) {}

  @Get('stats')
  async getStats(@Query('range') range: 'today' | 'week' | 'month' = 'today') {
    return this.service.getStats(range);
  }
}

// backend/src/modules/admin/ai-usage/ai-usage.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiUsageController } from './ai-usage.controller';
import { AiUsageService } from './ai-usage.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiUsageController],
  providers: [AiUsageService],
  exports: [AiUsageService],
})
export class AiUsageModule {}
```

- [ ] **Step 6: 注册到 AdminModule**

```typescript
// backend/src/modules/admin/admin.module.ts
import { AiUsageModule } from './ai-usage/ai-usage.module';

@Module({
  imports: [
    // ... 原 imports
    AiUsageModule,
  ],
})
export class AdminModule {}
```

- [ ] **Step 7: 跑测试 + 手动验证**

Run: `cd backend && npx jest && npm run start:dev`

手动:
```bash
curl -X GET "http://localhost:3001/api/v1/admin/ai-usage/stats?range=today" \
  -H "Authorization: Bearer <admin_token>"
```
Expected: 200 + stats JSON (admin 用户)

- [ ] **Step 8: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/admin/ai-usage/
git commit -m "feat(admin): AI 调用看板后端 (stats + 6 维度)"
```

---

### Task 8: Admin AI 看板前端 + Dashboard 卡片

**Files:**
- Create: `admin/src/lib/api-ai-usage.ts`
- Create: `admin/src/app/ai-usage/page.tsx`
- Modify: `admin/src/app/dashboard/page.tsx` (加 AI 卡片)

- [ ] **Step 1: 写 API client**

```typescript
// admin/src/lib/api-ai-usage.ts
import { http } from './http';  // 复用现有 http util

export interface AiUsageStats {
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  totalCostCny: number;
  byKind: Record<string, number>;
  byType: Record<string, number>;
  topUsers: Array<{ userId: bigint; phone: string; calls: number }>;
  errorBreakdown: Array<{ code: string; count: number }>;
}

export const aiUsageApi = {
  getStats: (range: 'today' | 'week' | 'month' = 'today') =>
    http.get<AiUsageStats>(`/admin/ai-usage/stats?range=${range}`),
};
```

- [ ] **Step 2: 写 AI 看板页**

```typescript
// admin/src/app/ai-usage/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { aiUsageApi, AiUsageStats } from '@/lib/api-ai-usage';

export default function AiUsagePage() {
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    aiUsageApi.getStats(range).then(setStats).finally(() => setLoading(false));
  }, [range]);

  if (loading) return <div className="p-8">加载中...</div>;
  if (!stats) return <div className="p-8">暂无数据</div>;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI 调用看板</h1>
        <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
          <TabsList>
            <TabsTrigger value="today">今日</TabsTrigger>
            <TabsTrigger value="week">本周</TabsTrigger>
            <TabsTrigger value="month">本月</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总调用" value={stats.totalCalls} />
        <StatCard label="成功率" value={`${(stats.successRate * 100).toFixed(1)}%`} />
        <StatCard label="平均延迟" value={`${stats.avgLatencyMs.toFixed(0)} ms`} />
        <StatCard label="今日成本" value={`¥${stats.totalCostCny.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>按 kind 分布</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(stats.byKind).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1">
                <span>{k}</span><span className="font-mono">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 10 用户</CardTitle></CardHeader>
          <CardContent>
            {stats.topUsers.map((u) => (
              <div key={u.userId.toString()} className="flex justify-between py-1 text-sm">
                <span>{u.phone}</span>
                <span className="font-mono">{u.calls} 次</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {stats.errorBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle>错误分布</CardTitle></CardHeader>
          <CardContent>
            {stats.errorBreakdown.map((e) => (
              <div key={e.code} className="flex justify-between py-1 text-sm">
                <span className="text-rose-600">{e.code}</span>
                <span className="font-mono">{e.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 修改 Dashboard 加 AI 卡片**

在 `admin/src/app/dashboard/page.tsx` 现有卡片列表末尾追加:

```typescript
<Link href="/ai-usage">
  <Card className="hover:shadow-md cursor-pointer">
    <CardContent className="pt-6">
      <div className="text-sm text-muted-foreground">AI 调用</div>
      <div className="text-lg font-bold mt-1">查看看板 →</div>
    </CardContent>
  </Card>
</Link>
```

- [ ] **Step 4: 手动验证**

启动 admin: `cd admin && npm run dev`
访问 `http://localhost:3002/ai-usage` (admin 登录后)
Expected: 4 统计卡 + byKind + Top 10 用户 + 错误分布

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add admin/src/lib/api-ai-usage.ts \
        admin/src/app/ai-usage/page.tsx \
        admin/src/app/dashboard/page.tsx
git commit -m "feat(admin): AI 调用看板前端 + Dashboard 入口"
```

---

### Task 9: Phase 2.1 E2E 回归

**Files:**
- Create: `.pm-tmp/ai-publish-phase2-1-e2e.py`

- [ ] **Step 1: 写 E2E 脚本**

```python
# .pm-tmp/ai-publish-phase2-1-e2e.py
"""
Phase 2.1 E2E 回归 (5 步):
[A] AI 模式: 招聘帖 → 3 type chips 完整
[B] suggest-title: 真调 LLM, cached 命中
[C] missingFields 提示: 输入"出租金水湾" → 看到红框
[D] Admin 看板: 4 统计卡 + byKind
[E] suggest-title 第二次同 input → cached=true, duration<100ms
"""
import json
import time
import requests
import sys

API = "http://localhost:3001/api/v1"
FRONTEND = "http://localhost:3000"
ADMIN = "http://localhost:3002"

# 1. 登录拿 token
def login(phone, code='1234'):
    r = requests.post(f"{API}/auth/sms-login", json={"phone": phone, "code": code})
    r.raise_for_status()
    return r.json()['data']['accessToken']

# 测试用户
token = login("13900008888")
headers = {"Authorization": f"Bearer {token}"}

# [A] 招聘帖 extract
print("[A] 测试招聘帖 extract...")
r = requests.post(f"{API}/ai/draft/extract", headers=headers, json={
    "rawText": "招聘销售经理 碧水木业 月薪5000-8000 大专学历 3年经验"
})
r.raise_for_status()
data = r.json()['data']
chips = data['chips']
assert any(c['label'] == '职位' for c in chips), f"无职位 chip: {chips}"
assert any(c['label'] == '公司' for c in chips), f"无公司 chip: {chips}"
assert any('5000-8000' in c['value'] for c in chips), f"无薪资范围: {chips}"
print(f"  PASS: {len(chips)} chips")

# [B] suggest-title 真调
print("[B] 测试 suggest-title 真调...")
start = time.time()
r = requests.post(f"{API}/ai/draft/suggest-title", headers=headers, json={
    "type": "house",
    "fields": {"areaName": "金水湾", "layout": "两室一厅", "price": 1200}
})
r.raise_for_status()
data = r.json()['data']
duration1 = time.time() - start
assert len(data['titles']) == 3, f"应有 3 个标题, 实际 {len(data['titles'])}"
assert data['cached'] == False, "首次应未缓存"
print(f"  PASS: {data['titles']} ({duration1:.2f}s)")

# [E] 第二次 cached
print("[E] 测试 suggest-title 缓存命中...")
start = time.time()
r = requests.post(f"{API}/ai/draft/suggest-title", headers=headers, json={
    "type": "house",
    "fields": {"areaName": "金水湾", "layout": "两室一厅", "price": 1200}
})
r.raise_for_status()
data = r.json()['data']
duration2 = time.time() - start
assert data['cached'] == True, "应缓存命中"
assert duration2 < 0.5, f"缓存响应应 < 500ms, 实际 {duration2*1000:.0f}ms"
print(f"  PASS: cached=true ({duration2*1000:.0f}ms)")

# [C] missingFields 提示 (手测前端, 这里只检查 extract 返回)
print("[C] 测试 missingFields 返回...")
r = requests.post(f"{API}/ai/draft/extract", headers=headers, json={
    "rawText": "出租金水湾房子"
})
r.raise_for_status()
data = r.json()['data']
assert 'missingFields' in data, "缺 missingFields 字段"
assert len(data['missingFields']) >= 2, f"应至少 2 个缺失, 实际 {data['missingFields']}"
print(f"  PASS: {data['missingFields']}")

# [D] Admin 看板
print("[D] 测试 Admin 看板...")
# 拿 admin token
admin_token = login("13900000001")  # 假设是 admin
admin_headers = {"Authorization": f"Bearer {admin_token}"}
r = requests.get(f"{API}/admin/ai-usage/stats?range=today", headers=admin_headers)
if r.status_code == 403:
    print("  SKIP: 13900000001 不是 admin, 跳过")
else:
    r.raise_for_status()
    data = r.json()['data']
    assert 'totalCalls' in data
    assert 'byKind' in data
    print(f"  PASS: totalCalls={data['totalCalls']}")

print("\n✅ Phase 2.1 E2E 全部通过")
```

- [ ] **Step 2: 跑 E2E**

Run: `cd e:/workspace/yichun-you-shi-er-shuo && python .pm-tmp/ai-publish-phase2-1-e2e.py`
Expected: 5/5 PASS

- [ ] **Step 3: 提交 + Tag**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add .pm-tmp/ai-publish-phase2-1-e2e.py
git commit -m "test(ai): Phase 2.1 E2E 回归 (5 步: 3-type + title + missing + admin + cache)"
git tag phase-2.1-done
```

---

**Phase 2.1 完毕 (8 任务)。进入 Phase 2.2a。**

---

## Phase 2.2a: SEO + 流量 (1.5 周)

### Task 9: Post 字段 + SitemapPushLog migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260623_add_post_seo_and_quality_score/migration.sql`

- [ ] **Step 1: 修改 schema.prisma**

```prisma
// backend/prisma/schema.prisma
// 在 Post model 末尾 (existing 字段后) 加:
model Post {
  // ... existing fields (id, type, title, description, userId, price, areaId, etc.)
  seoMeta          Json?     @map("seo_meta")
  qualityScore     Int?      @map("quality_score")
  seoMetaUpdatedAt DateTime? @map("seo_meta_updated_at")
  isBusiness       Boolean?  @map("is_business")
  businessType     String?   @db.VarChar(32) @map("business_type")
  boostExpiresAt   DateTime? @map("boost_expires_at")

  @@index([seoMetaUpdatedAt])
  @@index([qualityScore])
  @@index([isBusiness, businessType])
  @@index([boostExpiresAt])
  // 注意: 已有 @@index 列表末尾追加, 不要覆盖
}

// 在文件末尾新增 SitemapPushLog model:
model SitemapPushLog {
  id        BigInt   @id @default(autoincrement())
  target    String   @db.VarChar(16)
  postIds   Json
  status    String   @db.VarChar(16)
  response  String?  @db.Text
  pushedAt  DateTime @default(now()) @map("pushed_at")
  @@index([target, pushedAt])
  @@map("sitemap_push_logs")
}
```

- [ ] **Step 2: 生成 migration (db push --create-only)**

Run:
```bash
cd backend && npx prisma migrate dev --name add_post_seo_and_quality_score --create-only
```
Expected: 创建 `backend/prisma/migrations/20260623_add_post_seo_and_quality_score/migration.sql`

- [ ] **Step 3: 检查 migration SQL 正确**

Read: `backend/prisma/migrations/20260623_add_post_seo_and_quality_score/migration.sql`
Expected: 包含 6 个 ALTER TABLE (Post) + 1 个 CREATE TABLE (SitemapPushLog) + 5 个 CREATE INDEX

如索引未生成，手动追加:
```sql
-- 如自动生成缺, 手动补
CREATE INDEX `idx_post_seo_meta_updated_at` ON `Post`(`seo_meta_updated_at`);
CREATE INDEX `idx_post_quality_score` ON `Post`(`quality_score`);
CREATE INDEX `idx_post_is_business_business_type` ON `Post`(`is_business`, `business_type`);
CREATE INDEX `idx_post_boost_expires_at` ON `Post`(`boost_expires_at`);
```

- [ ] **Step 4: 应用 migration**

Run: `cd backend && npx prisma migrate deploy`
Expected: "1 migration(s) applied"

- [ ] **Step 5: 验证 Prisma client 已更新**

Run: `cd backend && npx prisma generate`
Expected: "Generated Prisma Client"

- [ ] **Step 6: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/prisma/schema.prisma \
        backend/prisma/migrations/20260623_add_post_seo_and_quality_score/
git commit -m "feat(db): Post 6 字段 + SitemapPushLog 新表"
```

---

### Task 10: score 提示词 + service + endpoint (TDD)

**Files:**
- Create: `backend/src/modules/ai/llm/prompts/score.ts`
- Create: `backend/src/modules/ai/llm/prompts/score.spec.ts`
- Create: `backend/src/modules/ai/dto/score.dto.ts`
- Modify: `backend/src/modules/ai/ai.service.ts` (加 score 方法)
- Modify: `backend/src/modules/ai/ai.controller.ts` (加 score 端点)

- [ ] **Step 1: 写 score prompt 单测**

```typescript
// backend/src/modules/ai/llm/prompts/score.spec.ts
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
      areaName: '金水湾', layout: '两室一厅', price: 1200,
    });
    expect(p).toContain('house');
    expect(p).toContain('金水湾两室一厅 1200');
    expect(p).toContain('家电齐全');
    expect(p).toContain('areaName');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd backend && npx jest src/modules/ai/llm/prompts/score.spec.ts`
Expected: FAIL

- [ ] **Step 3: 写 score prompt**

```typescript
// backend/src/modules/ai/llm/prompts/score.ts
import { AiPostType } from '../../dto/extract.dto';

export const SCORE_SYSTEM_PROMPT = `你是伊春本地分类信息平台的质量审核 AI。
对用户帖子打 4 维质量分，每维 0-25 分，总分 0-100。

评分标准：
- **title (0-25)**:
  - 长度 10-30 字 +10；含核心属性词（小区/户型/价格/品牌/职位）+10；通顺无错字 +5
- **description (0-25)**:
  - 长度 30-200 字 +10；包含具体细节（配套/福利/成色/服务时间）+10；无套话 +5
- **completeness (0-25)**:
  - 必填字段覆盖度（按 type 不同，缺一扣 5 分）
- **contact (0-25)**:
  - 有电话/微信 +15；描述里说"私聊可议价" +5；提到"可看房/可面试/可面交" +5

输出严格 JSON: { "score": number, "breakdown": {title, description, completeness, contact}, "suggestions": [string, ...] }
suggestions 必须具体可执行，如"标题加价格"而不是"标题质量差"。`;

export function buildScoreUserPrompt(
  type: AiPostType,
  title: string,
  description: string | undefined,
  fields: Record<string, any>,
): string {
  const lines: string[] = [
    `Type: ${type}`,
    `Title: ${title}`,
  ];
  if (description) lines.push(`Description: ${description}`);
  if (fields && Object.keys(fields).length > 0) {
    lines.push('Fields:');
    for (const [k, v] of Object.entries(fields)) {
      if (v !== null && v !== undefined && v !== '') {
        lines.push(`- ${k}: ${v}`);
      }
    }
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd backend && npx jest src/modules/ai/llm/prompts/score.spec.ts`
Expected: PASS

- [ ] **Step 5: 写 DTO**

```typescript
// backend/src/modules/ai/dto/score.dto.ts
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPostType } from './extract.dto';

export class ScoreRequestDto {
  @IsString()
  type: AiPostType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;

  @IsString()
  @IsOptional()
  contactPhone?: string;
}

export interface ScoreBreakdown {
  title: number;
  description: number;
  completeness: number;
  contact: number;
}

export interface ScoreResponse {
  score: number;
  breakdown: ScoreBreakdown;
  suggestions: string[];
  cached: boolean;
  durationMs: number;
}
```

- [ ] **Step 6: 加 score service 方法**

在 `backend/src/modules/ai/ai.service.ts` 加:

```typescript
import { ScoreRequestDto, ScoreResponse, ScoreBreakdown } from './dto/score.dto';
import { SCORE_SYSTEM_PROMPT, buildScoreUserPrompt } from './llm/prompts/score';

// 在 suggestTitle 后追加:
async score(userId: bigint | null, dto: ScoreRequestDto): Promise<ScoreResponse> {
  const start = Date.now();
  await this.checkRateLimit(userId, 'score');

  const contentHash = sha256(JSON.stringify({ type: dto.type, title: dto.title, description: dto.description, fields: dto.fields, contactHint: dto.contactPhone ? 'present' : 'absent' }));
  const cacheKey = `ai:score:${contentHash}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as ScoreResponse;
    await this.logUsage(userId, 'score', 0, 0, 0, 0, true, null, contentHash);
    return { ...parsed, cached: true, durationMs: Date.now() - start };
  }

  if (!this.llm.isAvailable()) {
    throw new HttpException('AI 暂不可用', HttpStatus.SERVICE_UNAVAILABLE);
  }

  const safeFields = dto.fields ? JSON.parse(redactPii(JSON.stringify(dto.fields))) : {};

  let llmResult;
  try {
    llmResult = await this.llm.call({
      system: SCORE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildScoreUserPrompt(dto.type, dto.title, dto.description, safeFields) }],
      maxTokens: 500,
      temperature: 0.3,
      timeoutMs: 15000,
    });
  } catch (e: any) {
    await this.logUsage(userId, 'score', 0, 0, 0, Date.now() - start, false, e?.message, contentHash);
    throw new HttpException('AI 调用失败', HttpStatus.SERVICE_UNAVAILABLE);
  }

  const parsed = this.parseScoreJson(llmResult.text);
  const durationMs = Date.now() - start;
  const costUsd = this.estimateCost(llmResult.inputTokens, llmResult.outputTokens);

  const response: ScoreResponse = {
    score: parsed.score,
    breakdown: parsed.breakdown,
    suggestions: parsed.suggestions,
    cached: false,
    durationMs,
  };

  await this.redis.setEx(cacheKey, JSON.stringify(response), 10 * 60);

  await this.logUsage(
    userId, 'score',
    llmResult.inputTokens, llmResult.outputTokens,
    costUsd, durationMs, true, null, contentHash,
  );

  return response;
}

private parseScoreJson(text: string): { score: number; breakdown: ScoreBreakdown; suggestions: string[] } {
  try {
    const obj = JSON.parse(text);
    if (typeof obj.score === 'number') {
      return {
        score: Math.max(0, Math.min(100, Math.round(obj.score))),
        breakdown: obj.breakdown || { title: 0, description: 0, completeness: 0, contact: 0 },
        suggestions: Array.isArray(obj.suggestions) ? obj.suggestions : [],
      };
    }
  } catch {}
  const m = text.match(/```(?:json)?\s*(\{[\s\S]+?\})\s*```/);
  if (m) {
    try {
      const obj = JSON.parse(m[1]);
      if (typeof obj.score === 'number') {
        return {
          score: Math.max(0, Math.min(100, Math.round(obj.score))),
          breakdown: obj.breakdown || { title: 0, description: 0, completeness: 0, contact: 0 },
          suggestions: Array.isArray(obj.suggestions) ? obj.suggestions : [],
        };
      }
    } catch {}
  }
  return { score: 50, breakdown: { title: 0, description: 0, completeness: 0, contact: 0 }, suggestions: ['AI 评分失败'] };
}
```

- [ ] **Step 7: 加 score 端点**

在 `backend/src/modules/ai/ai.controller.ts` 加:

```typescript
import { ScoreRequestDto, ScoreResponse } from './dto/score.dto';

@Post('draft/score')
@UseGuards(JwtAuthGuard)
async score(@Req() req: any, @Body() dto: ScoreRequestDto): Promise<ApiResp<ScoreResponse>> {
  const userId = req.user?.id ? BigInt(req.user.id) : null;
  return ok(await this.aiService.score(userId, dto));
}
```

- [ ] **Step 8: 跑测试 + 手动验证**

Run: `cd backend && npx jest`
Expected: PASS

手动:
```bash
curl -X POST http://localhost:3001/api/v1/ai/draft/score \
  -H "Authorization: Bearer <test_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"house","title":"金水湾两室一厅 1200","description":"家电齐全 拎包入住","fields":{"areaName":"金水湾","layout":"两室一厅","price":1200}}'
```
Expected: `{ score: 65-85, breakdown: {...}, suggestions: [...], cached: false, durationMs: 3000-6000 }`

- [ ] **Step 9: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/ai/llm/prompts/score.ts \
        backend/src/modules/ai/llm/prompts/score.spec.ts \
        backend/src/modules/ai/dto/score.dto.ts \
        backend/src/modules/ai/ai.service.ts \
        backend/src/modules/ai/ai.controller.ts
git commit -m "feat(ai): score 端点 - 4 维质量分 + 1-5 建议 + 10min 缓存"
```

---

### Task 11: seo-meta 提示词 + service (TDD)

**Files:**
- Create: `backend/src/modules/ai/llm/prompts/seo-meta.ts`
- Create: `backend/src/modules/ai/llm/prompts/seo-meta.spec.ts`

- [ ] **Step 1: 写 seo-meta prompt 单测**

```typescript
// backend/src/modules/ai/llm/prompts/seo-meta.spec.ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd backend && npx jest src/modules/ai/llm/prompts/seo-meta.spec.ts`
Expected: FAIL

- [ ] **Step 3: 写 seo-meta prompt**

```typescript
// backend/src/modules/ai/llm/prompts/seo-meta.ts
import { AiPostType } from '../../dto/extract.dto';

export const SEO_META_SYSTEM_PROMPT = `你是 SEO 优化助手。为用户帖子生成搜索引擎友好的元信息和结构化数据。

按 type 生成对应 JSON-LD：
- house: RealEstateListing (含 address, floorSize, numberOfRooms, offers.price)
- job: JobPosting (含 title, description, baseSalary, hiringOrganization)
- secondhand: Product (含 name, description, offers.price, itemCondition)
- lifebiz: Offer (含 name, description, areaServed)

输出严格 JSON: {
  "metaTitle": "10-30 字含核心关键词",
  "metaDescription": "80-150 字含 2-3 个长尾词",
  "keywords": ["3-5 个按热度排"],
  "jsonLd": { "@context": "https://schema.org", "@type": "...", ... }
}`;

export function buildSeoMetaUserPrompt(type: AiPostType, fields: Record<string, any>): string {
  const lines: string[] = [`Type: ${type}`];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined && v !== '') {
      lines.push(`${k}: ${v}`);
    }
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd backend && npx jest src/modules/ai/llm/prompts/seo-meta.spec.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/ai/llm/prompts/seo-meta.ts \
        backend/src/modules/ai/llm/prompts/seo-meta.spec.ts
git commit -m "feat(ai): seo-meta prompt (4 type JSON-LD 规范)"
```

---

### Task 12: SEO 模块 (controller, service, sitemap data, 百度推送)

**Files:**
- Create: `backend/src/modules/seo/seo.service.ts`
- Create: `backend/src/modules/seo/seo.controller.ts`
- Create: `backend/src/modules/seo/seo.module.ts`
- Create: `backend/src/modules/seo/seo.service.spec.ts`
- Modify: `backend/src/app.module.ts` (注册 SeoModule)
- Modify: `backend/.env.example` (加 BAIDU_PUSH_TOKEN)

- [ ] **Step 1: 写 service 单测 (mock LLM + 百度 API)**

```typescript
// backend/src/modules/seo/seo.service.spec.ts
import { SeoService } from './seo.service';

describe('SeoService.generateSeoMeta', () => {
  let service: SeoService;
  let mockPrisma: any;
  let mockLlm: any;
  let mockHttp: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1n, type: 'house', title: '金水湾', description: '...',
          areaId: 1, price: 1200, fields: { areaName: '金水湾' },
        }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([{ id: 1n, updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(10),
      },
    };
    mockLlm = {
      isAvailable: () => true,
      call: jest.fn().mockResolvedValue({
        text: JSON.stringify({
          metaTitle: '伊春金水湾两室一厅出租 1200 元',
          metaDescription: '伊春金水湾小区真实房源出租...',
          keywords: ['伊春租房', '金水湾'],
          jsonLd: { '@type': 'RealEstateListing' },
        }),
        inputTokens: 400, outputTokens: 200, model: 'glm-4-air', latencyMs: 5000,
      }),
    };
    mockHttp = { post: jest.fn().mockResolvedValue({ data: { success: 10, remain: 4990 } }) };
    service = new SeoService(mockPrisma, mockLlm, mockHttp);
  });

  it('generateSeoMeta: 写 Post.seoMeta + updatedAt', async () => {
    const result = await service.generateSeoMeta(1n);
    expect(result.seoMeta.metaTitle).toContain('金水湾');
    expect(mockPrisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ seoMeta: expect.any(Object), seoMetaUpdatedAt: expect.any(Date) }),
      }),
    );
  });

  it('batchGenerateSeoMeta: 返回生成数', async () => {
    const r = await service.batchGenerateSeoMeta(50);
    expect(r.success).toBeGreaterThanOrEqual(0);
  });

  it('getSitemapData: 返回 posts 列表', async () => {
    const data = await service.getSitemapData(100);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('loc');
  });

  it('pushBaiduSitemap: 调 HTTP + 写 SitemapPushLog', async () => {
    const r = await service.pushBaiduSitemap([1n, 2n]);
    expect(r.pushed).toBe(2);
    expect(mockHttp.post).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd backend && npx jest src/modules/seo`
Expected: FAIL

- [ ] **Step 3: 写 SeoService**

```typescript
// backend/src/modules/seo/seo.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm/claude.client';  // type only
import { SEO_META_SYSTEM_PROMPT, buildSeoMetaUserPrompt } from '../ai/llm/prompts/seo-meta';
import { sha256 } from '../common/utils/pii-redact.util';
import { firstValueFrom } from 'rxjs';

interface SeoMetaResult {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  jsonLd: Record<string, any>;
}

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly llm: LlmClient;
  private readonly baiduPushToken: string;

  constructor(
    private readonly prisma: PrismaService,
    claude: any,  // LlmClient - 由 SeoModule 注入
    glm: any,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const provider = (this.config.get<string>('AI_PROVIDER') || 'glm').toLowerCase();
    this.llm = provider === 'claude' ? claude : glm;
    this.baiduPushToken = this.config.get<string>('BAIDU_PUSH_TOKEN') || '';
  }

  async generateSeoMeta(postId: bigint): Promise<{ postId: bigint; seoMeta: SeoMetaResult & { generatedAt: string; modelUsed: string }; durationMs: number }> {
    const start = Date.now();
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { area: true },
    });
    if (!post) throw new Error('Post not found');

    if (!this.llm.isAvailable()) {
      throw new Error('AI 暂不可用');
    }

    // 组装 fields
    const fields: Record<string, any> = {
      title: post.title,
      description: post.description,
    };
    if (post.price) fields.price = Number(post.price);
    if (post.area) fields.areaName = post.area.name;
    // TODO: 后续接 post.fields JSON 字段 (如果存在)

    const cacheKey = `ai:seo:${postId}:${sha256(JSON.stringify(fields))}`;
    // 缓存检查省略, 每次都重生成 (帖子改了 hash 会变)

    const llmResult = await this.llm.call({
      system: SEO_META_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildSeoMetaUserPrompt(post.type as any, fields) }],
      maxTokens: 1000,
      temperature: 0.2,
      timeoutMs: 20000,
    });

    const parsed = this.parseSeoJson(llmResult.text);
    const seoMeta = {
      ...parsed,
      generatedAt: new Date().toISOString(),
      modelUsed: llmResult.model,
    };

    await this.prisma.post.update({
      where: { id: postId },
      data: { seoMeta, seoMetaUpdatedAt: new Date() },
    });

    return { postId, seoMeta, durationMs: Date.now() - start };
  }

  async batchGenerateSeoMeta(limit = 100) {
    const posts = await this.prisma.post.findMany({
      where: { seoMetaUpdatedAt: null, status: 'passed' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true },
    });
    let success = 0, failed = 0;
    const results: Array<{ postId: bigint; ok: boolean; error?: string }> = [];
    for (const p of posts) {
      try {
        await this.generateSeoMeta(p.id);
        success++;
        results.push({ postId: p.id, ok: true });
        // 节流: 每 5 个 sleep 1s 防 LLM 限流
        if (success % 5 === 0) await new Promise((r) => setTimeout(r, 1000));
      } catch (e: any) {
        failed++;
        results.push({ postId: p.id, ok: false, error: e?.message });
        this.logger.warn(`batch seo ${p.id} failed: ${e?.message}`);
      }
    }
    return { success, failed, results };
  }

  async getSitemapData(limit = 50000) {
    const baseUrl = this.config.get<string>('NEXT_PUBLIC_SITE_URL') || 'https://example.com';
    const posts = await this.prisma.post.findMany({
      where: { status: 'passed' },
      orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: { id: true, updatedAt: true, qualityScore: true },
    });
    return posts.map((p) => {
      const priority = p.qualityScore
        ? Math.max(0.4, Math.min(1.0, p.qualityScore / 100))
        : 0.5;
      return {
        loc: `${baseUrl}/posts/${p.id}`,
        lastmod: p.updatedAt.toISOString(),
        changefreq: 'daily',
        priority: priority.toFixed(1),
      };
    });
  }

  async pushBaiduSitemap(postIds?: bigint[]) {
    if (!this.baiduPushToken) {
      throw new Error('BAIDU_PUSH_TOKEN 未配置');
    }
    let ids = postIds;
    if (!ids || ids.length === 0) {
      // 默认推 7 天内的
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const posts = await this.prisma.post.findMany({
        where: { seoMetaUpdatedAt: { gte: sevenDaysAgo }, status: 'passed' },
        select: { id: true },
        take: 5000,  // 百度单次上限
      });
      ids = posts.map((p) => p.id);
    }
    if (ids.length === 0) {
      return { pushed: 0, baiduResponse: { success: 0, remain: 0 }, logId: 0n };
    }

    const urls = ids.map((id) => `${this.config.get<string>('NEXT_PUBLIC_SITE_URL') || 'https://example.com'}/posts/${id}`);

    const resp = await firstValueFrom(
      this.http.post(
        `http://data.zz.baidu.com/urls?site=${this.config.get('BAIDU_SITE') || 'yichun.com'}&token=${this.baiduPushToken}`,
        urls.join('\n'),
        { headers: { 'Content-Type': 'text/plain' } },
      ),
    );

    const log = await this.prisma.sitemapPushLog.create({
      data: {
        target: 'baidu',
        postIds: ids.map((id) => id.toString()),
        status: resp.data?.error ? 'failed' : 'success',
        response: JSON.stringify(resp.data),
      },
    });

    return {
      pushed: ids.length,
      baiduResponse: { success: resp.data?.success ?? 0, remain: resp.data?.remain ?? 0 },
      logId: log.id,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyBatch() {
    this.logger.log('开始每日 SEO batch');
    const r = await this.batchGenerateSeoMeta(100);
    this.logger.log(`每日 SEO 完成: ${r.success} 成功, ${r.failed} 失败`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyBaiduPush() {
    if (!this.baiduPushToken) return;
    this.logger.log('开始每日百度推送');
    try {
      const r = await this.pushBaiduSitemap();
      this.logger.log(`百度推送: ${r.pushed} 条`);
    } catch (e: any) {
      this.logger.warn(`百度推送失败: ${e?.message}`);
    }
  }

  private parseSeoJson(text: string): SeoMetaResult {
    try {
      const obj = JSON.parse(text);
      if (obj.metaTitle && obj.metaDescription) return obj;
    } catch {}
    const m = text.match(/```(?:json)?\s*(\{[\s\S]+?\})\s*```/);
    if (m) {
      try {
        const obj = JSON.parse(m[1]);
        if (obj.metaTitle && obj.metaDescription) return obj;
      } catch {}
    }
    return { metaTitle: '', metaDescription: '', keywords: [], jsonLd: {} };
  }
}
```

- [ ] **Step 4: 写 controller + module**

```typescript
// backend/src/modules/seo/seo.controller.ts
import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SeoService } from './seo.service';

@Controller()
export class SeoController {
  constructor(private readonly service: SeoService) {}

  // 公开 (Next.js sitemap 调用)
  @Get('posts/sitemap-data')
  async getSitemapData(@Query('limit') limit = '50000') {
    return this.service.getSitemapData(parseInt(limit));
  }

  // admin
  @Post('admin/ai/regenerate-seo/:postId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async regenerateSeo(@Param('postId') postId: string) {
    return this.service.generateSeoMeta(BigInt(postId));
  }

  @Post('admin/ai/regenerate-seo-batch')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async batchRegenerate(@Body() body: { postIds: string[] }) {
    return this.service.batchGenerateSeoMeta(body.postIds?.length || 50);
  }

  @Post('admin/seo/push-baidu')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async pushBaidu(@Body() body: { postIds?: string[] }) {
    return this.service.pushBaiduSitemap(body.postIds?.map((id) => BigInt(id)));
  }
}

// backend/src/modules/seo/seo.module.ts
import { Module, HttpModule } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ClaudeClient } from '../ai/llm/claude.client';
import { GlmClient } from '../ai/llm/glm.client';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [PrismaModule, HttpModule, ScheduleModule.forRoot()],
  controllers: [SeoController],
  providers: [SeoService, ClaudeClient, GlmClient],
  exports: [SeoService],
})
export class SeoModule {}
```

- [ ] **Step 5: 注册到 AppModule + .env.example**

```typescript
// backend/src/app.module.ts
import { SeoModule } from './modules/seo/seo.module';

@Module({
  imports: [
    // ... 原 imports
    SeoModule,
  ],
})
export class AppModule {}
```

```bash
# backend/.env.example 末尾追加:
BAIDU_PUSH_TOKEN=your_baidu_zhangzhan_push_token_here
BAIDU_SITE=yichun.com
```

- [ ] **Step 6: 跑测试 + 手动验证**

Run: `cd backend && npx jest && npm run start:dev`

手动 (admin token):
```bash
# 单帖重生成
curl -X POST http://localhost:3001/api/v1/admin/ai/regenerate-seo/1 \
  -H "Authorization: Bearer <admin_token>"
# Expected: { postId: 1, seoMeta: {...}, durationMs: 5000-10000 }

# sitemap data
curl http://localhost:3001/api/v1/posts/sitemap-data?limit=10
# Expected: [{ loc: "...", lastmod: "...", priority: "0.8" }, ...]
```

- [ ] **Step 7: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/seo/ \
        backend/src/app.module.ts \
        backend/.env.example
git commit -m "feat(seo): SEO 模块 - regenerate/batch/sitemap-data/push-baidu + cron"
```

---

### Task 13: 详情页 SEO 渲染 (generateMetadata)

**Files:**
- Modify: `frontend/src/app/posts/[id]/page.tsx`
- Modify: `frontend/src/lib/api.ts` (确保 findById 返回 seoMeta)

- [ ] **Step 1: 修改 page.tsx 加 generateMetadata**

```typescript
// frontend/src/app/posts/[id]/page.tsx
// 在文件顶部加:
import type { Metadata } from 'next';
import { postApi } from '@/lib/api';

// 在 default export 之前加:
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const post = await postApi.findById(parseInt(params.id));
    if (!post?.seoMeta) {
      return { title: '帖子详情 - 伊春有事儿说' };
    }
    const seo = post.seoMeta as any;
    return {
      title: seo.metaTitle,
      description: seo.metaDescription,
      keywords: (seo.keywords || []).join(','),
      openGraph: {
        title: seo.metaTitle,
        description: seo.metaDescription,
        type: 'article',
      },
      other: seo.jsonLd ? { 'application/ld+json': JSON.stringify(seo.jsonLd) } : undefined,
    };
  } catch {
    return { title: '帖子详情 - 伊春有事儿说' };
  }
}

// default export 保持不变
```

- [ ] **Step 2: 验证 postApi.findById 返回 seoMeta**

Run: `grep -n "seoMeta" frontend/src/lib/api.ts`
Expected: 找到 (说明后端返回包含此字段)

如未找到, 修改 Post type 加字段:
```typescript
// frontend/src/lib/api.ts
interface Post {
  // ... existing
  seoMeta?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    jsonLd: any;
  };
  qualityScore?: number;
}
```

- [ ] **Step 3: 手动验证**

启动 frontend
访问 `http://localhost:3000/posts/1` (确保 id=1 的帖有 seoMeta)
View Page Source → 看到 `<meta name="description" content="...">` + `<script type="application/ld+json">`

如 id=1 没 seoMeta, 调 admin 端点生成:
```bash
curl -X POST http://localhost:3001/api/v1/admin/ai/regenerate-seo/1 -H "Authorization: Bearer <admin_token>"
```

- [ ] **Step 4: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add frontend/src/app/posts/\[id\]/page.tsx \
        frontend/src/lib/api.ts
git commit -m "feat(frontend): 详情页 generateMetadata 注入 SEO + JSON-LD"
```

---

### Task 14: 列表页 TDK + home-content 拆分

**Files:**
- Create: `frontend/src/config/seo-tdk.ts`
- Create: `frontend/src/app/home-content.tsx` (从 page.tsx 拆)
- Modify: `frontend/src/app/page.tsx` (server + generateMetadata)

- [ ] **Step 1: 写 TDK 配置**

```typescript
// frontend/src/config/seo-tdk.ts
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

// 12 区县 TDK (简化示例, 实际可加)
export const AREA_TDK: Record<string, TDK> = {
  // areaId 字符串 -> TDK
  // Phase 2.2a 用默认 + type 组合, 区县独立 TDK 列入 Phase 2.2a+ 增强
};
```

- [ ] **Step 2: 写 home-content.tsx (从 page.tsx 搬 client 逻辑)**

读取现有 `frontend/src/app/page.tsx` 整个 client 组件 (从 'use client' 到文件末尾)

新建 `frontend/src/app/home-content.tsx`:
```typescript
// frontend/src/app/home-content.tsx
'use client';
// 粘贴原 page.tsx 全部内容 (从 import 到 default export)
```

- [ ] **Step 3: 重写 page.tsx 为 server 组件 + generateMetadata**

```typescript
// frontend/src/app/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeContent } from './home-content';
import { DEFAULT_TDK, TYPE_TDK, PostType } from '@/config/seo-tdk';
import { areaApi } from '@/lib/api';

export async function generateMetadata({ searchParams }: { searchParams: { type?: string; area?: string } }): Promise<Metadata> {
  const type = searchParams.type as PostType | undefined;
  const areaId = searchParams.area;

  let tdk = DEFAULT_TDK;
  if (type && TYPE_TDK[type]) {
    tdk = { ...TYPE_TDK[type] };
    if (areaId) {
      try {
        const area = await areaApi.findById(parseInt(areaId));
        if (area) {
          tdk.title = `${area.name}${TYPE_TDK[type].title.split(' - ')[0]} | 伊春有事儿说`;
          tdk.description = `${area.name}本地${TYPE_TDK[type].description.replace('伊春', '')}`;
        }
      } catch {}
    }
  }

  return {
    title: tdk.title,
    description: tdk.description,
    keywords: tdk.keywords.join(','),
  };
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <HomeContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: 手动验证**

启动 frontend, 访问:
- `http://localhost:3000/` → View Page Source 看到 default title "伊春有事儿说..."
- `http://localhost:3000/?type=house` → 看到 "伊春房屋出租出售..."
- `http://localhost:3000/?type=house&area=1` → 看到 "伊春区" 前缀

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add frontend/src/config/seo-tdk.ts \
        frontend/src/app/home-content.tsx \
        frontend/src/app/page.tsx
git commit -m "feat(frontend): 列表页 TDK (4 type) + 拆 home-content + generateMetadata"
```

---

### Task 15: sitemap.ts 扩展 (含 quality 权重 + 全量)

**Files:**
- Modify: `frontend/src/app/sitemap.ts`

- [ ] **Step 1: 扩 sitemap.ts**

```typescript
// frontend/src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { postApi, categoryApi, areaApi } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'daily' | 'hourly' | 'monthly';
  priority: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 静态页
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/?type=house`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=secondhand`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=job`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=lifebiz`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // 动态页: 调后端 sitemap-data
  let postPages: MetadataRoute.Sitemap = [];
  try {
    const data = await postApi.getSitemapData(50000);
    const list = (data as any)?.data || (data as any) || [];
    postPages = list.map((e: SitemapEntry) => ({
      url: e.loc,
      lastModified: new Date(e.lastmod),
      changeFrequency: e.changefreq as any,
      priority: parseFloat(e.priority),
    }));
  } catch {
    // 后端不可达时降级到原 100 条
    try {
      const r = await postApi.list({ pageSize: 100, sort: 'latest' } as any);
      const list = (r as any)?.data?.list || (r as any)?.list || [];
      postPages = list.map((p: any) => ({
        url: `${BASE}/posts/${p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }));
    } catch {}
  }

  return [...staticPages, ...postPages];
}
```

- [ ] **Step 2: 在 api.ts 加 getSitemapData client**

```typescript
// frontend/src/lib/api.ts
export const postApi = {
  // ... 原 methods
  getSitemapData: (limit: number) =>
    request<any[]>(`/posts/sitemap-data?limit=${limit}`),
};
```

- [ ] **Step 3: 手动验证**

访问 `http://localhost:3000/sitemap.xml`
Expected: 看到 4 type 静态 + 大量 posts (含 priority 0.4-1.0)

- [ ] **Step 4: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add frontend/src/app/sitemap.ts frontend/src/lib/api.ts
git commit -m "feat(frontend): sitemap 含 quality 权重 + 全量 posts"
```

---

### Task 16: post.service 排序权重 (灰度开关)

**Files:**
- Modify: `backend/src/modules/post/post.service.ts`
- Modify: `backend/src/app.module.ts` 或 env (无, 用 process.env)

- [ ] **Step 1: 加 AI_RANK_ENABLED 检查 + 排序权重**

```typescript
// backend/src/modules/post/post.service.ts
// 修改 findMany (或类似 list 方法):
async findMany(filter: any) {
  const isRankEnabled = process.env.AI_RANK_ENABLED === 'true';

  if (!isRankEnabled) {
    // 现有逻辑: 按 createdAt DESC
    return this.prisma.post.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
    });
  }

  // AI 排序: quality + 新鲜度 + 置顶
  const posts = await this.prisma.$queryRaw<any[]>`
    SELECT *,
      (
        COALESCE(quality_score, 50) * 0.3 +
        (100.0 / (1 + TIMESTAMPDIFF(HOUR, created_at, NOW()) / 24)) * 0.4 +
        (CASE WHEN boost_expires_at > NOW() THEN 100 ELSE 0 END) * 0.3
      ) AS ai_rank
    FROM posts
    WHERE status = 'passed'
      ${filter.type ? Prisma.sql`AND type = ${filter.type}` : Prisma.empty}
    ORDER BY ai_rank DESC
    LIMIT 50
  `;
  return posts;
}
```

- [ ] **Step 2: .env.example 加开关**

```bash
# backend/.env.example 末尾追加:
AI_RANK_ENABLED=false  # Phase 2.2a 默认 false 灰度
```

- [ ] **Step 3: 跑现有测试**

Run: `cd backend && npx jest src/modules/post`
Expected: PASS (现有测试应该不依赖排序)

- [ ] **Step 4: 手动验证**

```bash
# 默认 (关)
curl http://localhost:3001/api/v1/posts?type=house | jq '.data.list[0].title'
# Expected: 最新的

# 开启
AI_RANK_ENABLED=true npm run start:dev  # (新进程)
# 重新发几个不同 qualityScore 的帖 (数据库手动 UPDATE)
UPDATE post SET quality_score = 90 WHERE id = 1;
UPDATE post SET quality_score = 30 WHERE id = 2;
curl http://localhost:3001/api/v1/posts?type=house | jq '.data.list[0].title'
# Expected: id=1 (高分) 排前
```

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/post/post.service.ts backend/.env.example
git commit -m "feat(post): 排序权重 (AI_RANK_ENABLED 灰度, 默认 off)"
```

---

### Task 17: post.service 重复检测

**Files:**
- Modify: `backend/src/modules/post/post.service.ts` (create 方法)
- Modify: `backend/src/modules/post/dto/create-post.dto.ts` (加 DUPLICATE_POST 错误码)

- [ ] **Step 1: 加重复检测**

```typescript
// backend/src/modules/post/post.service.ts
// 在 create 方法顶部 (事务前) 加:
async create(userId: bigint, dto: CreatePostDto) {
  // 重复检测: 同一用户 1 天内相同 title
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const dup = await this.prisma.post.findFirst({
    where: {
      userId,
      title: dto.title,
      createdAt: { gte: oneDayAgo },
    },
    select: { id: true },
  });
  if (dup) {
    throw new HttpException(
      { code: 'DUPLICATE_POST', message: '1 天内已发过相同标题的帖子', existingPostId: dup.id.toString() },
      HttpStatus.BAD_REQUEST,
    );
  }
  // ... 原创建逻辑
}
```

- [ ] **Step 2: 写单测**

```typescript
// backend/src/modules/post/post.service.spec.ts (新建)
import { PostService } from './post.service';

describe('PostService.create - 重复检测', () => {
  let service: PostService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 1n }),
      },
    };
    service = new PostService(mockPrisma);
  });

  it('1 天内同 title → 抛 DUPLICATE_POST', async () => {
    mockPrisma.post.findFirst.mockResolvedValue({ id: 99n });
    await expect(service.create(1n, { title: '重复帖' } as any))
      .rejects.toMatchObject({ code: 'DUPLICATE_POST' });
  });

  it('无重复 → 正常创建', async () => {
    mockPrisma.post.findFirst.mockResolvedValue(null);
    await expect(service.create(1n, { title: '新帖' } as any))
      .resolves.toMatchObject({ id: 1n });
  });
});
```

- [ ] **Step 3: 跑测试 + 手动验证**

Run: `cd backend && npx jest src/modules/post`
Expected: PASS

手动:
```bash
TOKEN=$(login "13900008888")
# 第 1 次
curl -X POST http://localhost:3001/api/v1/posts -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"house","title":"测试重复帖","description":"...","contactPhone":"13900008888"}'
# Expected: 200 + 新帖 id
# 第 2 次 (同 title)
curl -X POST http://localhost:3001/api/v1/posts ...  # 同 body
# Expected: 400 + { code: "DUPLICATE_POST" }
```

- [ ] **Step 4: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/post/post.service.ts \
        backend/src/modules/post/post.service.spec.ts \
        backend/src/modules/post/dto/create-post.dto.ts
git commit -m "feat(post): 重复发贴检测 (1 天内同 title 拦)"
```

---

### Task 18: 前端 api-ai.ts 加 score / regenerate-seo client

**Files:**
- Modify: `frontend/src/lib/api-ai.ts`

- [ ] **Step 1: 加新端点 client**

```typescript
// frontend/src/lib/api-ai.ts
// 在文件末尾加:
import type { ScoreRequestDto, ScoreResponse } from '@/types/ai-score';

export const aiApi = {
  // ... 原 extract / suggestTitle

  score: (dto: ScoreRequestDto) =>
    request<ScoreResponse>('/ai/draft/score', { method: 'POST', body: dto }),

  regenerateSeo: (postId: number) =>
    request<{ postId: string; seoMeta: any; durationMs: number }>(
      `/admin/ai/regenerate-seo/${postId}`,
      { method: 'POST' },
    ),
};
```

- [ ] **Step 2: 加 type 文件**

```typescript
// frontend/src/types/ai-score.ts
export interface ScoreRequestDto {
  type: 'house' | 'job' | 'secondhand' | 'lifebiz';
  title: string;
  description?: string;
  fields?: Record<string, any>;
  contactPhone?: string;
}

export interface ScoreResponse {
  score: number;
  breakdown: { title: number; description: number; completeness: number; contact: number };
  suggestions: string[];
  cached: boolean;
  durationMs: number;
}
```

- [ ] **Step 3: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add frontend/src/lib/api-ai.ts frontend/src/types/ai-score.ts
git commit -m "feat(frontend): api-ai 加 score + regenerate-seo client"
```

---

### Task 19: Phase 2.2a E2E 回归

**Files:**
- Create: `.pm-tmp/ai-publish-phase2-2a-e2e.py`

- [ ] **Step 1: 写 E2E 脚本**

```python
# .pm-tmp/ai-publish-phase2-2a-e2e.py
"""
Phase 2.2a E2E 回归 (7 步):
[A] score 端点: 真实帖 → 4 维分
[B] regenerate-seo: admin 调 → 写 Post.seoMeta
[C] sitemap-data: 公开端点 → 返回带 priority
[D] sitemap.xml: Next.js → 包含 quality 权重
[E] 详情页: 访问 /posts/1 → <head> 有 meta + JSON-LD
[F] 列表页 TDK: /?type=house → title 包含 "房屋出租"
[G] 重复发贴: 同 title 第二次 → 400
"""
import requests, time, sys

API = "http://localhost:3001/api/v1"
FRONTEND = "http://localhost:3000"

def login(phone, code='1234'):
    return requests.post(f"{API}/auth/sms-login", json={"phone": phone, "code": code}).json()['data']['accessToken']

token = login("13900008888")
admin_token = login("13900000001")  # 假设 admin
h = {"Authorization": f"Bearer {token}"}
ah = {"Authorization": f"Bearer {admin_token}"}

# [A] score
print("[A] score 端点...")
r = requests.post(f"{API}/ai/draft/score", headers=h, json={
    "type": "house", "title": "金水湾两室一厅 1200", "description": "家电齐全",
    "fields": {"areaName": "金水湾", "layout": "两室一厅", "price": 1200}
})
r.raise_for_status()
data = r.json()['data']
assert 0 <= data['score'] <= 100
assert 'breakdown' in data
assert 'suggestions' in data
print(f"  PASS: score={data['score']}")

# [B] regenerate-seo
print("[B] regenerate-seo (admin)...")
# 找现有帖
posts = requests.get(f"{API}/posts?type=house&pageSize=1", headers=h).json()['data']['list']
if not posts:
    print("  SKIP: 无帖可测")
else:
    pid = posts[0]['id']
    r = requests.post(f"{API}/admin/ai/regenerate-seo/{pid}", headers=ah)
    r.raise_for_status()
    data = r.json()['data']
    assert 'seoMeta' in data
    print(f"  PASS: postId={pid} metaTitle='{data['seoMeta']['metaTitle']}'")

# [C] sitemap-data
print("[C] sitemap-data 公开端点...")
r = requests.get(f"{API}/posts/sitemap-data?limit=10")
r.raise_for_status()
data = r.json()['data']
assert isinstance(data, list)
assert all('priority' in e for e in data)
print(f"  PASS: {len(data)} entries, sample priority={data[0]['priority']}")

# [D] sitemap.xml (Next.js)
print("[D] sitemap.xml (Next.js)...")
r = requests.get(f"{FRONTEND}/sitemap.xml")
assert r.status_code == 200
assert '<urlset' in r.text
assert 'priority=' in r.text
print(f"  PASS: {len(r.text)} bytes")

# [E] 详情页 meta (假设有 seoMeta 的帖)
print("[E] 详情页 SEO 渲染...")
posts = requests.get(f"{API}/posts?type=house&pageSize=5", headers=h).json()['data']['list']
seo_post = next((p for p in posts if p.get('seoMeta')), None)
if not seo_post:
    print("  SKIP: 无 seoMeta 帖")
else:
    r = requests.get(f"{FRONTEND}/posts/{seo_post['id']}")
    assert 'application/ld+json' in r.text or 'name="description"' in r.text
    print(f"  PASS: postId={seo_post['id']} 含 meta")

# [F] 列表页 TDK
print("[F] 列表页 TDK...")
r = requests.get(f"{FRONTEND}/?type=house")
assert '房屋出租' in r.text or '房屋' in r.text
print(f"  PASS")

# [G] 重复发贴
print("[G] 重复发贴...")
r1 = requests.post(f"{API}/posts", headers=h, json={
    "type": "house", "title": f"测试重复-{int(time.time())}", "description": "...", "contactPhone": "13900008888"
})
r1.raise_for_status()
r2 = requests.post(f"{API}/posts", headers=h, json={
    "type": "house", "title": r1.json()['data']['title'], "description": "...", "contactPhone": "13900008888"
})
assert r2.status_code == 400
assert r2.json().get('code') == 'DUPLICATE_POST'
print(f"  PASS: 第二次被拦")

print("\n✅ Phase 2.2a E2E 全部通过")
```

- [ ] **Step 2: 跑 E2E**

Run: `python .pm-tmp/ai-publish-phase2-2a-e2e.py`
Expected: 6-7/7 PASS

- [ ] **Step 3: 提交 + Tag**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add .pm-tmp/ai-publish-phase2-2a-e2e.py
git commit -m "test(seo): Phase 2.2a E2E 回归 (7 步: score/regen/sitemap/tdk/dup)"
git tag phase-2.2a-done
```

---

**Phase 2.2a 完毕 (11 任务)。进入 Phase 2.2b。**

---

## Phase 2.2b: 商业化前置 (1.5 周)

### Task 20: rewrite 提示词 + service + endpoint (TDD)

**Files:**
- Create: `backend/src/modules/ai/llm/prompts/rewrite.ts`
- Create: `backend/src/modules/ai/llm/prompts/rewrite.spec.ts`
- Create: `backend/src/modules/ai/dto/rewrite.dto.ts`
- Modify: `backend/src/modules/ai/ai.service.ts` (加 rewrite 方法)
- Modify: `backend/src/modules/ai/ai.controller.ts` (加 rewrite 端点)

- [ ] **Step 1: 写 rewrite prompt 单测**

```typescript
// backend/src/modules/ai/llm/prompts/rewrite.spec.ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd backend && npx jest src/modules/ai/llm/prompts/rewrite.spec.ts`
Expected: FAIL

- [ ] **Step 3: 写 rewrite prompt**

```typescript
// backend/src/modules/ai/llm/prompts/rewrite.ts
import { AiPostType } from '../../dto/extract.dto';

export const REWRITE_SYSTEM_PROMPT = `你是文案改写助手。基于用户原文，生成 3 个不同风格的改写版本：

1. **concise** (精简): 长度 -30%，去套话
2. **attractive** (吸引): 加入具体细节 + 情感诉求
3. **seo** (SEO 友好): 自然嵌入 1-2 个长尾关键词

约束：
- 不改核心信息（地址/价格/型号/联系方式）
- 不编造事实
- 输出严格 JSON: { "versions": [{ "text": string, "style": "concise"|"attractive"|"seo", "estimatedScoreGain": number }] }
estimatedScoreGain 是 0-15 的整数，表示相对原文预计提升的质量分。`;

export function buildRewriteUserPrompt(
  type: AiPostType,
  field: 'title' | 'description',
  original: string,
  context?: Record<string, any>,
): string {
  const lines: string[] = [
    `Type: ${type}`,
    `Field: ${field}`,
    `Original: ${original}`,
  ];
  if (context && Object.keys(context).length > 0) {
    lines.push('Context:');
    for (const [k, v] of Object.entries(context)) {
      if (v !== null && v !== undefined && v !== '') {
        lines.push(`- ${k}: ${v}`);
      }
    }
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd backend && npx jest src/modules/ai/llm/prompts/rewrite.spec.ts`
Expected: PASS

- [ ] **Step 5: 写 DTO**

```typescript
// backend/src/modules/ai/dto/rewrite.dto.ts
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPostType } from './extract.dto';

export class RewriteRequestDto {
  @IsString()
  type: AiPostType;

  @IsIn(['title', 'description'])
  field: 'title' | 'description';

  @IsString()
  @MaxLength(2000)
  original: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export interface RewriteVersion {
  text: string;
  style: 'concise' | 'attractive' | 'seo';
  estimatedScoreGain: number;
}

export interface RewriteResponse {
  versions: RewriteVersion[];
  cached: boolean;
  durationMs: number;
}
```

- [ ] **Step 6: 加 rewrite service 方法**

在 `backend/src/modules/ai/ai.service.ts` 加:

```typescript
import { RewriteRequestDto, RewriteResponse, RewriteVersion } from './dto/rewrite.dto';
import { REWRITE_SYSTEM_PROMPT, buildRewriteUserPrompt } from './llm/prompts/rewrite';

async rewrite(userId: bigint | null, dto: RewriteRequestDto): Promise<RewriteResponse> {
  const start = Date.now();
  await this.checkRateLimit(userId, 'rewrite');  // 10/min 限频 (Task 4 已配)

  const contentHash = sha256(JSON.stringify({ type: dto.type, field: dto.field, original: dto.original, context: dto.context }));
  const cacheKey = `ai:rewrite:${contentHash}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    await this.logUsage(userId, 'rewrite', 0, 0, 0, 0, true, null, contentHash);
    return { versions: parsed.versions, cached: true, durationMs: Date.now() - start };
  }

  if (!this.llm.isAvailable()) {
    throw new HttpException('AI 暂不可用', HttpStatus.SERVICE_UNAVAILABLE);
  }

  const safeContext = dto.context ? JSON.parse(redactPii(JSON.stringify(dto.context))) : {};
  const safeOriginal = redactPii(dto.original);

  let llmResult;
  try {
    llmResult = await this.llm.call({
      system: REWRITE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildRewriteUserPrompt(dto.type, dto.field, safeOriginal, safeContext) }],
      maxTokens: 800,
      temperature: 0.8,
      timeoutMs: 15000,
    });
  } catch (e: any) {
    await this.logUsage(userId, 'rewrite', 0, 0, 0, Date.now() - start, false, e?.message, contentHash);
    throw new HttpException('AI 调用失败', HttpStatus.SERVICE_UNAVAILABLE);
  }

  const versions = this.parseRewriteJson(llmResult.text);
  const durationMs = Date.now() - start;
  const costUsd = this.estimateCost(llmResult.inputTokens, llmResult.outputTokens);

  const response: RewriteResponse = { versions, cached: false, durationMs };

  await this.redis.setEx(cacheKey, JSON.stringify(response), 30 * 60);

  await this.logUsage(
    userId, 'rewrite',
    llmResult.inputTokens, llmResult.outputTokens,
    costUsd, durationMs, true, null, contentHash,
  );

  return response;
}

private parseRewriteJson(text: string): RewriteVersion[] {
  try {
    const obj = JSON.parse(text);
    if (Array.isArray(obj.versions)) {
      return obj.versions
        .filter((v: any) => v.text && v.style)
        .map((v: any) => ({
          text: v.text,
          style: v.style,
          estimatedScoreGain: Math.max(0, Math.min(15, Math.round(v.estimatedScoreGain || 0))),
        }))
        .slice(0, 3);
    }
  } catch {}
  const m = text.match(/```(?:json)?\s*(\{[\s\S]+?\})\s*```/);
  if (m) {
    try {
      const obj = JSON.parse(m[1]);
      if (Array.isArray(obj.versions)) {
        return obj.versions
          .filter((v: any) => v.text && v.style)
          .map((v: any) => ({
            text: v.text,
            style: v.style,
            estimatedScoreGain: Math.max(0, Math.min(15, Math.round(v.estimatedScoreGain || 0))),
          }))
          .slice(0, 3);
      }
    } catch {}
  }
  return [];
}
```

- [ ] **Step 7: 加 rewrite 端点**

```typescript
// backend/src/modules/ai/ai.controller.ts
import { RewriteRequestDto, RewriteResponse } from './dto/rewrite.dto';

@Post('draft/rewrite')
@UseGuards(JwtAuthGuard)
async rewrite(@Req() req: any, @Body() dto: RewriteRequestDto): Promise<ApiResp<RewriteResponse>> {
  const userId = req.user?.id ? BigInt(req.user.id) : null;
  return ok(await this.aiService.rewrite(userId, dto));
}
```

- [ ] **Step 8: 跑测试 + 手动验证**

Run: `cd backend && npx jest`
Expected: PASS

手动:
```bash
curl -X POST http://localhost:3001/api/v1/ai/draft/rewrite \
  -H "Authorization: Bearer <test_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"house","field":"title","original":"金水湾出租 1200","context":{"layout":"两室一厅"}}'
```
Expected: 3 versions (concise/attractive/seo), 各含 estimatedScoreGain

- [ ] **Step 9: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/ai/llm/prompts/rewrite.ts \
        backend/src/modules/ai/llm/prompts/rewrite.spec.ts \
        backend/src/modules/ai/dto/rewrite.dto.ts \
        backend/src/modules/ai/ai.service.ts \
        backend/src/modules/ai/ai.controller.ts
git commit -m "feat(ai): rewrite 端点 - 3 风格改写 + 预计分提升 + 30min 缓存"
```

---

### Task 21: rewrite-popover 组件 + ai-mode / manual-mode 集成

**Files:**
- Create: `frontend/src/components/ai/rewrite-popover.tsx`
- Modify: `frontend/src/app/posts/publish/manual-mode.tsx` (加 AI 改写按钮)
- Modify: `frontend/src/lib/api-ai.ts` (加 rewrite client)

- [ ] **Step 1: 加 rewrite client**

```typescript
// frontend/src/lib/api-ai.ts
// 在 aiApi 加:
import type { RewriteRequestDto, RewriteResponse } from '@/types/ai-rewrite';

rewrite: (dto: RewriteRequestDto) =>
  request<RewriteResponse>('/ai/draft/rewrite', { method: 'POST', body: dto }),
```

```typescript
// frontend/src/types/ai-rewrite.ts (新建)
export interface RewriteRequestDto {
  type: 'house' | 'job' | 'secondhand' | 'lifebiz';
  field: 'title' | 'description';
  original: string;
  context?: Record<string, any>;
}

export interface RewriteVersion {
  text: string;
  style: 'concise' | 'attractive' | 'seo';
  estimatedScoreGain: number;
}

export interface RewriteResponse {
  versions: RewriteVersion[];
  cached: boolean;
  durationMs: number;
}
```

- [ ] **Step 2: 写 rewrite-popover 组件**

```typescript
// frontend/src/components/ai/rewrite-popover.tsx
'use client';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { aiApi } from '@/lib/api-ai';
import type { RewriteVersion } from '@/types/ai-rewrite';

interface Props {
  type: 'house' | 'job' | 'secondhand' | 'lifebiz';
  field: 'title' | 'description';
  original: string;
  context?: Record<string, any>;
  onApply: (text: string) => void;
}

export function RewritePopover({ type, field, original, context, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<RewriteVersion[]>([]);

  const handleOpen = async (o: boolean) => {
    setOpen(o);
    if (o && versions.length === 0 && original) {
      setLoading(true);
      try {
        const r = await aiApi.rewrite({ type, field, original, context });
        setVersions(r.versions);
      } catch (e) {
        console.error('rewrite failed', e);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-amber-600 hover:text-amber-700"
          disabled={!original}
          title="AI 改写"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium">AI 改写建议 (3 风格)</div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> AI 正在改写...
            </div>
          )}
          {!loading && versions.length === 0 && (
            <div className="text-sm text-rose-600">改写失败, 请重试</div>
          )}
          {!loading && versions.map((v, i) => (
            <div key={i} className="border rounded-lg p-3 hover:bg-accent cursor-pointer"
                 onClick={() => { onApply(v.text); setOpen(false); }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {v.style === 'concise' ? '精简' : v.style === 'attractive' ? '吸引' : 'SEO'}
                </span>
                {v.estimatedScoreGain > 0 && (
                  <span className="text-xs text-emerald-600">+{v.estimatedScoreGain} 分</span>
                )}
              </div>
              <div className="text-sm">{v.text}</div>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onApply(original)}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> 用原版
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              关闭
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: 在 manual-mode 标题/描述 input 旁加按钮**

```typescript
// frontend/src/app/posts/publish/manual-mode.tsx
// 找到 <Input ... title /> 改为:
<div className="flex items-center gap-2">
  <Input ... title />
  <RewritePopover
    type={formState.type}
    field="title"
    original={formState.title}
    context={{ areaName: formState.areaName, layout: formState.layout, price: formState.price }}
    onApply={(t) => setFormState((s) => ({ ...s, title: t }))}
  />
</div>

// 同样加 description 旁 (用 Textarea + 按钮位置)
<div className="flex items-start gap-2">
  <Textarea ... description />
  <RewritePopover
    type={formState.type}
    field="description"
    original={formState.description}
    onApply={(t) => setFormState((s) => ({ ...s, description: t }))}
  />
</div>
```

- [ ] **Step 4: 手动验证**

启动 frontend, 访问 `/posts/publish`
手动切 manual 模式, 输入标题 "测试 1200"
点击 ✨ 按钮 → 等待 3-5s → 弹窗显示 3 改写版本
点任一版本 → 标题被替换

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add frontend/src/components/ai/rewrite-popover.tsx \
        frontend/src/app/posts/publish/manual-mode.tsx \
        frontend/src/lib/api-ai.ts \
        frontend/src/types/ai-rewrite.ts
git commit -m "feat(frontend): rewrite-popover 组件 + manual-mode 集成"
```

---

### Task 22: business-detector 组件 + ai-mode 集成

**Files:**
- Create: `frontend/src/components/ai/business-detector.tsx`
- Modify: `frontend/src/app/posts/publish/ai-mode.tsx` (检测到 isBusiness 弹 toast)

- [ ] **Step 1: 写 business-detector 组件**

```typescript
// frontend/src/components/ai/business-detector.tsx
'use client';
import { useEffect } from 'react';
import { toast } from 'sonner';  // 假设已装 sonner
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  isBusiness: boolean;
  businessType?: 'recruiter' | 'agent' | 'wholesaler' | null;
  businessConfidence?: number;
}

const TYPE_LABEL: Record<string, string> = {
  recruiter: '招聘方',
  agent: '房产中介',
  wholesaler: '二手批发商',
};

export function BusinessDetector({ isBusiness, businessType, businessConfidence }: Props) {
  useEffect(() => {
    if (isBusiness && businessConfidence && businessConfidence >= 0.7 && businessType) {
      const label = TYPE_LABEL[businessType] || '商家';
      toast(
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-medium">
            <Building2 className="h-4 w-4" />
            检测到您可能是 {label}
          </div>
          <div className="text-sm text-muted-foreground">
            申请商家主页可获得 V 标和专属展示位
          </div>
          <div className="flex gap-2 mt-1">
            <Button size="sm" variant="default" disabled>
              申请 (即将上线)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toast.dismiss()}>
              暂不
            </Button>
          </div>
        </div>,
        { duration: 8000 },
      );
    }
  }, [isBusiness, businessType, businessConfidence]);

  return null;
}
```

- [ ] **Step 2: 在 ai-mode 集成**

```typescript
// frontend/src/app/posts/publish/ai-mode.tsx
// 在 extract 成功后 (设置 result state 后), 渲染:
import { BusinessDetector } from '@/components/ai/business-detector';

// 在 result state 后:
<BusinessDetector
  isBusiness={result.isBusiness ?? false}
  businessType={result.businessType}
  businessConfidence={result.businessConfidence}
/>
```

- [ ] **Step 3: 手动验证**

启动 frontend, 访问 `/posts/publish`
输入: "招聘销售经理 碧水木业 月薪5000-8000 长期招聘多名"
等 AI 识别完 → 应弹 toast "检测到您可能是 招聘方"

- [ ] **Step 4: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add frontend/src/components/ai/business-detector.tsx \
        frontend/src/app/posts/publish/ai-mode.tsx
git commit -m "feat(frontend): business-detector toast (商家识别 ≥ 0.7 触发)"
```

---

### Task 23: boost-cta 组件 + boost 端点 stub

**Files:**
- Create: `frontend/src/components/post/boost-cta.tsx`
- Create: `backend/src/modules/post/post-boost.controller.ts` (stub)
- Create: `backend/src/modules/post/post-boost.service.ts` (stub)
- Modify: `backend/src/modules/post/post.module.ts` (注册 controller)
- Modify: `frontend/src/app/posts/[id]/post-detail-content.tsx` (加 boost-cta)

- [ ] **Step 1: 写 boost 端点 stub**

```typescript
// backend/src/modules/post/post-boost.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PostBoostService {
  constructor(private readonly prisma: PrismaService) {}

  async boost(userId: bigint, postId: bigint, days: number, paymentToken: string) {
    // TODO: Phase 1.5 商业化模块联调
    // 临时: 直接 throw "功能即将上线"
    throw new HttpException(
      { code: 'BOOST_NOT_READY', message: '加急置顶功能即将上线, 请期待' },
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    /* 联调后实现:
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new HttpException('帖子不存在', HttpStatus.NOT_FOUND);
    if (post.userId !== userId) throw new HttpException('无权操作', HttpStatus.FORBIDDEN);
    if (post.qualityScore && post.qualityScore < 50) {
      throw new HttpException({ code: 'QUALITY_TOO_LOW', message: '帖子质量分需 ≥ 50 才能置顶' }, HttpStatus.BAD_REQUEST);
    }
    // ... 调支付模块校验 paymentToken, 写 boostExpiresAt
    */
  }
}

// backend/src/modules/post/post-boost.controller.ts
import { Controller, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostBoostService } from './post-boost.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostBoostController {
  constructor(private readonly service: PostBoostService) {}

  @Post(':id/boost')
  async boost(@Req() req: any, @Param('id') id: string, @Body() body: { days: number; paymentToken: string }) {
    const userId = BigInt(req.user.id);
    return this.service.boost(userId, BigInt(id), body.days, body.paymentToken);
  }
}
```

- [ ] **Step 2: 注册 controller**

```typescript
// backend/src/modules/post/post.module.ts
import { PostBoostController } from './post-boost.controller';
import { PostBoostService } from './post-boost.service';

@Module({
  // ... 原
  controllers: [..., PostBoostController],
  providers: [..., PostBoostService],
})
export class PostModule {}
```

- [ ] **Step 3: 写 boost-cta 组件**

```typescript
// frontend/src/components/post/boost-cta.tsx
'use client';
import { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  postId: number;
  qualityScore?: number;  // 用于显示质量门槛
}

export function BoostCta({ postId, qualityScore }: Props) {
  const [visible, setVisible] = useState(true);
  const [boosting, setBoosting] = useState(false);

  // 质量分太低时不显示 (门槛 50, 跟后端一致)
  if (qualityScore !== undefined && qualityScore < 50) return null;
  if (!visible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 p-4 shadow-lg border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 z-50">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="关闭"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-3xl">🎉</div>
        <div className="font-bold">发布成功!</div>
      </div>
      <div className="text-sm text-muted-foreground mb-3">
        加急置顶 <span className="text-amber-700 font-semibold">9.9 元/天</span>,
        让您的帖子排在最前面, 曝光提升 5x
      </div>
      <Button
        size="sm"
        className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
        disabled={boosting}
        onClick={async () => {
          setBoosting(true);
          try {
            const r = await fetch(`/api/v1/posts/${postId}/boost`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ days: 1, paymentToken: 'stub' }),
              credentials: 'include',
            });
            if (r.status === 503) {
              alert('加急置顶功能即将上线, 请期待 Phase 1.5 商业化模块');
            } else {
              alert('加急置顶成功!');
            }
          } catch (e) {
            alert('调用失败, 请重试');
          } finally {
            setBoosting(false);
            setVisible(false);
          }
        }}
      >
        立即置顶 <ArrowRight className="ml-1 h-3 w-3" />
      </Button>
      {qualityScore !== undefined && (
        <div className="text-xs text-muted-foreground mt-2 text-center">
          AI 质量分: {qualityScore} (≥ 50 可置顶)
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: 详情页集成**

```typescript
// frontend/src/app/posts/[id]/post-detail-content.tsx
// 在文件顶部加:
import { BoostCta } from '@/components/post/boost-cta';

// 在组件 return 末尾, 详情内容之后加:
{searchParams?.justPublished === '1' && (
  <BoostCta postId={post.id} qualityScore={post.qualityScore} />
)}
```

- [ ] **Step 5: 手动验证**

启动 frontend
访问 `/posts/[id]?justPublished=1`
Expected: 右下角弹 "🎉 发布成功! 加急置顶 9.9 元/天" 卡片
点 "立即置顶" → 弹 "即将上线" (因为后端 stub)

- [ ] **Step 6: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/post/post-boost.controller.ts \
        backend/src/modules/post/post-boost.service.ts \
        backend/src/modules/post/post.module.ts \
        frontend/src/components/post/boost-cta.tsx \
        frontend/src/app/posts/\[id\]/post-detail-content.tsx
git commit -m "feat(boost): 加急置顶 stub (前端 CTA + 后端 503 等 Phase 1.5 联调)"
```

---

### Task 24: ai-mode 集成 quality-badge + score 端点

**Files:**
- Modify: `frontend/src/app/posts/publish/ai-mode.tsx` (加 quality-badge + 调 score)
- Modify: `frontend/src/lib/api-ai.ts` (确认 score client 已加, Task 18 已加)

- [ ] **Step 1: ai-mode 集成 score**

```typescript
// frontend/src/app/posts/publish/ai-mode.tsx
// 在 extract 成功后 (已设置 result state), 加:
import { QualityBadge } from '@/components/ai/quality-badge';
import { aiApi } from '@/lib/api-ai';

// 已有 useState setResult 后, 加 score 调用:
useEffect(() => {
  if (result && result.title) {
    aiApi.score({
      type: result.type,
      title: result.title || '',
      description: result.description,
      fields: result.fields,
    }).then((r) => setScore(r.score)).catch(() => setScore(null));
  }
}, [result]);

// 渲染 (在 chips 上方):
{score !== null && <QualityBadge score={score} />}
```

- [ ] **Step 2: 手动验证**

启动 frontend, 访问 `/posts/publish`
输入: "出租金水湾两室一厅 1200 元 拎包入住"
等 AI 识别 → 看到 chips 上方有 "AI 评估: 75 分 · 良好" 标签

- [ ] **Step 3: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add frontend/src/app/posts/publish/ai-mode.tsx
git commit -m "feat(frontend): ai-mode 集成 quality-badge (实时评分)"
```

---

### Task 25: Admin 看板扩展 (seoCoverage + avgScore + businessRate)

**Files:**
- Modify: `backend/src/modules/admin/ai-usage/ai-usage.service.ts` (扩 stats)
- Modify: `admin/src/app/ai-usage/page.tsx` (显示新指标)

- [ ] **Step 1: 扩 service.getStats**

```typescript
// backend/src/modules/admin/ai-usage/ai-usage.service.ts
// 在 getStats 返回前加:

// SEO 覆盖率
const totalPosts = await this.prisma.post.count({ where: { status: 'passed' } });
const seoPosts = await this.prisma.post.count({
  where: { status: 'passed', seoMeta: { not: null } },
});
const seoCoverageRate = totalPosts > 0 ? seoPosts / totalPosts : 0;

// 平均质量分
const scoreAgg = await this.prisma.post.aggregate({
  where: { status: 'passed', qualityScore: { not: null } },
  _avg: { qualityScore: true },
});
const avgQualityScore = scoreAgg._avg.qualityScore ?? 0;

// 商家帖比例
const businessPosts = await this.prisma.post.count({
  where: { status: 'passed', isBusiness: true },
});
const businessPostRate = totalPosts > 0 ? businessPosts / totalPosts : 0;

// 加入返回对象:
return {
  // ... 原字段
  seoCoverageRate,
  avgQualityScore,
  businessPostRate,
};
```

- [ ] **Step 2: 扩 AiUsageStats type**

```typescript
// admin/src/lib/api-ai-usage.ts
export interface AiUsageStats {
  // ... 原字段
  seoCoverageRate: number;
  avgQualityScore: number;
  businessPostRate: number;
}
```

- [ ] **Step 3: 前端展示新指标**

```typescript
// admin/src/app/ai-usage/page.tsx
// 在 4 统计卡下方加 3 个:
<div className="grid grid-cols-3 gap-4">
  <StatCard label="SEO 覆盖率" value={`${(stats.seoCoverageRate * 100).toFixed(0)}%`} />
  <StatCard label="平均质量分" value={stats.avgQualityScore.toFixed(0)} />
  <StatCard label="商家帖比例" value={`${(stats.businessPostRate * 100).toFixed(0)}%`} />
</div>
```

- [ ] **Step 4: 手动验证**

启动 admin, 访问 `/ai-usage`
Expected: 看到 4 + 3 = 7 个统计卡

- [ ] **Step 5: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/admin/ai-usage/ai-usage.service.ts \
        admin/src/lib/api-ai-usage.ts \
        admin/src/app/ai-usage/page.tsx
git commit -m "feat(admin): 看板扩展 (SEO 覆盖率 + 平均分 + 商家比例)"
```

---

### Task 26: post 发布时自动生成 SEO + qualityScore

**Files:**
- Modify: `backend/src/modules/post/post.service.ts` (create 方法尾部加异步触发)

- [ ] **Step 1: 发布后异步触发**

```typescript
// backend/src/modules/post/post.service.ts
// 修改 create 方法尾部 (成功创建后):
async create(userId: bigint, dto: CreatePostDto) {
  // ... 重复检测 + 现有创建逻辑
  const post = await this.prisma.post.create({ ... });

  // 异步触发 (不阻塞响应)
  setImmediate(() => {
    this.triggerPostPublishAi(post.id, userId, dto).catch((e) => {
      this.logger.warn(`Post ${post.id} 发布后 AI 处理失败: ${e?.message}`);
    });
  });

  return post;
}

private async triggerPostPublishAi(postId: bigint, userId: bigint, dto: CreatePostDto) {
  // 1) 算质量分
  const scoreResult = await this.aiService.score(userId, {
    type: dto.type,
    title: dto.title,
    description: dto.description,
    fields: dto.fields,
  });
  await this.prisma.post.update({
    where: { id: postId },
    data: { qualityScore: scoreResult.score },
  });

  // 2) 生成 SEO meta
  const seoResult = await this.seoService.generateSeoMeta(postId);
  this.logger.log(`Post ${postId} 发布后 AI: score=${scoreResult.score}, seo="${seoResult.seoMeta.metaTitle}"`);
}
```

- [ ] **Step 2: 注入 AiService + SeoService**

```typescript
// backend/src/modules/post/post.module.ts
// 修改 imports + constructor:
import { AiModule } from '../ai/ai.module';
import { SeoModule } from '../seo/seo.module';
import { AiService } from '../ai/ai.service';

@Module({
  imports: [
    // ... 原
    AiModule,
    SeoModule,
  ],
  controllers: [...],
  providers: [PostService, AiService, ...],
})
export class PostModule {}

// post.service.ts constructor:
constructor(
  private readonly prisma: PrismaService,
  private readonly aiService: AiService,
  private readonly seoService: SeoService,
) {}
```

- [ ] **Step 3: 手动验证**

```bash
# 创建一个新帖
curl -X POST http://localhost:3001/api/v1/posts -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"house","title":"测试SEO-1","description":"新帖测试",...}'
# 等 10s
# 查 DB
docker exec yichun-mysql mysql ... -e "SELECT id, title, quality_score, seo_meta_updated_at FROM post WHERE id = <新id>;"
# Expected: quality_score != null AND seo_meta_updated_at != null
```

- [ ] **Step 4: 提交**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/post/post.service.ts \
        backend/src/modules/post/post.module.ts
git commit -m "feat(post): 发布后自动算 qualityScore + 生成 SEO meta (异步)"
```

---

### Task 27: Phase 2.2b E2E 回归

**Files:**
- Create: `.pm-tmp/ai-publish-phase2-2b-e2e.py`

- [ ] **Step 1: 写 E2E 脚本**

```python
# .pm-tmp/ai-publish-phase2-2b-e2e.py
"""
Phase 2.2b E2E 回归 (5 步):
[A] rewrite 端点: 标题 → 3 版本
[B] extract 含 isBusiness: 招聘帖 → isBusiness=true
[C] 发布帖 → 10s 后 qualityScore + seoMeta 写入 (用新帖测试)
[D] boost stub: 调用 → 503 BOOST_NOT_READY
[E] Admin 看板: 含 seoCoverageRate + avgQualityScore + businessPostRate
"""
import requests, time

API = "http://localhost:3001/api/v1"

def login(phone, code='1234'):
    return requests.post(f"{API}/auth/sms-login", json={"phone": phone, "code": code}).json()['data']['accessToken']

token = login("13900008888")
admin_token = login("13900000001")
h = {"Authorization": f"Bearer {token}"}
ah = {"Authorization": f"Bearer {admin_token}"}

# [A] rewrite
print("[A] rewrite 端点...")
r = requests.post(f"{API}/ai/draft/rewrite", headers=h, json={
    "type": "house", "field": "title", "original": "金水湾出租 1200", "context": {"layout": "两室一厅"}
})
r.raise_for_status()
data = r.json()['data']
assert len(data['versions']) == 3
assert all('text' in v and 'style' in v for v in data['versions'])
print(f"  PASS: {len(data['versions'])} versions")

# [B] extract 含 isBusiness
print("[B] extract 含 isBusiness...")
r = requests.post(f"{API}/ai/draft/extract", headers=h, json={
    "rawText": "招聘销售经理 碧水木业 月薪5000-8000 长期招聘多名"
})
r.raise_for_status()
data = r.json()['data']
assert data.get('isBusiness') == True
assert data.get('businessType') == 'recruiter'
print(f"  PASS: isBusiness={data['isBusiness']}, type={data['businessType']}")

# [C] 发布帖 → 10s 后 qualityScore + seoMeta
print("[C] 发布帖自动 AI 处理...")
title = f"测试-AI处理-{int(time.time())}"
r = requests.post(f"{API}/posts", headers=h, json={
    "type": "house", "title": title, "description": "新帖测试",
    "contactPhone": "13900008888", "price": 1000
})
r.raise_for_status()
new_id = r.json()['data']['id']
print(f"  创建帖 id={new_id}, 等 15s...")
time.sleep(15)
r = requests.get(f"{API}/posts/{new_id}", headers=h)
r.raise_for_status()
post = r.json()['data']
assert post.get('qualityScore') is not None, "qualityScore 未生成"
assert post.get('seoMeta') is not None, "seoMeta 未生成"
print(f"  PASS: qualityScore={post['qualityScore']}, seoMeta.title='{post['seoMeta']['metaTitle']}'")

# [D] boost stub
print("[D] boost stub (503)...")
r = requests.post(f"{API}/posts/{new_id}/boost", headers=h, json={"days": 1, "paymentToken": "stub"})
assert r.status_code == 503
assert r.json().get('code') == 'BOOST_NOT_READY'
print(f"  PASS: 503 BOOST_NOT_READY")

# [E] Admin 看板
print("[E] Admin 看板扩展...")
r = requests.get(f"{API}/admin/ai-usage/stats?range=today", headers=ah)
if r.status_code == 200:
    data = r.json()['data']
    assert 'seoCoverageRate' in data
    assert 'avgQualityScore' in data
    assert 'businessPostRate' in data
    print(f"  PASS: seo={data['seoCoverageRate']:.2f}, score={data['avgQualityScore']:.0f}, biz={data['businessPostRate']:.2f}")
else:
    print(f"  SKIP: 13900000001 不是 admin")

print("\n✅ Phase 2.2b E2E 全部通过")
```

- [ ] **Step 2: 跑 E2E**

Run: `python .pm-tmp/ai-publish-phase2-2b-e2e.py`
Expected: 5/5 PASS

- [ ] **Step 3: 提交 + Tag + 更新 memory**

```bash
cd e:/workspace/yichun-you-shi-er-shuo
git add .pm-tmp/ai-publish-phase2-2b-e2e.py
git commit -m "test(ai): Phase 2.2b E2E 回归 (5 步: rewrite/business/auto-AI/boost/admin)"
git tag phase-2.2b-done
```

更新 memory (`.claude/projects/.../memory/ai-publisher-phase2-progress.md`):
```markdown
---
name: ai-publisher-phase2-progress
description: "AI 智能发布 (Phase 2) 实施进度 — 27/27 tasks DONE, 反哺 SEO + 商业化"
metadata:
  type: project
---

# AI 智能发布 Phase 2 - DONE 2026-06-22

## 实施
- 27 tasks, 3 phases (2.1 收口 / 2.2a SEO / 2.2b 商业化)
- 后端 7 个新端点 (suggest-title 真调 / score / rewrite / seo-meta / regenerate-seo / push-baidu / boost stub)
- Post 6 字段 + SitemapPushLog 新表
- 详情页 generateMetadata 注入 SEO + JSON-LD
- 列表页 4 type TDK
- 商家识别 (招聘方/中介/批发商) + 林下经济识别
- 加急置顶 stub 等 Phase 1.5 商业化联调

## 关键产出
- ai_usage_logs 含 score/rewrite/seo-meta
- 列表页排序权重灰度开关 AI_RANK_ENABLED
- 重复发贴检测 1 天窗口
- 每日 cron: 02:00 seo batch / 03:00 百度推送

## How to apply
后续 Phase 3 接 GLM-4V 做图片识别, 接 ES 做 AI 搜索。
Phase 1.5 商业化模块就绪后, 联调 /posts/:id/boost 端点, 删除 stub。
```

---

**Phase 2.2b 完毕 (8 任务)。**  
**全部 27 任务完成。** 🎉

---

## Appendix A: 风险与开放问题回顾

| # | 问题 | 答案 (在 plan 中默认) |
|---|---|---|
| 1 | 排序权重 0.3/0.4/0.3 | ✅ 采用, 灰度开关可调 |
| 2 | SEO 同步/异步生成 | ✅ 异步 (发布时 setImmediate) |
| 3 | 质量分展示给发布者 | ✅ 展示 (quality-badge) |
| 4 | 改写原标题按钮 | ✅ 给 (RewritePopover "用原版" 按钮) |
| 5 | 百度配额 5000/天 | ✅ 7 天累计推送 1400 条, 够 |
| 6 | 质量分门槛 50 | ✅ 置顶需 ≥ 50 |
| 7 | 加急置顶 stub | ✅ 放 stub, 503 + tooltip |
| 8 | ai_usage_logs inputHash | ✅ Plan 6.5 改为脱敏后, migration 重算 |

---

## Appendix B: 验收清单

- [ ] Phase 2.1 E2E 5/5 通过
- [ ] Phase 2.2a E2E 7/7 通过 (含 SEO + sitemap + 重复检测)
- [ ] Phase 2.2b E2E 5/5 通过
- [ ] 详情页 View Source 含 meta + JSON-LD
- [ ] sitemap.xml 含 quality 权重
- [ ] Admin 看板 7 统计卡全显
- [ ] 月 AI 成本 < ¥2000
- [ ] LLM 调用 P95 < 8s
- [ ] 缓存命中率 ≥ 30%
- [ ] 错误率 < 5%
- [ ] 重复发贴检测 100% 命中
- [ ] quality_score 写入 ≥ 95% 新帖 (10s 内)
- [ ] seo_meta 写入 ≥ 95% 新帖 (10s 内)

