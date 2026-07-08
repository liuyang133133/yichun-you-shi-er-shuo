# API 安全审计详细报告 (L2)

## DELETE /comments/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /comments/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /companies/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /companies/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /devices/:token (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /devices/fake-device-token (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /favorites/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /favorites/:postId (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /messages/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /messages/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /notifications/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /notifications/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /posts/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /posts/999999999/house (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /posts/999999999/job (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /posts/999999999/lifebiz (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /posts/999999999/secondhand (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /posts/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /posts/:id/house (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /posts/:id/job (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /posts/:id/lifebiz (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /posts/:id/secondhand (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /reports/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## DELETE /reports/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## DELETE /resumes/me (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /applications/me (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /applications/post-job/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## GET /applications/post-job/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /auth/me (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /favorites (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /favorites/count (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /messages/inbox (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /messages/outbox (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /messages/unread-count (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /messages/with/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## GET /messages/with/:userId (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /notifications/me (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /notifications/settings (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /notifications/unread-count (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /posts/999999999/contact (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## GET /posts/:id/contact (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /posts/me (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /reports (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /reports/999999999 (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## GET /reports/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /resumes/me (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## GET /users/me (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## PATCH /applications/999999999/status (1/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)

## PATCH /applications/:id/status (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## PATCH /companies/999999999 (1/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)

## PATCH /companies/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## PATCH /posts/999999999 (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)

## PATCH /posts/999999999/house (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 404)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 404)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 404)
- dim2 异常类型 (page): **PASS** (invalid body → 404)

## PATCH /posts/999999999/job (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 404)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 404)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 404)
- dim2 异常类型 (page): **PASS** (invalid body → 404)

## PATCH /posts/999999999/lifebiz (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 404)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 404)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 404)
- dim2 异常类型 (page): **PASS** (invalid body → 404)

## PATCH /posts/999999999/secondhand (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 404)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 404)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 404)
- dim2 异常类型 (page): **PASS** (invalid body → 404)

## PATCH /posts/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## PATCH /posts/:id/house (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## PATCH /posts/:id/job (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## PATCH /posts/:id/lifebiz (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## PATCH /posts/:id/secondhand (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## PATCH /users/999999999 (1/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)

## PATCH /users/:id (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /ai/draft/extract (5/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /ai/draft/rewrite (5/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /ai/draft/score (5/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /ai/draft/suggest-title (5/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /applications (1/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /auth/logout (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## POST /companies (1/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /companies/999999999/restore (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## POST /companies/:id/restore (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## POST /devices/register (1/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /favorites (5/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /messages (1/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /messages/999999999/read (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## POST /messages/999999999/recall (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## POST /messages/:id/read (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## POST /messages/:id/recall (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## POST /messages/read-all (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## POST /notifications/999999999/read (3/3)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**

## POST /notifications/:id/read (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## POST /notifications/read-all (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## POST /posts (5/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /posts/999999999/boost (0/5)

- dim1 正常参数: **FAIL** — 期望 [200,201,204,400,401,403,404,409], 实际 503 [P0] (server bug: 5xx on input)
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 503 [P0] (5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 503 [P0] (5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 503 [P0] (5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 503 [P0] (5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err)

## POST /posts/999999999/comments (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)

## POST /posts/999999999/house (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)

## POST /posts/999999999/job (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)

## POST /posts/999999999/lifebiz (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)

## POST /posts/999999999/secondhand (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)

## POST /posts/999999999/status (5/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **PASS** (invalid body → 400)
- dim2 异常类型 (status,auditStatus): **PASS** (invalid body → 400)
- dim2 异常类型 (createdAt): **PASS** (invalid body → 400)
- dim2 异常类型 (page): **PASS** (invalid body → 400)

## POST /posts/:id/boost (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /posts/:id/house (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /posts/:id/job (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /posts/:id/lifebiz (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /posts/:id/secondhand (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /posts/:id/status (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /posts/:postId/comments (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /reports (1/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## POST /resumes/me/restore (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## POST /upload/image (3/4)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...))

## PUT /notifications/settings/:event (0/1)

- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

## PUT /notifications/settings/system (1/5)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)

## PUT /resumes/me (1/6)

- dim1 正常参数: **PASS**
- dim2 异常类型 (page[]): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (status,auditStatus): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (createdAt): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim2 异常类型 (page): **FAIL** — 期望 "4xx", 实际 401 [P2] (expected 4xx, got 401)
- dim0 测试器异常: **FAIL** — 期望 "execute", 实际 0 [P1] (Cannot convert undefined or null to object)

