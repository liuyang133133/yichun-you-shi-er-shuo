# 后端 API 安全审计 (L1) — 2026-07-08

## TL;DR
- ✅ 通过 67 / ❌ 失败 1 / ⚠️ 异常 0 / ⏸ 跳过 0  / 总 68
- 用时 0m3s
- P0 阻塞: 1 | P1 重要: 0 | P2 一般: 0 | P3 提示: 0

## 维度成绩 (13 维度横向)

| 维度 | 通过 | 失败 | 异常 | 跳过 |
|---|---|---|---|---|
| 1. 正常参数 | 67 | 1 | 0 | 0 |
| 2. 异常参数 | 0 | 0 | 0 | 0 |
| 3. 空参数 | 0 | 0 | 0 | 0 |
| 4. 超长 | 0 | 0 | 0 | 0 |
| 5. SQL 注入 | 0 | 0 | 0 | 0 |
| 6. XSS | 0 | 0 | 0 | 0 |
| 7. 重复请求 | 0 | 0 | 0 | 0 |
| 8. 并发请求 | 0 | 0 | 0 | 0 |
| 9. 权限 bypass | 0 | 0 | 0 | 0 |
| 10. Token 过期 | 0 | 0 | 0 | 0 |
| 11. Token 空 | 0 | 0 | 0 | 0 |
| 12. 返回值统一 | 0 | 0 | 0 | 0 |
| 13. 状态码 | 0 | 0 | 0 | 0 |

## 模块成绩 (按 controller 聚合)

| 模块 | 端点数 | 通过 | 失败 | 异常 |
|---|---|---|---|---|
| posts/999999999 | 18 | 17 | 1 | 0 |
| ai/draft | 4 | 4 | 0 | 0 |
| resumes/me | 4 | 4 | 0 | 0 |
| messages/999999999 | 3 | 3 | 0 | 0 |
| companies/999999999 | 3 | 3 | 0 | 0 |
| favorites | 2 | 2 | 0 | 0 |
| notifications/999999999 | 2 | 2 | 0 | 0 |
| notifications/settings | 2 | 2 | 0 | 0 |
| reports | 2 | 2 | 0 | 0 |
| reports/999999999 | 2 | 2 | 0 | 0 |
| upload/image | 1 | 1 | 0 | 0 |
| favorites/count | 1 | 1 | 0 | 0 |
| favorites/999999999 | 1 | 1 | 0 | 0 |
| comments/999999999 | 1 | 1 | 0 | 0 |
| posts | 1 | 1 | 0 | 0 |
| posts/me | 1 | 1 | 0 | 0 |
| auth/logout | 1 | 1 | 0 | 0 |
| auth/me | 1 | 1 | 0 | 0 |
| users/me | 1 | 1 | 0 | 0 |
| users/999999999 | 1 | 1 | 0 | 0 |
| notifications/me | 1 | 1 | 0 | 0 |
| notifications/unread-count | 1 | 1 | 0 | 0 |
| notifications/read-all | 1 | 1 | 0 | 0 |
| devices/register | 1 | 1 | 0 | 0 |
| devices/fake-device-token | 1 | 1 | 0 | 0 |
| applications/me | 1 | 1 | 0 | 0 |
| applications/post-job | 1 | 1 | 0 | 0 |
| applications | 1 | 1 | 0 | 0 |
| applications/999999999 | 1 | 1 | 0 | 0 |
| messages | 1 | 1 | 0 | 0 |
| messages/inbox | 1 | 1 | 0 | 0 |
| messages/outbox | 1 | 1 | 0 | 0 |
| messages/with | 1 | 1 | 0 | 0 |
| messages/unread-count | 1 | 1 | 0 | 0 |
| messages/read-all | 1 | 1 | 0 | 0 |
| companies | 1 | 1 | 0 | 0 |

## 失败清单 (按严重度排序)

### [P0] POST /posts/999999999/boost — dim1: 正常参数
- 期望: [200,201,204,400,401,403,404,409] | 实际: 503
- 备注: server bug: 5xx on input

