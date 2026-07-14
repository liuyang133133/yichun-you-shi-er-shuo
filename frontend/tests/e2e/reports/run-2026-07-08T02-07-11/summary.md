# 后端 API 安全审计 (L2) — 2026-07-08

## TL;DR
- ✅ 通过 1811 / ❌ 失败 121 / ⚠️ 异常 124 / ⏸ 跳过 0  / 总 2056
- 用时 0m15s
- P0 阻塞: 93 | P1 重要: 28 | P2 一般: 28 | P3 提示: 96

## 维度成绩 (13 维度横向)

| 维度 | 通过 | 失败 | 异常 | 跳过 |
|---|---|---|---|---|
| 1. 正常参数 | 67 | 1 | 0 | 0 |
| 2. 异常参数 | 108 | 4 | 0 | 0 |
| 3. 空参数 | 108 | 4 | 0 | 0 |
| 4. 超长 | 84 | 84 | 0 | 0 |
| 5. SQL 注入 | 280 | 0 | 0 | 0 |
| 6. XSS | 280 | 0 | 0 | 0 |
| 7. 重复请求 | 0 | 0 | 28 | 0 |
| 8. 并发请求 | 0 | 0 | 28 | 0 |
| 9. 权限 bypass | 340 | 0 | 0 | 0 |
| 10. Token 过期 | 68 | 0 | 0 | 0 |
| 11. Token 空 | 408 | 0 | 68 | 0 |
| 12. 返回值统一 | 68 | 0 | 0 | 0 |
| 13. 状态码 | 0 | 0 | 0 | 0 |

## 模块成绩 (按 controller 聚合)

| 模块 | 端点数 | 通过 | 失败 | 异常 |
|---|---|---|---|---|
| posts/999999999 | 714 | 615 | 57 | 42 |
| ai/draft | 208 | 180 | 16 | 12 |
| resumes/me | 97 | 87 | 4 | 6 |
| companies/999999999 | 82 | 73 | 4 | 5 |
| favorites | 67 | 59 | 4 | 4 |
| notifications/settings | 67 | 59 | 4 | 4 |
| reports | 67 | 59 | 4 | 4 |
| posts | 52 | 45 | 4 | 3 |
| users/999999999 | 52 | 45 | 4 | 3 |
| devices/register | 52 | 45 | 4 | 3 |
| applications | 52 | 45 | 4 | 3 |
| applications/999999999 | 52 | 45 | 4 | 3 |
| messages | 52 | 45 | 4 | 3 |
| companies | 52 | 45 | 4 | 3 |
| messages/999999999 | 45 | 42 | 0 | 3 |
| notifications/999999999 | 30 | 28 | 0 | 2 |
| reports/999999999 | 30 | 28 | 0 | 2 |
| upload/image | 15 | 14 | 0 | 1 |
| favorites/count | 15 | 14 | 0 | 1 |
| favorites/999999999 | 15 | 14 | 0 | 1 |
| comments/999999999 | 15 | 14 | 0 | 1 |
| posts/me | 15 | 14 | 0 | 1 |
| auth/logout | 15 | 14 | 0 | 1 |
| auth/me | 15 | 14 | 0 | 1 |
| users/me | 15 | 14 | 0 | 1 |
| notifications/me | 15 | 14 | 0 | 1 |
| notifications/unread-count | 15 | 14 | 0 | 1 |
| notifications/read-all | 15 | 14 | 0 | 1 |
| devices/fake-device-token | 15 | 14 | 0 | 1 |
| applications/me | 15 | 14 | 0 | 1 |
| applications/post-job | 15 | 14 | 0 | 1 |
| messages/inbox | 15 | 14 | 0 | 1 |
| messages/outbox | 15 | 14 | 0 | 1 |
| messages/with | 15 | 14 | 0 | 1 |
| messages/unread-count | 15 | 14 | 0 | 1 |
| messages/read-all | 15 | 14 | 0 | 1 |

## 失败清单 (按严重度排序)

### [P1] POST /posts/999999999/house — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/999999999/house — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts/999999999/secondhand — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/999999999/secondhand — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts/999999999/lifebiz — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/999999999/lifebiz — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts/999999999/job — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/999999999/job — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /favorites — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts/999999999/comments — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /ai/draft/extract — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /ai/draft/suggest-title — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /ai/draft/score — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /ai/draft/rewrite — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts/999999999/boost — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /posts/999999999 — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /posts/999999999/status — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /users/999999999 — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PUT /notifications/settings/system — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /devices/register — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /applications — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /applications/999999999/status — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /messages — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /reports — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] POST /companies — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PATCH /companies/999999999 — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P1] PUT /resumes/me — dim0: dim runner error
- 期望: "execute" | 实际: 0
- 备注: Cannot convert undefined or null to object

### [P2] POST /posts/999999999/house — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 28ms

### [P2] PATCH /posts/999999999/house — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 19ms

### [P2] POST /posts/999999999/secondhand — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 18ms

### [P2] PATCH /posts/999999999/secondhand — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 14ms

### [P2] POST /posts/999999999/lifebiz — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 18ms

### [P2] PATCH /posts/999999999/lifebiz — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 19ms

### [P2] POST /posts/999999999/job — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 15ms

### [P2] PATCH /posts/999999999/job — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 17ms

### [P2] POST /favorites — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 13ms

### [P2] POST /posts/999999999/comments — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 24ms

### [P2] POST /ai/draft/extract — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 15ms

### [P2] POST /ai/draft/suggest-title — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 12ms

### [P2] POST /ai/draft/score — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 13ms

### [P2] POST /ai/draft/rewrite — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 12ms

### [P2] POST /posts/999999999/boost — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 14ms

### [P2] POST /posts — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 13ms

### [P2] PATCH /posts/999999999 — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 14ms

### [P2] POST /posts/999999999/status — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 429:5
- 备注: elapsed 17ms

### [P2] PATCH /users/999999999 — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 17ms

### [P2] PUT /notifications/settings/system — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 15ms

### [P2] POST /devices/register — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 14ms

### [P2] POST /applications — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 11ms

### [P2] PATCH /applications/999999999/status — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 15ms

### [P2] POST /messages — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 13ms

### [P2] POST /reports — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 16ms

### [P2] POST /companies — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 16ms

### [P2] PATCH /companies/999999999 — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 13ms

### [P2] PUT /resumes/me — dim8: 并发 N=5
- 期望: "200/201 + no 5xx" | 实际: 401:5
- 备注: elapsed 14ms

### [P3] POST /upload/image — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /posts/999999999/house — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /posts/999999999/house — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PATCH /posts/999999999/house — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] PATCH /posts/999999999/house — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /posts/999999999/house — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /posts/999999999/secondhand — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /posts/999999999/secondhand — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PATCH /posts/999999999/secondhand — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] PATCH /posts/999999999/secondhand — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /posts/999999999/secondhand — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /posts/999999999/lifebiz — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /posts/999999999/lifebiz — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PATCH /posts/999999999/lifebiz — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] PATCH /posts/999999999/lifebiz — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /posts/999999999/lifebiz — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /posts/999999999/job — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /posts/999999999/job — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PATCH /posts/999999999/job — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] PATCH /posts/999999999/job — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /posts/999999999/job — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /favorites — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /favorites/count — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /favorites — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /favorites — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /favorites/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /posts/999999999/comments — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /posts/999999999/comments — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /comments/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /ai/draft/extract — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /ai/draft/extract — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /ai/draft/suggest-title — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /ai/draft/suggest-title — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /ai/draft/score — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /ai/draft/score — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /ai/draft/rewrite — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /ai/draft/rewrite — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /posts/999999999/boost — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /posts/999999999/boost — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /posts — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /posts — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /posts/me — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /posts/999999999/contact — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PATCH /posts/999999999 — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] PATCH /posts/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /posts/999999999/status — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 429,429,429

### [P3] POST /posts/999999999/status — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /posts/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /auth/logout — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /auth/me — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /users/me — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PATCH /users/999999999 — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] PATCH /users/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /notifications/me — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /notifications/unread-count — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /notifications/999999999/read — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /notifications/read-all — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /notifications/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /notifications/settings — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PUT /notifications/settings/system — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] PUT /notifications/settings/system — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /devices/register — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] POST /devices/register — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /devices/fake-device-token — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /applications/me — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /applications/post-job/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /applications — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] POST /applications — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PATCH /applications/999999999/status — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] PATCH /applications/999999999/status — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /messages — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] POST /messages — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /messages/inbox — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /messages/outbox — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /messages/with/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /messages/unread-count — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /messages/read-all — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /messages/999999999/read — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /messages/999999999/recall — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /messages/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /reports — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] POST /reports — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /reports — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /reports/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /reports/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /companies — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] POST /companies — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PATCH /companies/999999999 — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] PATCH /companies/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /companies/999999999 — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /companies/999999999/restore — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] GET /resumes/me — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] PUT /resumes/me — dim7: 重复 x3
- 期望: "201 + 409 or all-OK idempotent" | 实际: 401,401,401

### [P3] PUT /resumes/me — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] DELETE /resumes/me — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P3] POST /resumes/me/restore — dim11: Token 空 header ({"rawToken":"\nfake"})
- 期望: 401 | 实际: 0

### [P0] POST /posts/999999999/house — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/house — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/house — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/house — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/house — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/house — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/secondhand — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/secondhand — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/secondhand — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/secondhand — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/secondhand — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/secondhand — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/lifebiz — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/lifebiz — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/lifebiz — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/lifebiz — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/lifebiz — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/lifebiz — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/job — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/job — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/job — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/job — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/job — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999/job — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /favorites — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /favorites — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /favorites — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/comments — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/comments — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/comments — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/extract — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/extract — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/extract — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/suggest-title — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/suggest-title — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/suggest-title — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/score — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/score — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/score — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/rewrite — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/rewrite — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /ai/draft/rewrite — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/boost — dim1: 正常参数
- 期望: [200,201,204,400,401,403,404,409] | 实际: 503
- 备注: server bug: 5xx on input

### [P0] POST /posts/999999999/boost — dim2: 异常类型 (page[])
- 期望: "4xx (含 401/403 auth 拦截)" | 实际: 503
- 备注: 5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err

### [P0] POST /posts/999999999/boost — dim2: 异常类型 (status,auditStatus)
- 期望: "4xx (含 401/403 auth 拦截)" | 实际: 503
- 备注: 5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err

### [P0] POST /posts/999999999/boost — dim2: 异常类型 (createdAt)
- 期望: "4xx (含 401/403 auth 拦截)" | 实际: 503
- 备注: 5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err

### [P0] POST /posts/999999999/boost — dim2: 异常类型 (page)
- 期望: "4xx (含 401/403 auth 拦截)" | 实际: 503
- 备注: 5xx on invalid body: {"code":503,"message":"加急置顶功能即将上线, 请期待","data":null,"error":"Internal Server Err

### [P0] POST /posts/999999999/boost — dim3: 空/缺失 ()
- 期望: "4xx (含 401/403)" | 实际: 503
- 备注: 503

### [P0] POST /posts/999999999/boost — dim3: 空/缺失 ()
- 期望: "4xx (含 401/403)" | 实际: 503
- 备注: 503

### [P0] POST /posts/999999999/boost — dim3: 空/缺失 ()
- 期望: "4xx (含 401/403)" | 实际: 503
- 备注: 503

### [P0] POST /posts/999999999/boost — dim3: 空/缺失 (   )
- 期望: "4xx (含 401/403)" | 实际: 503
- 备注: 503

### [P0] POST /posts/999999999/boost — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/boost — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/boost — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999 — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999 — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /posts/999999999 — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/status — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/status — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /posts/999999999/status — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /users/999999999 — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /users/999999999 — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /users/999999999 — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PUT /notifications/settings/system — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PUT /notifications/settings/system — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PUT /notifications/settings/system — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /devices/register — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /devices/register — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /devices/register — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /applications — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /applications — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /applications — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /applications/999999999/status — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /applications/999999999/status — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /applications/999999999/status — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /messages — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /messages — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /messages — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /reports — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /reports — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /reports — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /companies — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /companies — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] POST /companies — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /companies/999999999 — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /companies/999999999 — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PATCH /companies/999999999 — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PUT /resumes/me — dim4: 超长 (hugeString)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PUT /resumes/me — dim4: 超长 (hugeDescription)
- 期望: "4xx (不 OOM)" | 实际: 500

### [P0] PUT /resumes/me — dim4: 超长 (longBase64)
- 期望: "4xx (不 OOM)" | 实际: 500

