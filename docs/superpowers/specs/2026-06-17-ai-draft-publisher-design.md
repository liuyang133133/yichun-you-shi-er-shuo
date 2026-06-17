# AI 智能发布 — 设计文档

> **状态**：Draft v1 — 待 PM 评审
> **作者**：Claude（brainstorming session, 2026-06-17）
> **配套文档**：[PRD.md](../../PRD.md) / [ARCHITECTURE.md](../../ARCHITECTURE.md) / [DATABASE.md](../../DATABASE.md)

## 1. 背景与目标

**当前痛点**：用户进入 `/posts/publish` 后看到一张密密麻麻的表单（20+ 字段），尤其**房屋出租**需要填小区、户型、楼层、租金、配套…**老年用户和林区用户**容易直接放弃，导致**平台内容供给不足**。

**产品目标**（用户原话）：**"让用户感知到这个平台比 0458.cn 那种老平台好用，让 AI 服务于客户"**。

**北极星指标**：
- 发布转化率：表单式发布完成率从「基线」提升到「基线 × 1.5」（**Phase 1 上线前先测一周基线**）
- 户均发布时长：目标 < 60 秒（当前目测 3-5 分钟，**Phase 1 上线前抽样测一次**）
- 内容质量：AI 辅助帖子的首过审核率（pass / pending）≥ 70%

**非目标（YAGNI）**：
- 不做 AI 自动发布（必须人工确认）
- 不做图片生成（用户上传原图）
- 不做对话式多轮（V2 再说）
- 不做个性化推荐（V2 再说）

---

## 2. 用户流程

```
进入 /posts/publish
   ↓
【新】看到 AI 智能发布页
   ↓
  在大文本框里写 1-3 句大白话
   ↓
  800ms debounce → 后端调 LLM 提炼
   ↓
  看到「已识别」chip 列表 + 建议标题 (3 个)
   ↓
  ┌─────────────┬──────────────┐
  │ 用这个去发布 │ 跳过 AI，手动填 │
  └─────────────┴──────────────┘
       ↓                ↓
  原表单已预填      走原表单
       ↓
  补全缺失字段
       ↓
  提交 → 进入原审核流
```

**降级路径**：
- LLM API 挂掉 / 超时 → 自动隐藏 AI 区域，显示"AI 暂时不可用，直接填吧"按钮
- LLM 返回置信度过低（typeConfidence < 0.5）→ 不进入 AI 模式，引导用户手填
- 用户主动点"跳过 AI" → 走原表单

---

## 3. 架构

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (frontend/src/app/posts/publish/)              │
│  ├─ page.tsx           (选择模式入口)                   │
│  ├─ ai-publish.tsx     (智能文本框组件)                  │
│  └─ manual-publish.tsx (现有表单, 重命名)                 │
└────────────────────┬────────────────────────────────────┘
                     │ POST /ai/draft/extract
                     │ { rawText, typeHint? }
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Backend (backend/src/modules/ai/)                       │
│  ├─ ai.controller.ts   (路由)                            │
│  ├─ ai.service.ts      (PII 脱敏 + 缓存 + LLM 调用)     │
│  ├─ dto/extract.dto.ts (入参出参)                        │
│  └─ llm/                                                │
│      ├─ claude.client.ts  (Claude API 封装)              │
│      └─ prompts/extract.ts (system prompt 模板)          │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    Redis (缓存)  Claude API  Prisma (ai_usage_logs)
```

**新表**：`ai_usage_logs`

```prisma
model AiUsageLog {
  id          BigInt   @id @default(autoincrement())
  userId      BigInt?  @map("user_id")        // 匿名可空
  kind        String   @db.VarChar(32)        // 'extract' | 'suggest-title'
  model       String   @db.VarChar(64)        // 'claude-haiku-4-5-20251001'
  inputTokens Int      @map("input_tokens")
  outputTokens Int     @map("output_tokens")
  costUsd     Decimal  @map("cost_usd") @db.Decimal(10, 6)
  latencyMs   Int      @map("latency_ms")
  cached      Boolean  @default(false)        // 是否走缓存
  success     Boolean  @default(true)
  errorCode   String?  @db.VarChar(64) @map("error_code")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@index([kind, createdAt])
  @@map("ai_usage_logs")
}
```

---

## 4. API 规格

### 4.1 `POST /api/v1/ai/draft/extract`

**鉴权**：需要登录（accessToken）

**入参**：
```ts
{
  rawText: string;          // 1-500 字
  typeHint?: 'house' | 'job' | 'secondhand' | 'lifebiz';  // 用户预选的类型
}
```

**出参**：
```ts
{
  type: 'house' | 'job' | 'secondhand' | 'lifebiz';
  typeConfidence: number;   // 0~1
  fields: Record<string, any>;  // 提取出的字段, 命名见 §4.3
  fieldsConfidence: Record<string, number>;  // 每个字段的置信度
  missingFields: string[];  // 必填但没识别到的字段名
  chips: Array<{            // 给前端"已识别"列表用
    label: string;          // 字段的中文名
    value: string | number;
    confidence: number;
  }>;
  suggestions: {
    titles: string[];       // 3 个标题
    tags: string[];         // 3-5 个标签
  };
  rawTextHash: string;      // sha256(rawText), 给前端做去重
  durationMs: number;       // 后端处理时长
  cached: boolean;          // 是否走缓存
}
```

**错误码**：
- `400` `TEXT_TOO_SHORT` (rawText < 5 字)
- `400` `TEXT_TOO_LONG` (rawText > 500 字)
- `429` `RATE_LIMITED` (用户超过 30 次/分钟)
- `503` `AI_UNAVAILABLE` (LLM 不可用且无缓存)

### 4.2 `POST /api/v1/ai/draft/suggest-title`

**入参**：
```ts
{
  fields: Record<string, any>;  // extract 的 fields
  count?: number;               // 默认 3
}
```

**出参**：
```ts
{
  titles: string[];
  cached: boolean;
}
```

### 4.3 `fields` 命名约定（按 type 区分）

#### `house`（房屋出租/出售）
```ts
{
  title: string;
  dealType: 'rent' | 'sale';
  areaName: string;         // 小区名 (例: '金水湾')
  layout: string;           // 户型 (例: '两室一厅')
  floor: number | string;   // 楼层
  totalFloors?: number;     // 总楼层 (可选)
  areaSize: number;         // 面积 (㎡)
  price: number;            // 租金或售价
  decoration?: string;      // 装修 (毛坯/简装/精装/豪装)
  facilities: string[];     // 配套
  availableFrom?: string;   // 入住时间
  description?: string;     // 补充描述
}
```

#### `job`（招聘）
```ts
{
  title: string;
  companyName?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryUnit?: '月' | '时' | '年';
  education?: string;       // 学历
  experience?: string;      // 经验
  description?: string;
}
```

#### `secondhand`（二手）
```ts
{
  title: string;
  categoryHint?: string;    // 物品类型
  price: number;
  condition?: string;       // 成色
  description?: string;
}
```

#### `lifebiz`（便民）
```ts
{
  title: string;
  categoryHint?: string;
  description?: string;
  contactHint?: string;     // 联系方式类型 (电话/微信/到店)
}
```

---

## 5. PII 脱敏（**PIPL 红线**）

**工具**：`backend/src/common/utils/pii-redact.util.ts`

**规则**：
| 模式 | 替换为 |
|---|---|
| `1[3-9]\d{9}` (11 位手机号) | `138****1234` |
| `[Vv]信[:：\s]*[a-zA-Z0-9_]{6,}` (微信号) | `wx_****` |
| `微信号?[:：\s]*[a-zA-Z0-9_]{6,}` | `wx_****` |
| `\d{17}[\dXx]` (身份证) | `110***********1234` |
| `\d{16,19}` (银行卡) | `****` |
| 邮箱 `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | `e_****@****.com` |

**反脱敏**：响应中如果出现 `****`，**不**做反脱敏（用户心里有数自己写过）。

**日志**：rawText 脱敏后再写 log，sha256(rawText) 作为去重 key。

---

## 6. 成本控制 & 限频

**模型选择**：
- 全部用 **Claude Haiku 4.5**（`claude-haiku-4-5-20251001`）
- 单次 extract 成本约 **¥0.01~0.03**（以官方实时计费为准，Phase 1 上线后取实际均值修正）
- 1000 次/天 ≈ **¥10~30/天** ≈ **¥300~900/月**（V1 体量下完全可承受）

**缓存策略**：
- Key: `ai:extract:sha256(rawText)` 
- TTL: 5 分钟（同一文本在 5 分钟内重复发不再调 LLM）
- Value: 完整 JSON 出参
- 命中率预期：> 30%（用户改 1-2 字会重算，但改 1-2 字确实意图不同）

**限频**：
- 每用户 30 次/分钟（用 Redis 滑动窗口，key: `ai:rl:extract:{userId}`）
- 每用户 200 次/天（防滥用，key: `ai:daily:extract:{userId}:{date}`）
- 每天 0 点自动清零

**降级**：
- LLM 失败 / 超时（> 5s）→ 返回 503，前端隐藏 AI 区域
- 限流 → 返回 429，前端提示"操作太快了，稍等几秒"

---

## 7. 失败处理

| 场景 | 前端行为 | 后端行为 |
|---|---|---|
| LLM 5xx | 显示"AI 暂时不可用"，显示"手动填写"按钮 | 写 `ai_usage_logs` (success=false, errorCode) |
| LLM 超时 (> 5s) | 同上 + 自动重试 1 次 | 写 log |
| 缓存命中 | 正常返回 + `cached: true` | 写 log (cached=true) |
| 限流 | 按钮 disabled 5s + toast | 429 响应 |
| 用户输入 < 5 字 | 不发请求 | 400 响应 |
| 用户输入 > 500 字 | 截断到 500 字 + 提示 | 400 响应 |
| 浏览器离线 | 显示"请检查网络" | (前端层就拦了) |

---

## 8. 前端组件

### 8.1 新文件
- `frontend/src/app/posts/publish/page.tsx` — 改成"模式选择"入口（AI 优先）
- `frontend/src/app/posts/publish/ai-mode.tsx` — AI 智能文本框
- `frontend/src/app/posts/publish/manual-mode.tsx` — 现有表单，重命名
- `frontend/src/components/ai/extract-chips.tsx` — 已识别 chip 列表
- `frontend/src/components/ai/title-suggestions.tsx` — 建议标题

### 8.2 关键交互
- **Debounce 800ms**（输入停止 800ms 后才发请求）
- **乐观展示**（不显示 spinner，直接显示"正在分析…"）
- **错误重试**（失败时显示"重试"按钮，不自动重试）
- **手动覆盖**（用户点 chip 可编辑）
- **键盘快捷键**（Cmd/Ctrl+Enter 直接"用这个去发布"）

### 8.3 设计系统复用
- 用 shadcn `Card` / `Button` / `Textarea` / `Badge` / `Skeleton`
- 颜色：置信度高 = `bg-emerald-100`，中 = `bg-amber-100`，低 = `bg-rose-100`
- 文案：所有用户可见文案走 `i18n`（先 zh-CN，预留 en-US）

---

## 9. 测试策略

### 9.1 后端
- **Unit**：`pii-redact.util.ts` — 至少 8 个 case：手机/微信/身份证/银行卡/邮箱/无PII/混合PII/边界（短串）
- **Unit**：`ai.service.ts` — mock Claude client，验证缓存命中、降级、限流
- **Integration**：`POST /ai/draft/extract` — 真实调 Claude API 跑 5 个真实场景（**租房/招聘/二手/便民/混合**），断言：返回 type 在允许集合内、fields 至少识别 3 个、durationMs < 5000
- **E2E** (Playwright)：用户输入文本 → 看到 chip → 点"用这个去发布" → 表单已填 → 提交成功

### 9.2 前端
- **Component**：`extract-chips.tsx` — 3 个置信度状态（高/中/低）渲染正确
- **E2E** (Playwright)：模拟用户输入、debounce（800ms 内连续输入不重复发请求）、网络错误（点"重试"恢复）、点击"用这个去发布"回填字段

### 9.3 性能基准
- 后端 P95 延迟 < 3s（含 LLM 调用，5s 超时即返回降级）
- 缓存命中时 P95 < 100ms
- 前端首屏 LCP < 1.5s（AI 模式首屏）

---

## 10. 监控 & 运营

**admin 看板新增卡片**（"AI 调用看板"）：
- 今日调用次数 / 成功率 / 平均延迟 / 成本 (USD)
- Top 10 用户调用量（防滥用）
- 按 type 分布（house 最多 → 优化方向）

**埋点**（`/ai/draft/extract` 响应里加 `traceId`）：
- 用户从"输入"到"用这个去发布"的转化率
- AI 辅助帖 vs 手动帖的审核通过率
- AI 调用失败的 fallback 触发率

---

## 11. 发布计划

| 阶段 | 内容 | 时长 |
|---|---|---|
| Phase 1 (MVP) | 后端 module + PII + 缓存 + extract API + 前端 AI 模式（house 一种 type） | 1 周 |
| Phase 2 | 前端手动/AI 双入口切换 + 3 个 type 全支持 + 标题建议 | 1 周 |
| Phase 3 | admin AI 看板 + 限频调优 + 监控埋点 | 0.5 周 |
| Phase 4 (V2) | 对话式 / 图片识别 / 智能搜索 | 后续 |

---

## 12. 风险与开放问题

| 风险 | 缓解 |
|---|---|
| Claude API 不稳定 | 缓存 + 降级 + 5s 超时 + 重试 1 次 |
| LLM 提取不准 | 用户可手动编辑 chip；低置信度标红 |
| 老年用户不会用 | 顶部加示例文案"试试这样写：南郡小区两室一厅 1200 押一付三" |
| PIPL 投诉 | 全链路脱敏 + 日志不存原文 + 每月审查 |
| 成本失控 | 限频 + 缓存 + admin 看板可视化 |
| 平台量小，调用稀疏 | 月成本 < ¥100，**不会有 ROI 问题** |

**开放问题**（等 PM 确认）：
1. 缓存 TTL 5 分钟是否合适？需要可调？
2. 限频阈值（30/分、200/天）合理吗？
3. 是否需要"AI 失败次数"用户提示？
4. LLM 提取失败时，**不要 fallback 到第三方接口**（避免外部依赖） — 这个原则 OK 吗？

---

## 13. 文件清单

**新增**：
- `backend/src/modules/ai/ai.controller.ts`
- `backend/src/modules/ai/ai.service.ts`
- `backend/src/modules/ai/ai.module.ts`
- `backend/src/modules/ai/dto/extract.dto.ts`
- `backend/src/modules/ai/dto/suggest-title.dto.ts`
- `backend/src/modules/ai/llm/claude.client.ts`
- `backend/src/modules/ai/llm/prompts/extract.ts`
- `backend/src/common/utils/pii-redact.util.ts`
- `backend/src/common/utils/pii-redact.util.spec.ts`
- `frontend/src/app/posts/publish/ai-mode.tsx`
- `frontend/src/app/posts/publish/manual-mode.tsx`
- `frontend/src/components/ai/extract-chips.tsx`
- `frontend/src/components/ai/title-suggestions.tsx`
- `frontend/src/lib/api-ai.ts` (前端 ai API 客户端)
- `backend/prisma/migrations/20260617_add_ai_usage_logs/`

**修改**：
- `frontend/src/app/posts/publish/page.tsx` (改入口)
- `backend/src/app.module.ts` (注册 AiModule)
- `admin/src/app/dashboard/page.tsx` (加 AI 卡片)
- `backend/.env` (加 `ANTHROPIC_API_KEY`)
- `.env.example` (加 `ANTHROPIC_API_KEY=`)

---

**END**
