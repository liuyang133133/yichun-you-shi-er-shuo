# 后端 API 安全审计 (L1) — 2026-07-08

## TL;DR
- ✅ 通过 75 / ❌ 失败 3 / ⚠️ 异常 0 / ⏸ 跳过 0  / 总 78
- 用时 0m33s
- P0 阻塞: 2 | P1 重要: 0 | P2 一般: 1 | P3 提示: 0

## 维度成绩 (13 维度横向)

| 维度 | 通过 | 失败 | 异常 | 跳过 |
|---|---|---|---|---|
| 1. 正常参数 | 75 | 3 | 0 | 0 |
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
| admin/ai | 2 | 0 | 2 | 0 |
| admin/seo | 1 | 0 | 1 | 0 |
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
| categories/999999999 | 2 | 2 | 0 | 0 |
| admin/permissions | 2 | 2 | 0 | 0 |
| admin/reports | 2 | 2 | 0 | 0 |
| users | 1 | 1 | 0 | 0 |
| users/999999999 | 1 | 1 | 0 | 0 |
| categories | 1 | 1 | 0 | 0 |
| admin/ai-usage | 1 | 1 | 0 | 0 |
| admin/dashboard | 1 | 1 | 0 | 0 |

## 失败清单 (按严重度排序)

### [P2] POST /admin/ai/regenerate-seo-batch — dim1: 正常参数
- 期望: [200,201,204,400,401,403,404,409] | 实际: 0
- 备注: connection failed

### [P0] POST /admin/ai/regenerate-seo/999999999 — dim1: 正常参数
- 期望: [200,201,204,400,401,403,404,409] | 实际: 500
- 备注: server bug: 5xx on input

### [P0] POST /admin/seo/push-baidu — dim1: 正常参数
- 期望: [200,201,204,400,401,403,404,409] | 实际: 500
- 备注: server bug: 5xx on input

