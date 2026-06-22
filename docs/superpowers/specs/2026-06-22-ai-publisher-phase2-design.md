# AI 智能发布 Phase 2 — 设计文档

> **状态**：Draft v1 — 待 PM 评审
> **作者**：Claude（brainstorming session, 2026-06-22）
> **前置文档**：[2026-06-17-ai-draft-publisher-design.md](./2026-06-17-ai-draft-publisher-design.md) (Phase 1)
> **业务背景**：[yichun-business-gaps-2026-06-22.md §0 三个致命断层](../../yichun-business-gaps-2026-06-22.md)
> **配套路线图**：[yichun-roadmap.md](../../yichun-roadmap.md) Phase 1.5

---

## 1. 背景与目标

### 1.1 Phase 1 现状
- 16/16 tasks DONE（见 [[ai-publisher-phase1-progress]]）
- 支持 `extract`（type + 6 个 house 字段硬编码）+ `suggest-title`（目前切片未真调 LLM）
- GLM-4-Air provider + SOCKS5 代理 + Claude/GLM 抽象
- `ai_usage_logs` 审计
- `/posts/publish` AI 模式已上线（debounce 800ms + 状态机 + 跳过 AI 入口）
- **盲点**：3 type 完整支持未完成；suggest-title 端点浪费；admin 无 AI 看板

### 1.2 Phase 2 战略目标
**把 AI 从"让用户填表更容易"升级为"业务基础设施"** — 直接打业务缺口报告的 **SEO + 商业化** 两条 P0 命脉。

### 1.3 北极星指标
| 指标 | 现状 | Phase 2 目标 |
|---|---|---|
| AI 发布转化率 | 基线 TBD | × 1.5 |
| 详情页百度收录率 | 0% | 60%+ |
| 详情页百度日 UV | 0 | 50-100 (Phase 2 末尾) |
| 帖子平均质量分 | - | ≥ 65 |
| VIP 商家识别命中率 | - | ≥ 80% |
| AI 调用月成本 | < ¥100 | < ¥2000 |

### 1.4 范围（YAGNI 严格）

**Phase 2.1 (1 周) — AI 能力收口**
- 3 type chips 完整支持
- suggest-title 真调 LLM
- Admin AI 调用看板
- missingFields 引导补全

**Phase 2.2a (1.5 周) — SEO + 流量**
- 详情页 meta/JSON-LD（Next.js `generateMetadata` 正确位置）
- 列表页/分类页 25×12 TDK
- sitemap.xml 自动生成 + 质量分排序
- 百度主动推送（后端定时 + 手动）
- AI 帖子质量分（搜索排名权重 30%，灰度开关）
- 重复发贴检测

**Phase 2.2b (1.5 周) — 商业化前置**
- 商家/林下经济自动识别
- AI 改写建议
- "加急置顶" 按钮（AI 模式发布后弹）

**显式不在 Phase 2 范围**:
- ❌ 图片识别（成本高，Phase 3 用 GLM-4V）
- ❌ AI 搜索 / 同义词（Phase 3 跟 ES 一起做）
- ❌ 多轮对话（YAGNI，状态机复杂）
- ❌ 数据飞轮 dashboard（Phase 3 跟 Sentry/监控一起）
- ❌ lib/http.ts 重构（独立技术债，不混入功能 PR）
- ❌ 担保交易 AI 敏感词（Phase 4）

---

## 2. 用户流程（含 Phase 2 新交互）

### 2.1 AI 模式发贴流（不变）
```
进入 /posts/publish
   ↓
AI 模式（大白话文本框，800ms debounce）
   ↓
看到 chips（按 type 动态显示）
   ↓
【新】missingFields 红色提示（缺啥填啥）
   ↓
【新】AI 质量分实时显示（如 "78 分 - 良好"）
   ↓
【新】低分时 chips 区下方显示 "改写建议" 按钮
   ↓
点 "用这个去发布" → 进入 manual-mode 表单（已预填）
   ↓
【新】表单右上 "AI 改写 ✨" 按钮（标题/描述）
   ↓
【新】发布成功后弹 "🎉 发布成功" + "加急置顶 9.9 元/天" 按钮
```

### 2.2 详情页 SEO 渲染流（Phase 2.2a 新增）
```
用户访问 /posts/[id]
   ↓
Next.js generateMetadata 读取 Post.seoMeta
   ↓
渲染 <meta name="description"> + <meta name="keywords"> + JSON-LD <script>
   ↓
百度爬虫抓取 → 富媒体展示（价格/薪资/户型在搜索结果里直接显示）
```

### 2.3 列表页 SEO 流（Phase 2.2a 新增）
```
用户访问 /?type=house
   ↓
generateMetadata 按 type 切换 TDK（25 分类独立文案）
   ↓
用户访问 /?area=230781 (区县)
   ↓
generateMetadata 按 area 切换 TDK（12 区县独立文案）
   ↓
百度抓取 25×12 = 300 个长尾入口
```

### 2.4 商家识别流（Phase 2.2b 新增）
```
用户发招聘帖 / 房屋中介帖 / 二手批发帖
   ↓
AI extract 返回时附加 {isBusiness: true, businessType: 'recruiter'|'agent'|'wholesaler'}
   ↓
发贴成功后弹 "检测到您是 [商家类型]，是否申请 [商家主页]？"
   ↓
【未来 Phase 4】点击 → 跳 /companies/onboarding
```

### 2.5 降级路径
- LLM 不可用 → 503 → 前端 disabled 相关按钮
- 质量分低 → 不阻断发布，仅显示建议
- 商家识别不确定 → 置信度 < 0.7 不弹窗
- 加急置顶暂未上线 → 按钮置灰，tooltip "即将上线"

---

## 3. 架构

```
┌──────────────────────────────────────────────────────────────────┐
│ Frontend (frontend/src/)                                         │
│  ├─ app/posts/publish/                                          │
│  │   ├─ page.tsx          (模式分发，不变)                       │
│  │   ├─ ai-mode.tsx       (增加 missingFields + quality score)  │
│  │   ├─ manual-mode.tsx   (增加 AI 改写按钮)                    │
│  │   └─ boost-cta.tsx     (新 - 加急置顶弹窗)                   │
│  ├─ app/posts/[id]/page.tsx                                      │
│  │   └─ generateMetadata (新 - 读 seoMeta 渲染 meta + JSON-LD)  │
│  ├─ app/page.tsx            (改 - 拆 server + 读 searchParams 生成 TDK) │
│  ├─ app/home-content.tsx    (新 - 现有 client 逻辑搬过来)       │
│  ├─ app/sitemap.ts          (改 - 现有文件扩展, 含 quality 权重) │
│  ├─ components/ai/                                                │
│  │   ├─ extract-chips.tsx     (增加 missingFields 提示)         │
│  │   ├─ quality-badge.tsx     (新 - 质量分展示)                │
│  │   ├─ rewrite-popover.tsx   (新 - 改写建议弹窗)              │
│  │   └─ business-detector.tsx (新 - 商家识别提示)              │
│  └─ lib/api-ai.ts              (扩 - 4 个新端点)                │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTP + JSON
┌─────────────────────────↓────────────────────────────────────────┐
│ Backend (backend/src/modules/ai/)                                │
│  ├─ ai.controller.ts        (扩 4 个新端点)                    │
│  ├─ ai.service.ts           (重构 buildChips → type-aware)     │
│  ├─ llm/                                                       │
│  │   ├─ prompts/                                              │
│  │   │   ├─ extract.ts       (扩 - 加商家/林下经济检测)        │
│  │   │   ├─ suggest-title.ts (新 - 真调 LLM)                  │
│  │   │   ├─ score.ts         (新 - 质量分)                    │
│  │   │   ├─ rewrite.ts       (新 - 改写)                      │
│  │   │   └─ seo-meta.ts      (新 - SEO 元信息)                │
│  │   ├─ field-maps.ts        (新 - type-aware 字段映射)        │
│  │   ├─ claude.client.ts     (不变)                           │
│  │   └─ glm.client.ts        (不变)                           │
│  └─ seo/                    (新模块)                          │
│      ├─ seo.controller.ts    (sitemap + 百度推送 + 批量重生成) │
│      ├─ seo.service.ts                                         │
│      └─ seo.module.ts                                          │
├──────────────────────────────────────────────────────────────────┤
│ Backend (backend/src/modules/post/)                              │
│  ├─ post.service.ts          (改 list 排序权重 + 重复检测)     │
│  └─ post.module.ts           (注入 SeoModule)                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ↓                ↓                ↓
    Redis (缓存)    LLM API         Prisma
    (TTL 各异)   (Claude/GLM)   (Post + ai_usage_logs)
```

**新表/列**:
```prisma
model Post {
  // ...existing
  seoMeta          Json?     @map("seo_meta")
  qualityScore     Int?      @map("quality_score")
  seoMetaUpdatedAt DateTime? @map("seo_meta_updated_at")
  isBusiness       Boolean?  @map("is_business")          // Phase 2.2b
  businessType     String?   @db.VarChar(32) @map("business_type")  // 'recruiter' | 'agent' | 'wholesaler' | null
  boostExpiresAt   DateTime? @map("boost_expires_at")    // Phase 2.2b - 加急置顶到期

  @@index([seoMetaUpdatedAt])
  @@index([qualityScore])
  @@index([isBusiness, businessType])
  @@index([boostExpiresAt])
}

model SitemapPushLog {  // Phase 2.2a - 推送日志
  id          BigInt   @id @default(autoincrement())
  target      String   @db.VarChar(16)  // 'baidu' | 'sogou' | '360'
  postIds     Json     // array of postIds
  status      String   @db.VarChar(16)  // 'success' | 'partial' | 'failed'
  response    String?  @db.Text         // API 响应原文
  pushedAt    DateTime @default(now()) @map("pushed_at")
  @@index([target, pushedAt])
  @@map("sitemap_push_logs")
}
```

---

## 4. API 规格

### 4.1 Phase 2.1 新增/修改

#### `POST /api/v1/ai/draft/suggest-title`（**改：真调 LLM**）

**入参**:
```ts
{
  type: 'house' | 'job' | 'secondhand' | 'lifebiz';
  fields: Record<string, any>;  // extract 的 fields
  count?: number;                // 默认 3
}
```

**出参**:
```ts
{
  titles: string[];   // 3 个不同风格（口语/正式/含 emoji）
  cached: boolean;
  durationMs: number;
}
```

**实现**: 新 prompt `prompts/suggest-title.ts`；缓存 key `ai:title:sha256(json({type, fieldsSorted}))` TTL 30 min；限频共用 extract 池 (30/min, 200/day)

#### `GET /api/v1/admin/ai-usage/stats`（**新**）

**Query**: `?range=today|week|month` 默认 today

**出参**:
```ts
{
  totalCalls: number;
  successRate: number;          // 0-1
  avgLatencyMs: number;
  totalCostUsd: number;
  totalCostCny: number;         // 7.2 汇率
  byKind: { extract: number; suggestTitle: number; score: number; rewrite: number; seoMeta: number };
  byType: { house: number; job: number; secondhand: number; lifebiz: number };
  topUsers: Array<{ userId: bigint; phone: string; calls: number }>;  // 前 10
  errorBreakdown: Array<{ code: string; count: number }>;
  // Phase 2.2a 新增字段
  seoCoverageRate: number;      // 0-1
  avgQualityScore: number;      // 0-100
}
```

### 4.2 Phase 2.2a 新增

#### `POST /api/v1/ai/draft/score`（**新**）

**入参**:
```ts
{
  type: AiPostType;
  title: string;
  description?: string;
  fields?: Record<string, any>;
  contactPhone?: string;  // 仅用于"是否有联系方式"判断, 会被 PII 脱敏
}
```

**出参**:
```ts
{
  score: number;        // 0-100
  breakdown: {
    title: number;      // 0-25: 长度/关键词/吸引力
    description: number;// 0-25: 长度/细节/可读性
    completeness: number;// 0-25: 必填字段覆盖度
    contact: number;    // 0-25: 联系方式完整度
  };
  suggestions: string[]; // 1-5 条具体建议
  cached: boolean;
  durationMs: number;
}
```

**缓存**: `ai:score:sha256(json({type, title, description, fields, contactHint}))` TTL 10 min

#### `POST /api/v1/admin/ai/regenerate-seo/:postId`（**新**）

**鉴权**: admin

**出参**:
```ts
{
  postId: number;
  seoMeta: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    jsonLd: object;
  };
  durationMs: number;
}
```

**副作用**: 写 `Post.seoMeta` + `Post.seoMetaUpdatedAt = NOW()`

#### `POST /api/v1/admin/ai/regenerate-seo-batch`（**新**）

**入参**: `{ postIds: number[] }` (限 50 个/批)

**出参**:
```ts
{
  success: number;
  failed: number;
  results: Array<{ postId: number; ok: boolean; error?: string }>;
}
```

#### `GET /api/v1/sitemap.xml`（**新** - Next.js route handler）

**实现**: 扩展现有 `frontend/src/app/sitemap.ts`（已经是 `MetadataRoute.Sitemap` 格式），调用后端 `GET /api/v1/posts/sitemap-data?limit=50000`

**输出**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yichun.com/posts/123</loc>
    <lastmod>2026-06-22T00:00:00+08:00</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>  <!-- 按 quality_score 动态 0.4-1.0 -->
  </url>
  ...
</urlset>
```

#### `POST /api/v1/admin/seo/push-baidu`（**新**）

**入参**: `{ postIds?: number[] }` (空则推所有 `seoMetaUpdatedAt` 在最近 7 天的)

**出参**:
```ts
{
  pushed: number;
  baiduResponse: { success: number; remain: number };  // 百度站长平台 API 响应
  logId: number;  // SitemapPushLog.id
}
```

**配置**: env `BAIDU_PUSH_TOKEN=xxx` (从百度站长平台获取)

### 4.3 Phase 2.2b 新增

#### `POST /api/v1/ai/draft/detect-business`（**新**）

**入参**:
```ts
{
  type: AiPostType;
  title: string;
  description?: string;
  fields?: Record<string, any>;
}
```

**出参**:
```ts
{
  isBusiness: boolean;       // true if 置信度 ≥ 0.7
  businessType: 'recruiter' | 'agent' | 'wholesaler' | null;
  businessConfidence: number;
  isForestEconomy: boolean;  // 林下经济：蓝莓/木耳/松子/林下参
  forestCategory: 'blueberry' | 'fungus' | 'pine-nut' | 'ginseng' | null;
  forestConfidence: number;
  cached: boolean;
  durationMs: number;
}
```

**触发**: 在 extract 端点同步返回（不调二次 LLM），前端用 `fields.isBusiness` 字段

#### `POST /api/v1/ai/draft/rewrite`（**新**）

**入参**:
```ts
{
  type: AiPostType;
  field: 'title' | 'description';
  original: string;
  context?: Record<string, any>;  // 其他字段作为参考
}
```

**出参**:
```ts
{
  versions: Array<{
    text: string;
    style: 'concise' | 'attractive' | 'seo';  // 3 种风格
    estimatedScoreGain: number;  // 预计提升的质量分
  }>;
  cached: boolean;
  durationMs: number;
}
```

**限频**: 10/min, 50/day（写操作重）

#### `POST /api/v1/posts/:id/boost`（**新 - Phase 1.5 商业化联调**）

**入参**: `{ days: number; paymentToken: string }`

**出参**:
```ts
{
  postId: number;
  boostExpiresAt: Date;
  costCny: number;
  paymentOrderId: string;
}
```

**业务逻辑** (Phase 1.5 商业化模块实现):
- 校验支付 token → 写 `Post.boostExpiresAt = NOW() + days`
- 仅 `qualityScore >= 50` 的帖可置顶 (Phase 2 质量分门槛)
- 价格 9.9 元/天

**Phase 2.2b 范围**: 仅前端按钮 + 后端端点 stub，**支付实际逻辑在 Phase 1.5 商业化模块**。这里写个 TODO 等联调

---

## 5. 数据模型详细

### 5.1 Post 字段扩展 (Migration `20260623_add_post_seo_and_quality_score`)

```prisma
model Post {
  // ...existing fields (id, type, title, description, ...)
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
}
```

**`seoMeta` JSON 结构**:
```ts
{
  metaTitle: string;        // 10-30 字
  metaDescription: string;  // 80-150 字
  keywords: string[];       // 3-5 个
  jsonLd: {
    '@context': 'https://schema.org';
    '@type': 'RealEstateListing' | 'JobPosting' | 'Product' | 'Offer';
    // ... 按 type 不同
  };
  generatedAt: string;      // ISO 8601
  modelUsed: string;        // 'glm-4-air' | 'claude-haiku-4-5-20251001'
}
```

### 5.2 SitemapPushLog 新表

```prisma
model SitemapPushLog {
  id        BigInt   @id @default(autoincrement())
  target    String   @db.VarChar(16)  // 'baidu' | 'sogou' | '360'
  postIds   Json     // array of postIds
  status    String   @db.VarChar(16)
  response  String?  @db.Text
  pushedAt  DateTime @default(now()) @map("pushed_at")
  @@index([target, pushedAt])
  @@map("sitemap_push_logs")
}
```

---

## 6. 提示词设计

### 6.1 `prompts/suggest-title.ts` (Phase 2.1)

**System**:
```
你是伊春本地分类信息平台"伊春有事儿说"的标题优化助手。
基于用户帖子的关键字段，生成 3 个不同风格的中文标题：

1. **口语风** (concise): 15 字以内，直白描述核心卖点
2. **正式风** (professional): 20-25 字，包含关键属性词
3. **吸引风** (attractive): 20-30 字，含 1 个 emoji，刺激点击

约束：
- 必须包含 type 对应的关键属性（如 house 必须有 areaName + layout + price）
- 禁止虚假/夸大
- 禁止联系方式
- 禁止"急售""最低"等违规词

输出 JSON: { titles: [string, string, string] }
```

### 6.2 `prompts/score.ts` (Phase 2.2a)

**System**:
```
你是伊春本地分类信息平台的质量审核 AI。对用户帖子打 4 维质量分，每维 0-25 分，总分 0-100。

评分标准：
- **title (0-25)**:
  - 长度 10-30 字 +10；含核心属性词（小区/户型/价格/品牌/职位）+10；通顺无错字 +5
- **description (0-25)**:
  - 长度 30-200 字 +10；包含具体细节（配套/福利/成色/服务时间）+10；无套话 +5
- **completeness (0-25)**:
  - 必填字段覆盖度（按 type 不同，缺一扣 5 分）
- **contact (0-25)**:
  - 有电话/微信 +15；描述里说"私聊可议价" +5；提到"可看房/可面试/可面交" +5

输出 JSON: { score: number, breakdown: {title, description, completeness, contact}, suggestions: [string, ...] }
suggestions 必须具体可执行，如"标题加价格"而不是"标题质量差"。
```

### 6.3 `prompts/seo-meta.ts` (Phase 2.2a)

**System**:
```
你是 SEO 优化助手。为用户帖子生成搜索引擎友好的元信息和结构化数据。

按 type 生成对应 JSON-LD：
- house: RealEstateListing (含 address, floorSize, numberOfRooms, offers.price)
- job: JobPosting (含 title, description, baseSalary, hiringOrganization)
- secondhand: Product (含 name, description, offers.price, itemCondition)
- lifebiz: Offer (含 name, description, areaServed)

输出 JSON: {
  metaTitle: string (10-30 字，含核心关键词),
  metaDescription: string (80-150 字，含 2-3 个长尾词),
  keywords: string[] (3-5 个，按热度排),
  jsonLd: object (按上述规范)
}
```

### 6.4 `prompts/rewrite.ts` (Phase 2.2b)

**System**:
```
你是文案改写助手。基于用户原文，生成 3 个不同风格的改写版本：

1. **concise** (精简): 长度 -30%，去套话
2. **attractive** (吸引): 加入具体细节 + 情感诉求
3. **seo** (SEO 友好): 自然嵌入 1-2 个长尾关键词

约束：
- 不改核心信息（地址/价格/型号）
- 不编造事实
- 输出 JSON: { versions: [{text, style, estimatedScoreGain}] }
estimatedScoreGain 是 0-15 的整数，表示相对原文预计提升的质量分。
```

### 6.5 `extract.ts` 扩展 (Phase 2.2b)

**追加**:
- 让 LLM 同步返回 `isBusiness` (boolean) + `businessType` ('recruiter'|'agent'|'wholesaler'|null)
- 让 LLM 同步返回 `isForestEconomy` (boolean) + `forestCategory` ('blueberry'|'fungus'|'pine-nut'|'ginseng'|null)
- 评分维度 +1：`isBusiness` 权重低，仅做标记

---

## 7. 前端组件详细

### 7.1 现有组件扩展

**`extract-chips.tsx`**:
- 新增 `missingFields` prop：底部显示 "还有 2 项必填未识别：户型、楼层" 红色提示
- 各 chip 颜色按 confidence 三档：emerald-100 / amber-100 / rose-100 (Phase 1 已有，需确保 type 切换时正确)

**`ai-mode.tsx`**:
- 文本框上方加 `quality-badge.tsx` 实时显示分数
- 分数 < 50 时显示 "改写建议" 红色按钮，点击 → 弹 `rewrite-popover.tsx`
- 提取完成后检查 `fields.isBusiness`，如果 true 弹 toast "检测到您可能是商家"

**`manual-mode.tsx`**:
- 标题 input 右侧加 `✨` 按钮，hover 显示 "AI 改写"
- 描述 textarea 同样
- 点击 → 调 `/ai/draft/rewrite` 弹 popover

**`page.tsx` (publish)**:
- 成功发布后跳 `/posts/[id]?justPublished=1`
- 该 query 参数触发详情页弹 `<BoostCta />` 组件

### 7.2 新组件

**`quality-badge.tsx`** (60 lines):
```tsx
<Badge variant={score >= 75 ? 'success' : score >= 50 ? 'warning' : 'destructive'}>
  AI 评估: {score} 分 - {score >= 75 ? '优秀' : score >= 50 ? '良好' : '需优化'}
</Badge>
```

**`rewrite-popover.tsx`** (100 lines):
- Popover 含 3 个版本卡片
- 每卡片显示版本文本 + 风格标签 + "预计提升 +X 分"
- 点任一版本 → 替换原文 + 关闭 popover
- 底部 "原标题" 按钮恢复

**`business-detector.tsx`** (50 lines):
- Toast 组件，提示 "检测到您可能是 [商家类型]，是否申请商家主页？"
- 按钮 "申请" / "暂不"
- 置信度 < 0.7 不弹

**`boost-cta.tsx`** (80 lines):
- 发布成功后详情页右上角弹窗（3 秒后自动消失，可手动关闭）
- 标题 "🎉 发布成功！"
- 文案 "加急置顶 9.9 元/天，让您的帖子排在最前面"
- 按钮 "立即置顶" / "知道了"
- 点立即置顶 → 跳支付页（Phase 1.5 模块）

### 7.3 详情页 SEO 渲染（关键修正）

**位置**: `frontend/src/app/posts/[id]/page.tsx`，**不是** `post-detail-content.tsx`

```tsx
import type { Metadata } from 'next';
import { postService } from '@/lib/post';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const post = await postService.findByIdWithSeo(parseInt(params.id));
  if (!post?.seoMeta) return { title: '帖子详情 - 伊春有事儿说' };

  const seo = post.seoMeta;
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    keywords: seo.keywords.join(','),
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      type: 'article',
    },
    other: {
      'application/ld+json': JSON.stringify(seo.jsonLd),
    },
  };
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await postService.findById(parseInt(params.id));
  return <PostDetailContent post={post} />;
}
```

**JSON-LD 注入**: 用 Next.js 15 `other` 字段注入 `<script type="application/ld+json">` (官方支持)

### 7.4 列表页/分类页 TDK

**重要**: 项目当前用查询参数 `?type=house` 而非动态路由 `app/[type]/page.tsx`（避免与 `app/posts/` 冲突）。所以 TDK 在 `app/page.tsx` 渲染。

**修改**:
- `frontend/src/app/page.tsx` — 拆为 server + client
  - `app/page.tsx` (server component) — 导出 `generateMetadata` + 渲染 `<Suspense><HomeContent /></Suspense>`
  - `app/home-content.tsx` (client component) — 现有 `app/page.tsx` 的 client 逻辑搬过来
- `frontend/src/config/seo-tdk.ts` (新) — 4 type + 12 area = 16 套文案

**`generateMetadata` 实现**:
```tsx
import { TYPE_TDK, AREA_TDK, DEFAULT_TDK } from '@/config/seo-tdk';
import { postApi, areaApi } from '@/lib/api';

export async function generateMetadata({ searchParams }: { searchParams: { type?: string; area?: string } }): Promise<Metadata> {
  const type = searchParams.type as AiPostType | undefined;
  const areaId = searchParams.area ? Number(searchParams.area) : undefined;

  // 优先匹配 type+area 组合, 退化到 type, 再退化到默认
  let tdk = DEFAULT_TDK;
  if (type && TYPE_TDK[type]) {
    tdk = { ...TYPE_TDK[type] };
    if (areaId) {
      const area = await areaApi.findById(areaId).catch(() => null);
      if (area) {
        tdk.title = `${area.name}${TYPE_TDK[type].title} - 伊春有事儿说`;
        tdk.description = `${area.name}本地${TYPE_TDK[type].desc}，真实可靠。`;
      }
    }
  }
  return {
    title: tdk.title,
    description: tdk.description,
    keywords: tdk.keywords.join(','),
  };
}
```

**TDK 数据结构**:
```ts
export const TYPE_TDK: Record<AiPostType, { title: string; description: string; keywords: string[] }> = {
  house: {
    title: '伊春房屋出租 - 二手房 - 真实房源 | 伊春有事儿说',
    description: '伊春本地房屋出租出售信息，金水湾、南郡、桦林等小区真实房源，房东直租无中介费。',
    keywords: ['伊春租房', '伊春二手房', '伊春房屋出租'],
  },
  // ... job, secondhand, lifebiz
};
```

```ts
export const TYPE_TDK: Record<AiPostType, { title: string; description: string; keywords: string[] }> = {
  house: {
    title: '伊春房屋出租 - 二手房 - 真实房源 | 伊春有事儿说',
    description: '伊春本地房屋出租出售信息，金水湾、南郡、桦林等小区真实房源，房东直租无中介费。',
    keywords: ['伊春租房', '伊春二手房', '伊春房屋出租'],
  },
  // ... 4 type
};
```

**区县 TDK** 同样格式，按 areaId 索引

---

## 8. 后端服务详细

### 8.1 `ai.service.ts` 重构

**`buildChips` 重构**:
```ts
// 改前: 6 个 house 硬编码
// 改后: type-aware map
import { CHIP_FIELDS_BY_TYPE } from './llm/field-maps';

private buildChips(type: AiPostType, fields: any, fieldsConfidence: any): ExtractChip[] {
  const map = CHIP_FIELDS_BY_TYPE[type] || [];
  return map
    .map(([label, key, format]) => {
      const v = fields[key];
      if (v == null || v === '') return null;
      return {
        label,
        value: format ? format(v, fields) : String(v),
        confidence: fieldsConfidence[key] ?? 0.8,
      };
    })
    .filter((c): c is ExtractChip => c !== null);
}
```

**`extract` 同步返回商家/林下经济检测**:
- 在 prompt 里追加字段
- 在 `parsed` 取值时多取 `isBusiness` / `isForestEconomy`
- 写回 `fields` 对象（前端可读）

### 8.2 新服务 `seo.service.ts`

**核心方法**:
- `generateSeoMeta(postId)`: 调 LLM → 写 Post.seoMeta
- `batchGenerateSeoMeta(limit = 100)`: 找 `seoMetaUpdatedAt IS NULL` 的 top N → 队列
- `getSitemapData(limit)`: 返回 sitemap 需要的 URL + lastmod + priority
- `pushBaiduSitemap(postIds)`: 调百度站长平台 API → 写 SitemapPushLog

**Cron 任务** (`@Cron`):
- 每日 02:00 跑 `batchGenerateSeoMeta(100)`
- 每日 03:00 跑 `pushBaiduSitemap(seoMetaUpdatedAt > NOW() - 7d)` (本月 5000 条上限内)

### 8.3 `post.service.ts` 改动

**`findMany` 排序权重**:
```ts
async findMany(filter: PostFilter) {
  const isRankEnabled = process.env.AI_RANK_ENABLED === 'true';  // 灰度开关
  if (isRankEnabled) {
    return this.prisma.$queryRaw`
      SELECT *,
        (COALESCE(quality_score, 50) * 0.3 +
         (1.0 / (1 + TIMESTAMPDIFF(HOUR, created_at, NOW()) / 24)) * 100 * 0.4 +
         (CASE WHEN boost_expires_at > NOW() THEN 100 ELSE 0 END) * 0.3
        ) AS ai_rank
      FROM posts
      WHERE ${whereClause}
      ORDER BY ai_rank DESC
      LIMIT ?
    `;
  }
  // 默认: 仍按 createdAt DESC
}
```

**重复发贴检测**:
- 发布时检查: `SELECT id FROM posts WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 DAY AND title = ?`
- 命中 → 返回 400 `DUPLICATE_POST`

---

## 9. 缓存策略总览

| Key | TTL | 命中预期 |
|---|---|---|
| `ai:extract:{textHash}` | 5 min (Phase 1) | > 30% |
| `ai:title:{fieldsHash}` | 30 min (Phase 2.1) | > 20% |
| `ai:score:{contentHash}` | 10 min (Phase 2.2a) | > 40% (改一次重算) |
| `ai:seo:{contentHash}` | 24h (Phase 2.2a) | > 60% (帖子内容稳定) |
| `ai:rewrite:{textHash}` | 30 min (Phase 2.2b) | > 10% |
| `ai:business:{contentHash}` | 30 min (Phase 2.2b) | > 50% |

**缓存穿透防护**: 空结果也缓存 60s（防恶意打）

---

## 10. 限频总览

| 端点 | 限频 | 备注 |
|---|---|---|
| extract | 30/min, 200/day/用户 | Phase 1 |
| suggest-title | 共用 extract 池 | Phase 2.1 |
| score | 共用 extract 池 | Phase 2.2a |
| rewrite | 10/min, 50/day/用户 | Phase 2.2b - 写操作重 |
| seo-meta (admin) | 50/min | 手动触发 |
| baidu push (admin) | 10/min | 百度配额 10000/天 |
| boost (支付) | 5/min, 10/day/用户 | 防止刷单 |

**总限频**: 单一用户 200/天所有 AI 端点共用

---

## 11. 成本估算

### 11.1 单次调用成本 (GLM-4-Air)
- extract: ¥0.01-0.03
- suggest-title: ¥0.015
- score: ¥0.012
- rewrite: ¥0.02
- seo-meta: ¥0.02
- business-detect: ¥0.005 (附加在 extract 里)

### 11.2 用户行为成本（一个用户完整发贴）
| 行为 | 调用的 AI | 成本 |
|---|---|---|
| AI 模式输入 1 次 (含 debounce 重复 3-5 次) | extract ×4 | ¥0.08 |
| 点改写建议 1-2 次 | rewrite ×2 | ¥0.04 |
| 改标题 1 次 | rewrite ×1 | ¥0.02 |
| 发布时算分 | score ×1 | ¥0.012 |
| 发布后自动 SEO | seo-meta ×1 | ¥0.02 |
| **单帖总计** | | **¥0.17** |

### 11.3 月成本估算
- 1000 帖/天 = ¥170/天 = **¥5100/月** (超 ¥2000 目标)
- 600 帖/天 = ¥100/天 = **¥3000/月** (超 50%)
- 200 帖/天 = ¥35/天 = **¥1050/月** (符合目标)

**缓解**:
- 强缓存 (rewrite/extract 高频操作预期 30% 命中)
- debounce 已减少 extract 重复
- 阈值告警: 日成本 > ¥50 红色告警
- 真上 Claude 时成本 3-5x, **必须做缓存**

---

## 12. 测试策略

### 12.1 后端单元测试
- `field-maps.test.ts` (新): 各 type 字段映射正确
- `suggest-title` (新): mock LLM, 验证 prompt 拼接 + 缓存命中
- `score` (新): mock LLM, 验证 4 维评分 + 建议生成
- `rewrite` (新): mock LLM, 验证 3 版本输出
- `seo.service.test.ts` (新): sitemap 生成格式 + 百度 API 错误处理
- `post.service.test.ts` (改): 排序权重 + 重复检测

### 12.2 后端集成测试
- 4 个新端点 (suggest-title/score/rewrite/detect-business): 真实调 GLM 跑 5 个真实场景
- 百度推送: mock HTTP, 验证日志写入
- 重复发贴: 同一用户 1 分钟内发相同 title → 400

### 12.3 前端组件测试
- `quality-badge` (新): 3 档分数渲染
- `rewrite-popover` (新): 3 版本 + 原标题回退
- `business-detector` (新): 置信度阈值控制
- `boost-cta` (新): 弹窗逻辑

### 12.4 E2E (Playwright)
- AI 模式发贴 → 看到质量分 → 改写 → 发布 → 弹加急置顶 (灰度)
- 详情页查看 `<head>` 是否有 meta + JSON-LD
- sitemap.xml 访问返回正确格式
- 重复发贴 2 次第二次被拦

### 12.5 SEO 验证
- 百度站长平台 → 抓取诊断 → 输入帖子 URL → 验证 meta + JSON-LD 抓取
- 结构化数据测试工具 (Google Rich Results Test, 百度结构化数据测试)
- Lighthouse SEO 评分 ≥ 90

---

## 13. 灰度发布

### 13.1 Phase 2.2a 排序权重灰度
- `AI_RANK_ENABLED` env 默认 `false`
- admin 后台 "AI 排序权重" 开关, 一键开
- Phase 2.2a 前 1 周: 开关开, 5% 流量走新排序
- 1 周后: 50% 流量
- 2 周后: 100%

### 13.2 Phase 2.2b 商业化灰度
- "加急置顶" 按钮: Phase 1.5 支付模块就绪前不展示
- 商家识别弹窗: 置信度 ≥ 0.8 才弹, 避免误判

---

## 14. 监控 & 告警

### 14.1 监控指标
- `ai_usage_logs` 写入成功率 (>= 99%)
- 缓存命中率 (>= 30%)
- LLM 5xx 比例 (< 5%)
- LLM P95 延迟 (< 8s)
- 详情页 TTFB (< 500ms)
- sitemap 推送成功率 (>= 90%)

### 14.2 告警 (简单实现, 后续接 Sentry)
- 日成本 > ¥50 → 邮件 (admin 邮箱, Phase 3 接 Sentry)
- 错误率 > 10% 持续 10 分钟 → 邮件
- 缓存命中率 < 10% → 邮件 (排查 key 设计)

### 14.3 运营看板 (Admin AI 看板)
见 §4.1 `GET /admin/ai-usage/stats`，增加:
- Phase 2.2a: `seoCoverageRate` (seoMeta 覆盖率)
- Phase 2.2a: `avgQualityScore` (平均质量分)
- Phase 2.2b: `businessPostRate` (商家帖比例)
- Phase 2.2b: `boostRevenue` (置顶收入, 需联调支付)

---

## 15. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 排序权重改动破坏现有 E2E | 高 | 灰度开关 AI_RANK_ENABLED 默认 false |
| 详情页 SEO 渲染位置错误 (post-detail-content vs page.tsx) | 高 | spec §7.3 明确, code review 必查 |
| 百度推送配额超限 (5000/天 新站) | 中 | 分批推送, 日上限保护 |
| 质量分不公平 (小商家被压) | 中 | 仅显示+建议, 搜索权重起步 30% 可调 |
| 重复发贴检测误杀 | 中 | 用 title 严格相等 + 时间窗口 1 天, 人工申诉 |
| 改写建议质量低 | 中 | LLM 选高质量模型 (GLM-4-Air), 限频 50/天 |
| 林下经济分类误判 | 低 | 置信度阈值 0.7 |
| 加急置顶联调阻塞 Phase 2.2b | 中 | 端点 stub, 按钮置灰, 注释 TODO |
| 6 个新 LLM 端点成本失控 | 高 | 强缓存 + 限频 + 告警 + 月预算 ¥2000 |
| ai_usage_logs inputHash 用脱敏前 (PII 进 hash 链路) | 中 | Phase 2 改为脱敏后, 加 migration |

---

## 16. 文件清单

### 16.1 新增 (Phase 2.1)
- `backend/src/modules/ai/llm/field-maps.ts`
- `backend/src/modules/ai/llm/prompts/suggest-title.ts`
- `backend/src/modules/ai/llm/prompts/suggest-title.spec.ts`
- `backend/src/modules/admin/ai-usage/ai-usage.controller.ts`
- `backend/src/modules/admin/ai-usage/ai-usage.service.ts`
- `backend/src/modules/admin/ai-usage/ai-usage.module.ts`
- `frontend/src/components/ai/quality-badge.tsx`
- `frontend/src/app/admin/ai-usage/page.tsx`
- `frontend/src/lib/api-admin-ai.ts`

### 16.2 新增 (Phase 2.2a)
- `backend/src/modules/ai/llm/prompts/score.ts`
- `backend/src/modules/ai/llm/prompts/score.spec.ts`
- `backend/src/modules/ai/llm/prompts/seo-meta.ts`
- `backend/src/modules/ai/llm/prompts/seo-meta.spec.ts`
- `backend/src/modules/seo/seo.controller.ts`
- `backend/src/modules/seo/seo.service.ts`
- `backend/src/modules/seo/seo.module.ts`
- `backend/prisma/migrations/20260623_add_post_seo_and_quality_score/`
- `frontend/src/app/home-content.tsx` (从 page.tsx 拆出来)
- `frontend/src/config/seo-tdk.ts`
- `frontend/src/components/ai/rewrite-popover.tsx`
- `frontend/src/lib/api-ai-extended.ts`

### 16.3 新增 (Phase 2.2b)
- `backend/src/modules/ai/llm/prompts/rewrite.ts`
- `backend/src/modules/ai/llm/prompts/rewrite.spec.ts`
- `frontend/src/components/post/boost-cta.tsx`
- `frontend/src/components/ai/business-detector.tsx`

### 16.4 修改
- `backend/src/modules/ai/ai.service.ts` (buildChips 重构 + suggestTitle 真调 + business 检测)
- `backend/src/modules/ai/ai.module.ts` (注册 SeoModule)
- `backend/src/modules/ai/ai.controller.ts` (4 个新端点)
- `backend/src/modules/ai/llm/prompts/extract.ts` (扩 isBusiness / isForestEconomy)
- `backend/src/modules/post/post.service.ts` (排序权重 + 重复检测)
- `backend/src/modules/post/post.module.ts` (注入 SeoModule)
- `backend/src/modules/post/dto/create-post.dto.ts` (重复检测 DTO)
- `backend/.env.example` (BAIDU_PUSH_TOKEN)
- `frontend/src/app/posts/publish/ai-mode.tsx` (加 missingFields + quality score + business detect)
- `frontend/src/app/posts/publish/manual-mode.tsx` (加 AI 改写按钮)
- `frontend/src/app/posts/[id]/page.tsx` (generateMetadata 注入 SEO)
- `frontend/src/app/posts/[id]/post-detail-content.tsx` (加 boost-cta)
- `frontend/src/app/page.tsx` (拆 server 端 + generateMetadata 读 searchParams 生成 TDK)
- `frontend/src/app/sitemap.ts` (扩 - 含 quality 权重 + 全量 posts)
- `frontend/src/components/ai/extract-chips.tsx` (missingFields 提示)
- `frontend/src/lib/api-ai.ts` (4 个新端点 client)
- `admin/src/app/dashboard/page.tsx` (加 AI 卡片, 跳 /admin/ai-usage)

---

## 17. 开放问题（等 PM 拍板）

1. **列表页排序权重** `0.3 / 0.4 / 0.3` (质量/新鲜/置顶) 合理吗？还是 `0.2 / 0.5 / 0.3`（更偏新）？
2. **SEO 元信息生成时机**: 发布时同步（用户等待 2s）还是异步（后台跑）？我建议**异步** + 用户看到 "AI 优化中..." 提示
3. **质量分要展示给发布者吗**? 展示 = 引导优化；不展示 = 避免用户分心。我建议**展示 + 建议**（学习成本低）
4. **改写建议要给"原标题"按钮吗**? 我建议**给**（防后悔）
5. **百度主动推送配额** 5000/天, Phase 2.2a 跑满够吗？预计日新帖 < 200, 推送 7 天累计 1400 条, **够**
6. **质量分门槛 50** 是合适的"置顶付费"门槛吗？还是 60 / 70？
7. **"加急置顶" 按钮** Phase 1.5 商业化模块就绪前是放 stub 还是不放？我建议**放 stub + 置灰** (有占位感)
8. **`ai_usage_logs.inputHash`** 应该用脱敏前还是脱敏后 hash？目前是脱敏前 (历史原因), Phase 2 改统一为脱敏后, 加 migration 重新计算

---

## 18. 与 Phase 1 的关系

| 维度 | Phase 1 | Phase 2 |
|---|---|---|
| 范围 | 1 个 type 完整 AI 抽取 + 标题建议（假） | 4 个 type + 真实 LLM title + SEO + 质量分 + 改写 + 商业化前置 |
| 用户感知 | AI 让填表变快 | AI 让帖子质量/曝光/变现变好 |
| 业务价值 | UX 优化 | SEO + 商业化基础设施 |
| 端点 | 2 个 | 7 个 (extract/suggest-title/score/rewrite/seo-meta/detect-business/regenerate-seo) |
| Admin 端 | 无 | AI 调用看板 |
| 涉及表 | 1 (ai_usage_logs) | 2 (Post 扩字段 + SitemapPushLog 新表) |
| 工时 | 1 周 | 4 周 |

---

**END**

> 下一步：PM 评审 → 写实现 plan (`docs/superpowers/plans/2026-06-22-ai-publisher-phase2.md`) → Subagent-Driven 实施
