# 黑盒验收测试报告 — 伊春有事儿说

**测试时间**: 2026-06-19  
**测试方式**: Playwright 自动化 + 真实用户操作模拟  
**测试范围**: 前端用户端 / 管理后台 / 后端 API / 权限 / 异常

---

## 🚦 上线评估结论

### ❌ 不可上线 (Not Production Ready)

**核心问题**:
1. **`/posts` 帖子列表页 404** — 站点的核心内容浏览页无法访问
2. **MySQL FULLTEXT 索引缺失** — 搜索功能完全不可用 (500)
3. **API `/posts/mine` BigInt 解析错误** — 用户中心"我的发布"功能崩溃
4. **CORS 白名单缺 `127.0.0.1`** — 用 127.0.0.1 访问时所有 API 被拒
5. **搜索页 React 渲染错误** — 搜索词对象被当 child 渲染，白屏风险

---

## 📊 总体统计

| 模块 | 测试用例 | PASS | FAIL | 通过率 |
|---|---|---|---|---|
| A: 页面可达性 | 16 | 15 | 1 | 93.8% |
| B: 注册流程 | 7 | 7 | 0 | 100% |
| C: 登录流程 | 5 | 5 | 0 | 100% |
| D: 内容浏览 | 11 | 8 | 3 | 72.7% |
| E: 内容发布 | 7 | 6 | 1 | 85.7% |
| F: 个人中心 | 9 | 8 | 1 | 88.9% |
| G: 管理后台 | 17 | 17 | 0 | 100% |
| H: 权限安全 | 11 | 10 | 1 | 90.9% |
| I: 异常测试 | 10 | 9 | 1 | 90.0% |
| **合计** | **93** | **85** | **8** | **91.4%** |

---

## 🔴 Critical 级 Bug (阻断上线)

### C-1: `/posts` 帖子列表页 404
- **位置**: `frontend/src/app/posts/page.tsx` (缺失)
- **影响**: 站点的核心内容列表页完全无法访问，用户看不到帖子
- **复现**: 浏览器访问 `http://localhost:3000/posts`
- **期望**: HTTP 200，显示帖子列表
- **实际**: HTTP 404, "This page could not be found"
- **根因**: `frontend/src/app/posts/` 目录只有 `[id]/` 和 `publish/` 子目录，**没有 `page.tsx`**
- **修复**: 创建 `frontend/src/app/posts/page.tsx` (建议复用首页 PostCard 组件)

### C-2: MySQL FULLTEXT 索引缺失
- **位置**: 后端 `/api/v1/search` 端点 + 数据库 posts 表
- **影响**: 搜索功能 100% 不可用
- **复现**: `curl http://localhost:3001/api/v1/search?q=出租`
- **实际响应**: 500 Internal Server Error
  ```
  Invalid `prisma.$queryRawUnsafe()` invocation:
  Raw query failed. Code: `1191`. Message: `Can't find FULLTEXT index matching the column list`
  ```
- **根因**: `posts` 表没建 FULLTEXT 索引，prisma schema 没有对应 @@index
- **修复**: 在 schema.prisma 加 `@@index([title, description], type: Fulltext)` 然后 `npx prisma migrate dev`

### C-3: API `/posts/mine` BigInt 解析错误
- **位置**: 后端 `/api/v1/posts/mine` 端点
- **影响**: 用户"我的发布"功能完全崩溃
- **复现**: 登录后调 `GET /api/v1/posts/mine`
- **实际**: 500 Internal Server Error — `Cannot convert mine to a BigInt`
- **根因**: Prisma 解析 "mine" 为 BigInt 列名（Prisma 误把 URL path 段当列）
- **修复**: 改 route handler 把 `mine` 改成 filter 参数形式 (`?authorId=me` 或 `?scope=mine`)

### C-4: CORS 白名单缺 `127.0.0.1`
- **位置**: `backend/src/main.ts` (CORS 配置)
- **影响**: 用 `http://127.0.0.1:3000` 访问时所有 API 请求被拒
- **复现**: 浏览器访问 `http://127.0.0.1:3000/`, Console 报 CORS 错
- **实际**: `Access to fetch at 'http://localhost:3001/api/v1/...' from origin 'http://127.0.0.1:3000' has been blocked by CORS policy`
- **根因**: CORS 白名单只配了 `localhost:3000, localhost:3002`，没有 `127.0.0.1`
- **修复**: 在 CORS origin 数组加 `http://127.0.0.1:3000, http://127.0.0.1:3002`

---

## 🟠 Major 级 Bug (影响体验)

### M-1: 搜索页 React 渲染错误
- **位置**: `frontend/src/app/search/page.tsx`
- **影响**: 访问 `/search` 触发 React 错误，可能导致白屏
- **实际错误**: `Objects are not valid as a React child (found: object with keys {keyword, count})`
- **根因**: 搜索词热门榜接口返回 `[{keyword, count}, ...]`，前端直接把对象数组当 child 渲染
- **修复**: 用 `data.map(item => item.keyword)` 或 `<span>{item.keyword}</span>`

### M-2: 重复提交帖子未触发 rate limit
- **位置**: 后端帖子创建 rate limit 中间件
- **影响**: admin 可以无限创建帖子，没有防刷
- **复现**: 同一 token 3 次 POST `/api/v1/posts` 相同 payload
- **实际**: `[201, 201, 201]` 全成功
- **根因**: rate limit 可能只对普通用户 (`role=user`) 生效，admin 不受限；或时间窗口太长
- **修复**: 给 admin 也加 daily 限额；或减小窗口

---

## 🟡 Minor 级 Bug (优化项)

### m-1: 未登录用户可访问 `/posts/publish`
- **位置**: `frontend/src/app/posts/publish/page.tsx`
- **影响**: UX 不一致 — 未登录能看到发布页，但提交时被拒
- **测试结果**: 未登录访问 publish 页，未跳 login
- **建议**: 在 publish 页加客户端 auth check，未登录跳 login
- **产品决策**: 也可保留当前设计（让用户预览 AI 后再注册）

### m-2: 分类 API 不按 type 过滤
- **位置**: `GET /api/v1/categories?type=xxx`
- **影响**: 不管 type 传什么值都返回第一个类目 (house)
- **测试**: 4 个 type 都返回 `id=1, code=house`
- **建议**: 修复 filter 逻辑；或删除 type 参数避免误导

### m-3: 帖子数据严重不足
- **位置**: 数据库 seed
- **影响**: 演示/生产前需要真实数据
- **测试**: `house=0, secondhand=1, job=0, lifebiz=0` 几乎空白
- **建议**: 完善 prisma/seed.ts 补齐 4 类各 10+ 条测试数据

### m-4: 公告/轮播图为空
- **位置**: 数据库 seed
- **影响**: 首页轮播图/公告不显示
- **测试**: `/api/v1/announcements/active` 和 `/banners/active` 都返回 0 条
- **建议**: seed 加示例数据

---

## ✅ 优秀表现 (亮点)

### 1. 登录 / 注册流程完备
- 12/12 测试用例全过
- 表单前端校验严格（非法字符过滤、超长截断、格式校验）
- 错误密码提示友好
- 登录态保持稳定（刷新后未掉）
- 多种登录方式（SMS / 密码）

### 2. 权限控制严密
- 未登录 → 跳 login ✅
- 普通用户访问 admin → 403 ✅
- 假 token → 401 ✅
- 前端 + 后端双重校验
- admin 路由守卫工作正常

### 3. 管理后台功能完整
- 17/17 全过
- 用户/帖子/举报/轮播图/公司/公告看板齐全
- **封禁/解封 API 工作正常** (cd70e29 修复的 bug 验证通过)
- admin 登录也走 SMS 验证码，安全

### 4. 输入校验严格
- 缺 title → 400 ✅
- 超长 title (>100) → 400 ✅
- 负数 price → 400 ✅
- 错误 type → 400 ✅
- SQL 注入字符被正确转义 ✅

### 5. API DTO 校验工作
- 后端 class-validator 严格
- 错误信息明确（中文提示）
- 拒绝 10000 字符 description
- 拒绝特殊字符注入

---

## 🔧 修复建议清单 (按优先级)

### P0 - 上线前必须修
1. **C-1**: 补 `frontend/src/app/posts/page.tsx` 列表页
2. **C-2**: Prisma schema 加 FULLTEXT 索引并迁移
3. **C-3**: 修复 `/posts/mine` BigInt 解析（重命名 endpoint）
4. **C-4**: CORS 加 `127.0.0.1:3000/3002` 到白名单

### P1 - 强烈建议修
5. **M-1**: 搜索页修 React 渲染错误
6. **M-2**: rate limit 给 admin 也加约束
7. **m-3**: 补 4 类型各 10+ 帖子 seed 数据
8. **m-4**: 补公告/轮播图 seed

### P2 - 体验优化
9. **m-1**: publish 页加未登录检查
10. **m-2**: categories API 修 type 过滤逻辑

---

## 📋 详细测试结果

报告 JSON 位置:
- `.pm-tmp/report-A.json` (页面可达性)
- `.pm-tmp/report-BC.json` (注册登录)
- `.pm-tmp/report-D.json` (内容浏览)
- `.pm-tmp/report-E.json` (内容发布)
- `.pm-tmp/report-F.json` (个人中心)
- `.pm-tmp/report-G.json` (管理后台)
- `.pm-tmp/report-H.json` (权限)
- `.pm-tmp/report-I.json` (异常)

测试脚本:
- `.pm-tmp/bb-test-A-pages.py`
- `.pm-tmp/bb-test-BC-auth.py`
- `.pm-tmp/bb-test-D-browse.py`
- `.pm-tmp/bb-test-E-publish.py`
- `.pm-tmp/bb-test-F-me.py`
- `.pm-tmp/bb-test-G-admin.py`
- `.pm-tmp/bb-test-H-perm.py`
- `.pm-tmp/bb-test-I-err.py`

---

## 🏁 最终评估

**当前状态**: 不可上线

**理由**:
- 4 个 Critical bug 阻断核心功能 (列表页 404、搜索 500、我的发布 500、CORS 阻断)
- 站点核心浏览功能 (帖子列表) 完全不可用
- 关键用户路径 (我的发布) 崩溃
- 搜索功能 100% 不可用

**修复 P0 4 项后** → 建议重新跑一遍 D/F 模块验证 → 可再次评估

**预计修复工时**: 
- C-1 (列表页): 2-4 小时 (含 UI)
- C-2 (FULLTEXT): 30 分钟 (schema + migrate)
- C-3 (mine endpoint): 1 小时
- C-4 (CORS): 5 分钟
- **合计**: 半天内可完成

---

*报告生成时间: 2026-06-19 18:35*  
*测试执行: Playwright + 真实用户操作模拟*  
*测试人: Claude (MiniMax-M3)*  
*工具: Playwright 1.58.0 + Python 3.12*
