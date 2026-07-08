# 🎯 后端 API 安全/健壮性全维度审计 — 总报告

> 日期: 2026-07-08  
> 合并自 7 次跑批, run-2026-07-08T01-37-47, run-2026-07-08T01-42-09, run-2026-07-08T01-44-18, run-2026-07-08T01-47-06, run-2026-07-08T02-07-11, run-2026-07-08T02-11-26, run-2026-07-08T02-12-49

## TL;DR

| 指标 | 值 |
|---|---|
| 去重总用例 | 2168 |
| ✅ 通过 | 1814 (83.7%) |
| ❌ 失败 | 230 (10.6%) |
| ⚠️ 异常 | 124 (5.7%) |
| ⏸ 跳过 | 0 |
| **P0 阻塞** | **93** |
| **P1 重要** | **96** |
| P2 一般 | 69 |
| P3 提示 | 1164 |

## 📋 各次跑批汇总

| 跑批 | Layer | 用例 |
|---|---|---|
| run-2026-07-08T01-37-47 | L1 | 50 |
| run-2026-07-08T01-42-09 | L1 | 68 |
| run-2026-07-08T01-44-18 | L1 | 78 |
| run-2026-07-08T01-47-06 | L2 | 328 |
| run-2026-07-08T02-07-11 | L2 | 2056 |
| run-2026-07-08T02-11-26 | L3 | 45 |
| run-2026-07-08T02-12-49 | L1 | 196 |

## 📊 维度成绩 (13 维度横向)

| # | 维度 | ✅ | ❌ | ⚠️ | ⏸ | 备注 |
|---|---|---|---|---|---|---|
| 1 | 正常参数 | 192 | 4 | 0 | 0 | 通过率 98.0% |
| 2 | 异常参数 | 68 | 44 | 0 | 0 | 通过率 60.7% |
| 3 | 空参数 | 54 | 2 | 0 | 0 | 通过率 96.4% |
| 4 | 超长 | 84 | 84 | 0 | 0 | 通过率 50.0% |
| 5 | SQL 注入 | 280 | 0 | 0 | 0 | 通过率 100.0% |
| 6 | XSS | 252 | 0 | 0 | 0 | 通过率 100.0% |
| 7 | 重复请求 | 0 | 0 | 28 | 0 | 通过率 0.0% |
| 8 | 并发请求 | 0 | 0 | 28 | 0 | 通过率 0.0% |
| 9 | 权限 bypass | 340 | 0 | 0 | 0 | 通过率 100.0% |
| 10 | Token 过期 | 68 | 0 | 0 | 0 | 通过率 100.0% |
| 11 | Token 空 | 408 | 0 | 68 | 0 | 通过率 85.7% |
| 12 | 返回值统一 | 68 | 0 | 0 | 0 | 通过率 100.0% |
| 13 | 状态码 | 0 | 0 | 0 | 0 | 通过率 - |

## 🏢 模块成绩 (按 controller 路径前缀)

| 模块 | 端点 | ✅ | ❌ | ⚠️ |
|---|---|---|---|---|
| posts/999999999 | 682 | 585 | 55 | 42 |
| ai/draft | 200 | 168 | 20 | 12 |
| resumes/me | 98 | 80 | 12 | 6 |
| posts/:id | 17 | 0 | 17 | 0 |
| notifications/settings | 66 | 52 | 10 | 4 |
| reports | 66 | 52 | 10 | 4 |
| companies/999999999 | 81 | 68 | 8 | 5 |
| companies | 51 | 39 | 9 | 3 |
| devices/register | 50 | 38 | 9 | 3 |
| applications | 50 | 38 | 9 | 3 |
| messages | 50 | 38 | 9 | 3 |
| users/999999999 | 51 | 40 | 8 | 3 |
| applications/999999999 | 49 | 38 | 8 | 3 |
| favorites | 66 | 56 | 6 | 4 |
| posts | 51 | 43 | 5 | 3 |
| messages/999999999 | 45 | 42 | 0 | 3 |
| messages/:id | 3 | 0 | 3 | 0 |
| companies/:id | 3 | 0 | 3 | 0 |
| notifications/999999999 | 30 | 28 | 0 | 2 |
| reports/999999999 | 30 | 28 | 0 | 2 |
| upload/image | 16 | 14 | 1 | 1 |
| favorites/count | 16 | 14 | 1 | 1 |
| posts/me | 16 | 14 | 1 | 1 |
| auth/logout | 16 | 14 | 1 | 1 |
| auth/me | 16 | 14 | 1 | 1 |
| users/me | 16 | 14 | 1 | 1 |
| notifications/me | 16 | 14 | 1 | 1 |
| notifications/unread-count | 16 | 14 | 1 | 1 |
| notifications/read-all | 16 | 14 | 1 | 1 |
| applications/me | 16 | 14 | 1 | 1 |
| applications/post-job | 16 | 14 | 1 | 1 |
| messages/inbox | 16 | 14 | 1 | 1 |
| messages/outbox | 16 | 14 | 1 | 1 |
| messages/with | 16 | 14 | 1 | 1 |
| messages/unread-count | 16 | 14 | 1 | 1 |
| messages/read-all | 16 | 14 | 1 | 1 |
| admin/ai | 2 | 0 | 2 | 0 |
| notifications/:id | 2 | 0 | 2 | 0 |
| reports/:id | 2 | 0 | 2 | 0 |
| favorites/999999999 | 15 | 14 | 0 | 1 |
| comments/999999999 | 15 | 14 | 0 | 1 |
| devices/fake-device-token | 15 | 14 | 0 | 1 |
| admin/seo | 1 | 0 | 1 | 0 |
| favorites/:postId | 1 | 0 | 1 | 0 |
| posts/:postId | 1 | 0 | 1 | 0 |
| comments/:id | 1 | 0 | 1 | 0 |
| users/:id | 1 | 0 | 1 | 0 |
| devices/:token | 1 | 0 | 1 | 0 |
| applications/:id | 1 | 0 | 1 | 0 |
| admin/notifications | 8 | 8 | 0 | 0 |
| admin/roles | 7 | 7 | 0 | 0 |
| admin/posts | 7 | 7 | 0 | 0 |
| admin/users | 6 | 6 | 0 | 0 |
| admin/companies | 6 | 6 | 0 | 0 |
| admin/tags | 6 | 6 | 0 | 0 |
| admin/categories | 5 | 5 | 0 | 0 |
| admin/login-logs | 5 | 5 | 0 | 0 |
| admin/announcements | 5 | 5 | 0 | 0 |
| admin/banners | 5 | 5 | 0 | 0 |
| admin/audit-logs | 4 | 4 | 0 | 0 |
| categories/999999999 | 3 | 3 | 0 | 0 |
| users | 2 | 2 | 0 | 0 |
| categories | 2 | 2 | 0 | 0 |
| tags/house | 2 | 2 | 0 | 0 |
| admin/permissions | 2 | 2 | 0 | 0 |
| admin/reports | 2 | 2 | 0 | 0 |
| houses | 1 | 1 | 0 | 0 |
| secondhands | 1 | 1 | 0 | 0 |
| lifebizs | 1 | 1 | 0 | 0 |
| jobs | 1 | 1 | 0 | 0 |
| search | 1 | 1 | 0 | 0 |
| search/hot | 1 | 1 | 0 | 0 |
| health | 1 | 1 | 0 | 0 |
| areas | 1 | 1 | 0 | 0 |
| areas/count | 1 | 1 | 0 | 0 |
| areas/999999999 | 1 | 1 | 0 | 0 |
| ai/health | 1 | 1 | 0 | 0 |
| posts/count | 1 | 1 | 0 | 0 |
| posts/sitemap-data | 1 | 1 | 0 | 0 |
| auth/sms-code | 1 | 1 | 0 | 0 |
| auth/login-sms | 1 | 1 | 0 | 0 |
| auth/login-password | 1 | 1 | 0 | 0 |
| auth/refresh | 1 | 1 | 0 | 0 |
| users/count | 1 | 1 | 0 | 0 |
| categories/tree | 1 | 1 | 0 | 0 |
| categories/count | 1 | 1 | 0 | 0 |
| announcements/active | 1 | 1 | 0 | 0 |
| announcements | 1 | 1 | 0 | 0 |
| announcements/999999999 | 1 | 1 | 0 | 0 |
| agreements | 1 | 1 | 0 | 0 |
| agreements/terms | 1 | 1 | 0 | 0 |
| banners/active | 1 | 1 | 0 | 0 |
| tags | 1 | 1 | 0 | 0 |
| tags/hot | 1 | 1 | 0 | 0 |
| seo/sitemap-full | 1 | 1 | 0 | 0 |
| sitemap.xml | 1 | 1 | 0 | 0 |
| seo/categories | 1 | 1 | 0 | 0 |
| seo/areas | 1 | 1 | 0 | 0 |
| seo/tdk | 1 | 1 | 0 | 0 |
| reports/reasons | 1 | 1 | 0 | 0 |
| resumes | 1 | 1 | 0 | 0 |
| resumes/999999999 | 1 | 1 | 0 | 0 |
| admin/ai-usage | 1 | 1 | 0 | 0 |
| admin/dashboard | 1 | 1 | 0 | 0 |

## 🚨 关键发现 (P0/P1)

### POST /posts/999999999/boost
- [P0] 正常参数
- [P0] 异常类型 (page[])
- [P0] 异常类型 (status,auditStatus)

### POST /admin/ai/regenerate-seo/999999999
- [P0] 正常参数

### POST /admin/seo/push-baidu
- [P0] 正常参数

### POST /posts/999999999/house
- [P0] 超长 (hugeString)
- [P0] 超长 (hugeDescription)
- [P0] 超长 (longBase64)

### PATCH /posts/999999999/house
- [P0] 超长 (hugeString)
- [P0] 超长 (hugeDescription)
- [P0] 超长 (longBase64)

### POST /posts/999999999/secondhand
- [P0] 超长 (hugeString)
- [P0] 超长 (hugeDescription)
- [P0] 超长 (longBase64)

### PATCH /posts/999999999/secondhand
- [P0] 超长 (hugeString)
- [P0] 超长 (hugeDescription)
- [P0] 超长 (longBase64)

### POST /posts/999999999/lifebiz
- [P0] 超长 (hugeString)
- [P0] 超长 (hugeDescription)
- [P0] 超长 (longBase64)

### PATCH /posts/999999999/lifebiz
- [P0] 超长 (hugeString)
- [P0] 超长 (hugeDescription)
- [P0] 超长 (longBase64)

### POST /posts/999999999/job
- [P0] 超长 (hugeString)
- [P0] 超长 (hugeDescription)
- [P0] 超长 (longBase64)

### PATCH /posts/999999999/job
- [P0] 超长 (hugeString)
- [P0] 超长 (hugeDescription)

## 📋 完整失败清单 (按 P 排序, 仅列 P0/P1)

| 端点 | 维度 | 用例 | 状态 | 期望 |
|---|---|---|---|---|
| POST /upload/image | 0 | 测试器异常 | 0 | execute |
| POST /posts/:id/house | 0 | 测试器异常 | 0 | execute |
| PATCH /posts/:id/house | 0 | 测试器异常 | 0 | execute |
| DELETE /posts/:id/house | 0 | 测试器异常 | 0 | execute |
| POST /posts/:id/secondhand | 0 | 测试器异常 | 0 | execute |
| PATCH /posts/:id/secondhand | 0 | 测试器异常 | 0 | execute |
| DELETE /posts/:id/secondhand | 0 | 测试器异常 | 0 | execute |
| POST /posts/:id/lifebiz | 0 | 测试器异常 | 0 | execute |
| PATCH /posts/:id/lifebiz | 0 | 测试器异常 | 0 | execute |
| DELETE /posts/:id/lifebiz | 0 | 测试器异常 | 0 | execute |
| POST /posts/:id/job | 0 | 测试器异常 | 0 | execute |
| PATCH /posts/:id/job | 0 | 测试器异常 | 0 | execute |
| DELETE /posts/:id/job | 0 | 测试器异常 | 0 | execute |
| GET /favorites | 0 | 测试器异常 | 0 | execute |
| GET /favorites/count | 0 | 测试器异常 | 0 | execute |
| POST /favorites | 0 | 测试器异常 | 0 | execute |
| DELETE /favorites/:postId | 0 | 测试器异常 | 0 | execute |
| POST /posts/:postId/comments | 0 | 测试器异常 | 0 | execute |
| DELETE /comments/:id | 0 | 测试器异常 | 0 | execute |
| POST /ai/draft/extract | 0 | 测试器异常 | 0 | execute |
| POST /ai/draft/suggest-title | 0 | 测试器异常 | 0 | execute |
| POST /ai/draft/score | 0 | 测试器异常 | 0 | execute |
| POST /ai/draft/rewrite | 0 | 测试器异常 | 0 | execute |
| POST /posts/:id/boost | 0 | 测试器异常 | 0 | execute |
| POST /posts | 0 | 测试器异常 | 0 | execute |
| GET /posts/me | 0 | 测试器异常 | 0 | execute |
| GET /posts/:id/contact | 0 | 测试器异常 | 0 | execute |
| PATCH /posts/:id | 0 | 测试器异常 | 0 | execute |
| POST /posts/:id/status | 0 | 测试器异常 | 0 | execute |
| DELETE /posts/:id | 0 | 测试器异常 | 0 | execute |
| POST /auth/logout | 0 | 测试器异常 | 0 | execute |
| GET /auth/me | 0 | 测试器异常 | 0 | execute |
| GET /users/me | 0 | 测试器异常 | 0 | execute |
| PATCH /users/:id | 0 | 测试器异常 | 0 | execute |
| GET /notifications/me | 0 | 测试器异常 | 0 | execute |
| GET /notifications/unread-count | 0 | 测试器异常 | 0 | execute |
| POST /notifications/:id/read | 0 | 测试器异常 | 0 | execute |
| POST /notifications/read-all | 0 | 测试器异常 | 0 | execute |
| DELETE /notifications/:id | 0 | 测试器异常 | 0 | execute |
| GET /notifications/settings | 0 | 测试器异常 | 0 | execute |
| PUT /notifications/settings/:event | 0 | 测试器异常 | 0 | execute |
| POST /devices/register | 0 | 测试器异常 | 0 | execute |
| DELETE /devices/:token | 0 | 测试器异常 | 0 | execute |
| GET /applications/me | 0 | 测试器异常 | 0 | execute |
| GET /applications/post-job/:id | 0 | 测试器异常 | 0 | execute |
| POST /applications | 0 | 测试器异常 | 0 | execute |
| PATCH /applications/:id/status | 0 | 测试器异常 | 0 | execute |
| POST /messages | 0 | 测试器异常 | 0 | execute |
| GET /messages/inbox | 0 | 测试器异常 | 0 | execute |
| GET /messages/outbox | 0 | 测试器异常 | 0 | execute |
| GET /messages/with/:userId | 0 | 测试器异常 | 0 | execute |
| GET /messages/unread-count | 0 | 测试器异常 | 0 | execute |
| POST /messages/read-all | 0 | 测试器异常 | 0 | execute |
| POST /messages/:id/read | 0 | 测试器异常 | 0 | execute |
| POST /messages/:id/recall | 0 | 测试器异常 | 0 | execute |
| DELETE /messages/:id | 0 | 测试器异常 | 0 | execute |
| POST /reports | 0 | 测试器异常 | 0 | execute |
| GET /reports | 0 | 测试器异常 | 0 | execute |
| GET /reports/:id | 0 | 测试器异常 | 0 | execute |
| DELETE /reports/:id | 0 | 测试器异常 | 0 | execute |
| POST /companies | 0 | 测试器异常 | 0 | execute |
| PATCH /companies/:id | 0 | 测试器异常 | 0 | execute |
| DELETE /companies/:id | 0 | 测试器异常 | 0 | execute |
| POST /companies/:id/restore | 0 | 测试器异常 | 0 | execute |
| GET /resumes/me | 0 | 测试器异常 | 0 | execute |
| PUT /resumes/me | 0 | 测试器异常 | 0 | execute |
| DELETE /resumes/me | 0 | 测试器异常 | 0 | execute |
| POST /resumes/me/restore | 0 | 测试器异常 | 0 | execute |
| POST /posts/999999999/house | 0 | dim runner error | 0 | execute |
| PATCH /posts/999999999/house | 0 | dim runner error | 0 | execute |
| POST /posts/999999999/secondhand | 0 | dim runner error | 0 | execute |
| PATCH /posts/999999999/secondhand | 0 | dim runner error | 0 | execute |
| POST /posts/999999999/lifebiz | 0 | dim runner error | 0 | execute |
| PATCH /posts/999999999/lifebiz | 0 | dim runner error | 0 | execute |
| POST /posts/999999999/job | 0 | dim runner error | 0 | execute |
| PATCH /posts/999999999/job | 0 | dim runner error | 0 | execute |
| POST /favorites | 0 | dim runner error | 0 | execute |
| POST /posts/999999999/comments | 0 | dim runner error | 0 | execute |
| POST /ai/draft/extract | 0 | dim runner error | 0 | execute |
| POST /ai/draft/suggest-title | 0 | dim runner error | 0 | execute |
| POST /ai/draft/score | 0 | dim runner error | 0 | execute |
| POST /ai/draft/rewrite | 0 | dim runner error | 0 | execute |
| POST /posts/999999999/boost | 0 | dim runner error | 0 | execute |
| POST /posts | 0 | dim runner error | 0 | execute |
| PATCH /posts/999999999 | 0 | dim runner error | 0 | execute |
| POST /posts/999999999/status | 0 | dim runner error | 0 | execute |
| PATCH /users/999999999 | 0 | dim runner error | 0 | execute |
| PUT /notifications/settings/system | 0 | dim runner error | 0 | execute |
| POST /devices/register | 0 | dim runner error | 0 | execute |
| POST /applications | 0 | dim runner error | 0 | execute |
| PATCH /applications/999999999/status | 0 | dim runner error | 0 | execute |
| POST /messages | 0 | dim runner error | 0 | execute |
| POST /reports | 0 | dim runner error | 0 | execute |
| POST /companies | 0 | dim runner error | 0 | execute |
| PATCH /companies/999999999 | 0 | dim runner error | 0 | execute |
| PUT /resumes/me | 0 | dim runner error | 0 | execute |
| POST /posts/999999999/boost | 1 | 正常参数 | 503 | [200,201,204,400,401,403,404,4 |
| POST /admin/ai/regenerate-seo/999999999 | 1 | 正常参数 | 500 | [200,201,204,400,401,403,404,4 |
| POST /admin/seo/push-baidu | 1 | 正常参数 | 500 | [200,201,204,400,401,403,404,4 |
| POST /posts/999999999/boost | 2 | 异常类型 (page[]) | 503 | 4xx |
