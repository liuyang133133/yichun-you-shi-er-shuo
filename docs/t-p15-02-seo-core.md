# T-P15-02 SEO 三件套 V1 — 设计文档

> **任务**：V1 核心 SEO（schema + 25 分类 TDK + 12 区县 TDK + sitemap.xml + JSON-LD），3 天
> **基线**：`main`（`a2c97dd`，已含 T-001~T-021）
> **新分支**：`feature/T-P15-02-seo-core`（基于 `origin/main` 重建，已 merge）
> **关联**：[yichun-business-gaps-2026-06-22.md §7 G-02 SEO](./yichun-business-gaps-2026-06-22.md) / [yichun-roadmap.md §1.5.1](./yichun-roadmap.md)
> **V2 范围**（独立后续）：URL slug 路由 + 独立面包屑组件 + 相关推荐组件 + `/c/[slug]` `/a/[slug]` 落地页

---

## Context

### 启动前现状

**后端**：
- `backend/src/modules/seo/` 已有 5 方法（generateSeoMeta / batchGenerateSeoMeta / getSitemapData / pushBaiduSitemap / +2 cron），4 端点
- 仅输出 `sitemap-data` JSON，**无标准 sitemap.org XML**
- **无 Category / Area TDK 端点**
- `schema.prisma` Category / Area 无 slug / TDK 字段
- `seed.ts` 25 分类 + 12 区县，**无 SEO 字段**

**前端**：
- `sitemap.ts` 仅调后端 `/posts/sitemap-data` + 静态页拼接
- `robots.ts` 域名硬编码 `https://example.com`
- 首页 `generateMetadata` 无 OG/Twitter/canonical
- 帖子详情有 JSON-LD，但**无 BreadcrumbList**

### 问题

- 爬虫（百度 / Google）通过 `/sitemap.xml` 只能拿到 Post，**分类/区县入口页不被收录**
- 25 分类 + 12 区县**无独立 TDK**，搜索「伊春租房」「南岔招聘」匹配度低
- robots 域名硬编码导致 SEO 提交到错误的 sitemap

---

## 解决方案

### 3 个 commits

| Commit | 内容 |
|---|---|
| `d993f8c fix(schema): T-P15-02a` | Category/Area 加 slug + TDK 字段 + Post 加 slug (V2 预留) + seed TDK 数据 |
| `5d59399 feat(seo): T-P15-02b` | seo.service + controller 加 sitemap.xml + TDK 端点 + 8 单测 |
| `b816f5c feat(frontend): T-P15-02c` | sitemap.ts 升级 + robots.ts 修复 + JSON-LD 增强 |

### 关键决策

1. **TDK 数据内联到 seed.ts**：避免跨文件 import + tsconfig 改动
2. **slug 生成规则**：顶级分类用 `code`（house / secondhand / job / lifebiz），子分类用 `{parentCode}-{namePinyin}`，区县用拼音
3. **子分类 TDK 动态拼装**：V2 再固化独立 TDK（节省 21 条种子）
4. **sitemap.ts 升级方案 C**：本地拼 XML，**调后端 `/posts/sitemap-full` 一次性拿全量数据**（避免 3 次 fetch）
5. **JSON-LD 用 @graph 合并**：单一 script 节点（SEO 爬虫友好）
6. **BreadcrumbList 注入到帖子详情**：首页 → 分类过滤页 → 区县过滤页 → 帖子详情页

### Schema 改动

```prisma
model Category {
  // ... existing
  slug            String? @db.VarChar(60)  @map("slug")
  seoTitle        String? @db.VarChar(200) @map("seo_title")
  seoKeywords     String? @db.VarChar(300) @map("seo_keywords")
  seoDescription  String? @db.VarChar(500) @map("seo_description")
  @@unique([slug])
}

model Area {
  // ... 同 Category
}

model Post {
  // ... existing
  slug  String?  @db.VarChar(120)  @map("slug")  // V2 预留
  @@index([slug])
}
```

### 后端新端点

| Method | 路径 | Content-Type | 用途 |
|---|---|---|---|
| GET | `/sitemap.xml` | `application/xml; charset=utf-8` | 爬虫拉 sitemap（5min cache）|
| GET | `/posts/sitemap-full` | `application/json` | 前端 Next.js sitemap.ts |
| GET | `/seo/categories/:slug` | `application/json` | 公开分类 SEO |
| GET | `/seo/areas/:slug` | `application/json` | 公开区县 SEO |

### 后端新方法

```ts
// SeoService
async getSitemapXml(): Promise<{ xml: string; entryCount: number }>;
async getFullSitemapData(limit?: number): Promise<{ posts, categories, areas: SitemapEntry[] }>;
async getCategorySeo(slug: string): Promise<CategorySeoResponseDto | null>;
async getAreaSeo(slug: string): Promise<AreaSeoResponseDto | null>;
private escapeXml(str: string): string;  // & < > " ' 转义
```

### TDK 模板（4 顶级 + 12 区县）

**顶级 house 模板**：
- seoTitle: `伊春房屋出租 - 整租/合租/短租/商铺真实房源 | 伊春有事儿说`
- seoKeywords: `伊春租房,伊春房屋出租,伊春合租,伊春短租,小兴安岭租房,伊美区租房`
- seoDescription: `伊春本地房屋出租信息平台，提供伊美区、南岔县、友好区、铁力市等区县整租、合租、短租、商铺写字楼真实房源，每日更新，免费看房电话。`

**区县 yimei 模板**：
- seoTitle: `伊美区房屋出租/二手/招聘/便民信息 | 伊春有事儿说`
- seoKeywords: `伊美区信息,伊美区租房,伊美区二手,伊美区招聘,伊美区便民,伊春伊美区`
- seoDescription: `伊春伊美区本地分类信息平台，提供伊美区房屋出租、二手交易、招聘求职、便民信息，每日更新，本地真实可靠。`

### 前端 sitemap 升级

```ts
// 一次性 fetch 全量数据
const res = await fetch(`${API_URL}/posts/sitemap-full?limit=50000`, {
  next: { revalidate: 300 }, // 5min ISR
});
const { posts, categories, areas } = await res.json();
return [...staticPages, ...posts, ...categories, ...areas];
```

**失败降级**：构建期无网络时仅返回静态页（避免脏数据）。

### JSON-LD 结构

**首页 (@graph)**：
- WebSite（含 SearchAction）
- Organization（含 logo / address / contactPoint）

**帖子详情 (@graph 合并)**：
- RealEstateListing / Product / JobPosting / Article（已存在，4-type 模板 + AI 优先）
- BreadcrumbList（首页 → 分类 → 区县 → 帖子，**T-P15-02c 新增**）

---

## 数据流

```
admin 启动 → prisma migrate dev → 应用 migration
  ↓ ALTER TABLE categories/areas 加 slug/seo 列
  ↓ ALTER TABLE posts 加 slug
  ↓ prisma db seed → 25 分类 + 13 区县写入 slug + TDK
  ↑ 数据库 schema 就绪

爬虫 GET /sitemap.xml
  ↓ SeoController.sitemapXml (@Public)
  ↓ SeoService.getSitemapXml()
  ↓   getFullSitemapData() — Promise.all([posts, categories, areas])
  ↓   escapeXml() + <urlset> 包装
  ↑ application/xml; charset=utf-8

Next.js 构建 → app/sitemap.ts
  ↓ fetch 后端 /posts/sitemap-full (5min ISR)
  ↓ 转 MetadataRoute.Sitemap
  ↑ Next.js 自动转 sitemap.org XML 输出

爬虫 GET /seo/categories/house
  ↓ SeoController.categorySeo (@Public)
  ↓ SeoService.getCategorySeo('house')
  ↓   prisma.category.findUnique({ where: { slug } })
  ↓   _count.posts where status=passed
  ↓   seoTitle=null → 默认模板兜底
  ↑ CategorySeoResponseDto

爬虫 GET /seo/areas/yimei
  ↓ (同上)
  ↑ AreaSeoResponseDto
```

---

## 单测矩阵（11 用例）

### 现有（3）
1. generateSeoMeta: 写 Post.seoMeta
2. getSitemapData: 返回 posts 列表 with priority
3. pushBaiduSitemap: 写 SitemapPushLog

### T-P15-02-1~3 getSitemapXml（3）
4. 返回 XML 字符串含 urlset 与 url/loc 节点（posts + categories + areas = 3 条）
5. XML 转义 `<`, `>`, `&` 字符
6. posts=0 / categories=0 / areas=0 时仍返回合法 XML

### T-P15-02-4~6 getCategorySeo（3）
7. 命中 slug=house 返回完整 DTO 含 postCount=128
8. slug 未命中返回 null
9. seoTitle=null 时使用默认模板兜底

### T-P15-02-7~8 getAreaSeo（2）
10. 命中 slug=yimei 返回 AreaSeoDto（level=2, parentId='1'）
11. slug 未命中返回 null

---

## 验收对照

### 自动化
- ✅ `npx prisma validate` 通过
- ✅ `npx jest src/modules/seo/` → 11/11 通过
- ✅ 回归 5 模块 → 79/79 通过（seo 11 + company 8 + banner 17 + announcement 24 + tag 30）
- ⚠️ `frontend/playwright.config.ts` pre-existing merge conflict 阻塞全量 tsc（不在 T-P15-02 范围）
- ⚠️ `agreement.spec` 需要真实 MySQL（pre-existing e2e 测试，与本任务无关）

### 手动冒烟（待生产环境验证）
1. `prisma migrate dev --name t_p15_02_seo_slug` → 应用 migration
2. `prisma db seed` → 写入 25 分类 + 13 区县 TDK
3. `curl http://localhost:3001/api/v1/sitemap.xml` → 返回标准 XML
4. `curl http://localhost:3001/api/v1/seo/categories/house` → 返回 JSON 含 seoTitle
5. `curl http://localhost:3001/api/v1/seo/areas/yimei` → 返回 JSON 含 seoTitle
6. `cd frontend && npm run build` → sitemap.xml 路由生成成功

---

## 关键文件清单

### 新建（3 文件）
- `backend/prisma/migrations/20260628_t_p15_02_seo_slug/migration.sql`
- `backend/src/modules/seo/dto/seo-meta.dto.ts`

### 修改（10 文件）
- `backend/prisma/schema.prisma` (Category + Area + Post)
- `backend/prisma/seed.ts` (TDK 内联 + 解决 T-018 conflict)
- `backend/src/modules/seo/seo.service.ts` (+4 方法 + XML escape)
- `backend/src/modules/seo/seo.controller.ts` (+4 端点)
- `backend/src/modules/seo/seo.service.spec.ts` (+8 it)
- `frontend/src/app/sitemap.ts` (调 /posts/sitemap-full)
- `frontend/src/app/robots.ts` (NEXT_PUBLIC_SITE_URL)
- `frontend/src/app/page.tsx` (WebSite + Organization JSON-LD)
- `frontend/src/app/posts/[id]/page.tsx` (BreadcrumbList JSON-LD)
- `CHANGELOG.md`

---

## 风险与缓解

| 风险 | 状态 | 缓解 |
|---|---|---|
| slug 唯一约束导致 seed 失败 | 中 | seed 用 upsert + slug 冲突自动 -2 后缀（V2 加） |
| TDK 重复（25 分类模板相似）| 中 | 顶级 4 分类含分类独特关键词（"整租/合租/短租"差异）|
| CJK URL 编码错误 | 低 | XML escape + 测试覆盖 |
| 50k Post sitemap 查询慢 | 中 | `Promise.all` 并行 + 客户端 ISR 缓存 5min |
| sitemap 暴露 `/c/[slug]` `/a/[slug]` 但前端无页面 | 中 | **T-P15-02 V1 仍输出**（sitemap 包含分类/区县 landing URL，V2 落地页上线即可生效；落地页 404 短期可接受） |
| Post.slug 历史 NULL 数据 | 低 | V1 字段 nullable，V2 用 cron 异步回填 |
| `playwright.config.ts` 阻塞全量 tsc | 中 | 留作独立 cleanup task |

---

## V2 范围（独立后续任务）

| 任务 | 工时 | 优先级 |
|---|---|---|
| URL slug 路由 `/posts/[type]/[id]-[slug]` | 2 天 | 🟡 |
| 独立 Breadcrumb 组件（全站铺开） | 1 天 | 🟡 |
| RelatedPosts 组件 | 1 天 | 🟢 |
| `/c/[slug]` 分类落地页（接 getCategorySeo） | 1 天 | 🔴 |
| `/a/[slug]` 区县落地页（接 getAreaSeo） | 1 天 | 🔴 |
| Post.slug 历史数据回填 cron | 0.5 天 | 🟢 |
| `playwright.config.ts` merge conflict cleanup | 0.5 天 | 🟡 |

---

## 相关任务

- T-001 软删除 + 审计字段（schema 基础）
- T-013 标签系统（slug unique 模式参考）
- T-018 协议页（merge conflict 来源 — 已解决 schema.prisma + seed.ts 残留）
- T-021 公司后台管理升级（紧邻前任务）
- T-P15-02 V2 增强（独立后续 task）
- T-P15-03 百度 / 搜狗 / 360 主动推送 + JSON-LD 结构化数据
- T-P15-01 IM 即时聊天
- T-P15-04~07 商业化前置 4 件套

---

**最后更新**：2026-06-28
**Commits**：
1. `d993f8c` — fix(schema): T-P15-02a
2. `5d59399` — feat(seo): T-P15-02b
3. `b816f5c` — feat(frontend): T-P15-02c