# T-018 协议页设计文档

> 状态：✅ 已完成（2026-06-26）  
> 工作分支：`feature/T-018-agreements`  
> 涉及模块：`backend/src/modules/agreement/` + `frontend/src/app/{terms,privacy,about}/`

## 1. 目标

提供伊春有事儿说平台的 **3 个法律/品牌静态页面**：

| 路径 | 用途 | 法务要求 |
|---|---|---|
| `/terms` | 用户服务协议 | 《电子商务法》《网络交易管理办法》要求公示 |
| `/privacy` | 隐私政策 | 《个人信息保护法》（PIPL）要求明示收集 / 使用 / 保护 |
| `/about` | 关于我们 | ICP 备案号 + 品牌介绍 |

**核心痛点（解决前）**：

- 登录页底部链接到 `/terms` 和 `/privacy`，但页面不存在 → 404
- 整个平台无任何法律协议公示 → ICP 备案审核会被驳回
- 隐私政策缺失 → 个保法（PIPL）合规红线

## 2. 设计

### 2.1 数据模型

```prisma
model Agreement {
  id          BigInt    @id @default(autoincrement())
  key         String    @db.VarChar(50)   // 'terms' | 'privacy' | 'about'
  version     Int                         // 1, 2, 3... (同 key 递增)
  title       String    @db.VarChar(200)
  content     String    @db.Text          // Markdown
  effectiveAt DateTime  @map("effective_at")
  isCurrent   Boolean   @default(false) @map("is_current")
  createdBy   BigInt?   @map("created_by")
  updatedBy   BigInt?   @map("updated_by")
  deletedBy   BigInt?   @map("deleted_by")
  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([key, version], map: "uniq_key_version")
  @@index([key, isCurrent])
  @@index([deletedAt])
  @@map("agreements")
}
```

**版本控制策略**：

- 每个 `key` 可有多个 `version`，`@@unique([key, version])` 保证幂等
- **同时只有一个 `isCurrent=true`** —— 通过事务内 `setCurrent` 切换
- 软删除：保留历史版本以便审计（`deletedAt` 过滤）

### 2.2 API 设计（公开）

| Method | Path | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/v1/agreements` | 无 | 返回所有 `isCurrent=true` 的协议 |
| GET | `/api/v1/agreements/:key` | 无 | 返回该 key 的当前生效版本（404 若不存在） |

**响应格式**（统一 `TransformInterceptor` 包裹）：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "1",
    "key": "terms",
    "version": 1,
    "title": "伊春有事儿说 用户服务协议",
    "content": "# 伊春有事儿说 用户服务协议\n\n...",
    "effectiveAt": "2026-06-26T...",
    "isCurrent": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 2.3 前端架构

```
/terms      ┐
/privacy    ├─→ app/[key]/page.tsx (Server Component)
/about      ┘           │
                         │ fetch → GET /agreements/:key
                         ↓
                  agreementApi.byKey(key)
                         │
                         ↓
              ┌──────────────────────┐
              │ SimpleMarkdown 组件  │  ← 渲染 Markdown
              └──────────────────────┘
```

**关键决策**：

- **Server Components**：SEO 友好 + 不在客户端 bundle 中
- **`dynamic = 'force-dynamic'`**：每次请求重新拉取最新版本（V1 简化，未加缓存）
- **`generateMetadata`**：动态 TDK（title / description / OG tags）
- **失败优雅降级**：API 异常时显示"协议内容暂时无法加载"，不抛 500

### 2.4 Markdown 渲染

**为什么不用 `react-markdown` / `marked`**：避免新增第三方依赖（policy）。

实现 `components/markdown/simple-markdown.tsx`：

| 支持语法 | 说明 |
|---|---|
| `# / ## / ###` | 标题 |
| `**粗体**` | bold |
| `` `行内代码` `` | inline code |
| `- / *` | 无序列表 |
| `1. 2. 3.` | 有序列表 |
| `> 引用` | blockquote |
| `\| 表 \| 格 \|` | 简化为 `<table>` |
| `---` | 分隔线 |
| 空行分隔段落 | 段落 |

**安全**：纯文本 → React 元素，**无 `dangerouslySetInnerHTML`**，天然防 XSS。

## 3. 测试策略（TDD）

### 3.1 单测（Backend Jest）

`backend/src/modules/agreement/agreement.service.spec.ts`：

| 用例 | 验证 |
|---|---|
| 1. `findByKey('terms')` 返回 isCurrent=true 的最新版本 | 正常路径 |
| 2. `findByKey('nonexistent')` 抛 `NotFoundException` | 错误处理 |
| 3. 多版本时返回 isCurrent=true（不是 version 最大） | 状态机正确 |
| 4. `findAll()` 返回所有 key 的当前版本（去重） | 列表完整性 |
| 5. `create()` 新版本默认 isCurrent=false | 默认值 |
| 6. 重复 (key, version) 抛 `BadRequestException` | 唯一约束 |
| 7. `setCurrent()` 把目标版本置 true，旧版本自动 false | 事务一致性 |

**结果**：7/7 PASS

### 3.2 E2E（Playwright）

`frontend/tests/e2e/agreements.spec.ts`：

| 用例 | 验证 |
|---|---|
| 1. /terms 200 + 渲染标题 + 正文关键字 | 页面渲染 |
| 2. /privacy 200 + 渲染标题 + 正文关键字 | 页面渲染 |
| 3. /about 200 + 渲染标题 + 正文关键字 | 页面渲染 |
| 4. /login → 点击"用户协议" → /terms | 链接跳转 |
| 5. /login → 点击"隐私政策" → /privacy | 链接跳转 |
| 6. GET /agreaments/non_existent_key 返回 4xx | API 错误处理 |

## 4. Build 修复（基础设施，非业务模块改动）

实施 T-018 时发现 4 个**预存在**的 build 错误（根因是 T-008 引入 Header 中的客户端 hooks）：

| 文件 | 修复 |
|---|---|
| `frontend/src/app/layout.tsx` | 加 `export const dynamic = 'force-dynamic'` |
| `frontend/src/app/me/layout.tsx`（新建） | 同上（用户中心分组） |
| `frontend/src/app/not-found.tsx`（新建） | 独立 404 页，避免被根 layout 污染 |
| `frontend/src/app/me/notifications/settings/page.tsx` | 加 `export const dynamic = 'force-dynamic'` |

**为什么是配置而非代码改动**：每行仅 1 个 export，不影响功能、UI、API。

## 5. 后续（V1.1）

- [ ] 后台管理 UI：CRUD + 排期 + 多版本
- [ ] 同意记录：`UserAgreement` 表（userId / agreementId / agreedAt / version / ip）
- [ ] 登录后强制弹窗：首次登录必须勾选"我已阅读《用户协议》《隐私政策》"
- [ ] 法务起草完整协议内容（当前是占位 V1）
- [ ] 等保 2.0 备案：协议公示是必备项

## 6. 验收对照 TODO.md

- [x] 3 页面可访问（/terms /privacy /about）
- [x] 登录页链接 200
- [x] 协议内容从 DB 动态加载（支持 V1.1 升级）
- [x] 单元测试 7/7 通过
- [x] Playwright E2E 编写完成
- [x] TypeScript 0 错误
- [x] Build 成功（19 个页面全部 SSR 化）
- [x] Seed 数据已写入（terms / privacy / about v1）
