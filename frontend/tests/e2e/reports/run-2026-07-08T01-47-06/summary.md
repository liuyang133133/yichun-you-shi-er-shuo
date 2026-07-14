# 后端 API 安全审计 (L2) — 2026-07-08

## TL;DR
- ✅ 通过 215 / ❌ 失败 113 / ⚠️ 异常 0 / ⏸ 跳过 0  / 总 328
- 用时 0m5s
- P0 阻塞: 5 | P1 重要: 68 | P2 一般: 40 | P3 提示: 0

## 维度成绩 (13 维度横向)

| 维度 | 通过 | 失败 | 异常 | 跳过 |
|---|---|---|---|---|
| 1. 正常参数 | 67 | 1 | 0 | 0 |
| 2. 异常参数 | 68 | 44 | 0 | 0 |
| 3. 空参数 | 0 | 0 | 0 | 0 |
| 4. 超长 | 0 | 0 | 0 | 0 |
| 5. SQL 注入 | 0 | 0 | 0 | 0 |
| 6. XSS | 0 | 0 | 0 | 0 |
| 7. 重复请求 | 0 | 0 | 0 | 0 |
| 8. 并发请求 | 0 | 0 | 0 | 0 |
| 9. 权限 bypass | 80 | 0 | 0 | 0 |
| 10. Token 过期 | 0 | 0 | 0 | 0 |
| 11. Token 空 | 0 | 0 | 0 | 0 |
| 12. 返回值统一 | 0 | 0 | 0 | 0 |
| 13. 状态码 | 0 | 0 | 0 | 0 |

## 模块成绩 (按 controller 聚合)

| 模块 | 端点数 | 通过 | 失败 | 异常 |
|---|---|---|---|---|
| posts/:id | 17 | 0 | 17 | 0 |
| resumes/me | 18 | 10 | 8 | 0 |
| notifications/settings | 10 | 4 | 6 | 0 |
| reports | 10 | 4 | 6 | 0 |
| posts/999999999 | 78 | 73 | 5 | 0 |
| devices/register | 6 | 1 | 5 | 0 |
| applications | 6 | 1 | 5 | 0 |
| messages | 6 | 1 | 5 | 0 |
| companies | 6 | 1 | 5 | 0 |
| ai/draft | 24 | 20 | 4 | 0 |
| companies/999999999 | 11 | 7 | 4 | 0 |
| users/999999999 | 5 | 1 | 4 | 0 |
| applications/999999999 | 5 | 1 | 4 | 0 |
| messages/:id | 3 | 0 | 3 | 0 |
| companies/:id | 3 | 0 | 3 | 0 |
| favorites | 10 | 8 | 2 | 0 |
| notifications/:id | 2 | 0 | 2 | 0 |
| reports/:id | 2 | 0 | 2 | 0 |
| posts | 6 | 5 | 1 | 0 |
| upload/image | 4 | 3 | 1 | 0 |
| favorites/count | 4 | 3 | 1 | 0 |
| posts/me | 4 | 3 | 1 | 0 |
| auth/logout | 4 | 3 | 1 | 0 |
| auth/me | 4 | 3 | 1 | 0 |
| users/me | 4 | 3 | 1 | 0 |
| notifications/me | 4 | 3 | 1 | 0 |
| notifications/unread-count | 4 | 3 | 1 | 0 |
| notifications/read-all | 4 | 3 | 1 | 0 |
| applications/me | 4 | 3 | 1 | 0 |
| applications/post-job | 4 | 3 | 1 | 0 |
| messages/inbox | 4 | 3 | 1 | 0 |
| messages/outbox | 4 | 3 | 1 | 0 |
| messages/with | 4 | 3 | 1 | 0 |
| messages/unread-count | 4 | 3 | 1 | 0 |
| messages/read-all | 4 | 3 | 1 | 0 |
| favorites/:postId | 1 | 0 | 1 | 0 |
| posts/:postId | 1 | 0 | 1 | 0 |
| comments/:id | 1 | 0 | 1 | 0 |
| users/:id | 1 | 0 | 1 | 0 |
| devices/:token | 1 | 0 | 1 | 0 |
| applications/:id | 1 | 0 | 1 | 0 |
| messages/999999999 | 9 | 9 | 0 | 0 |
| notifications/999999999 | 6 | 6 | 0 | 0 |
| reports/999999999 | 6 | 6 | 0 | 0 |
| favorites/999999999 | 3 | 3 | 0 | 0 |
| comments/999999999 | 3 | 3 | 0 | 0 |
| devices/fake-device-token | 3 | 3 | 0 | 0 |

## 失败清单 (按严重度排序)

### [P1] POST /upload/image — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /posts/:id/house — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/:id/house — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /posts/:id/house — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /posts/:id/secondhand — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/:id/secondhand — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /posts/:id/secondhand — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /posts/:id/lifebiz — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/:id/lifebiz — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /posts/:id/lifebiz — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /posts/:id/job — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/:id/job — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /posts/:id/job — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /favorites — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /favorites/count — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /favorites — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /favorites/:postId — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /posts/:postId/comments — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /comments/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /ai/draft/extract — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /ai/draft/suggest-title — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /ai/draft/score — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /ai/draft/rewrite — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts/:id/boost — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] GET /posts/me — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /posts/:id/contact — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] PATCH /posts/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts/:id/status — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /posts/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /auth/logout — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /auth/me — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /users/me — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] PATCH /users/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] GET /notifications/me — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /notifications/unread-count — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /notifications/:id/read — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /notifications/read-all — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] DELETE /notifications/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /notifications/settings — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] PUT /notifications/settings/:event — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /devices/register — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /devices/:token — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /applications/me — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /applications/post-job/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /applications — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /applications/:id/status — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /messages — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] GET /messages/inbox — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /messages/outbox — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /messages/with/:userId — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /messages/unread-count — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /messages/read-all — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /messages/:id/read — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /messages/:id/recall — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] DELETE /messages/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /reports — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] GET /reports — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /reports/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] DELETE /reports/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /companies — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /companies/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /companies/:id — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /companies/:id/restore — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] GET /resumes/me — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] PUT /resumes/me — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] DELETE /resumes/me — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P1] POST /resumes/me/restore — dim0: 测试器异常
- 期望: "execute" | 实际: 0
- 备注: JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)

### [P2] PATCH /users/999999999 — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /users/999999999 — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /users/999999999 — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /users/999999999 — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PUT /notifications/settings/system — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PUT /notifications/settings/system — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PUT /notifications/settings/system — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PUT /notifications/settings/system — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /devices/register — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /devices/register — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /devices/register — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /devices/register — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /applications — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /applications — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /applications — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /applications — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /applications/999999999/status — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /applications/999999999/status — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /applications/999999999/status — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /applications/999999999/status — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /messages — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /messages — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /messages — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /messages — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /reports — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /reports — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /reports — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /reports — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /companies — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /companies — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /companies — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] POST /companies — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /companies/999999999 — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /companies/999999999 — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /companies/999999999 — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PATCH /companies/999999999 — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PUT /resumes/me — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PUT /resumes/me — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PUT /resumes/me — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P2] PUT /resumes/me — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 401
- 备注: expected 4xx, got 401

### [P0] POST /posts/999999999/boost — dim1: 正常参数
- 期望: [200,201,204,400,401,403,404,409] | 实际: 503
- 备注: server bug: 5xx on input

### [P0] POST /posts/999999999/boost — dim2: 异常类型 (page[])
- 期望: "4xx" | 实际: 503
- 备注: 5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err

### [P0] POST /posts/999999999/boost — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx" | 实际: 503
- 备注: 5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err

### [P0] POST /posts/999999999/boost — dim2: 异常类型 (createdAt)
- 期望: "4xx" | 实际: 503
- 备注: 5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err

### [P0] POST /posts/999999999/boost — dim2: 异常类型 (page)
- 期望: "4xx" | 实际: 503
- 备注: 5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err

