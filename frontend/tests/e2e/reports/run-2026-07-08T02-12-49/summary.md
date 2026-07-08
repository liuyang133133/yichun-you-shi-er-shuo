# 后端 API 安全审计 (L1) — 2026-07-08

## TL;DR
- ✅ 通过 195 / ❌ 失败 1 / ⚠️ 异常 0 / ⏸ 跳过 0  / 总 196
- 用时 0m5s
- P0 阻塞: 1 | P1 重要: 0 | P2 一般: 0 | P3 提示: 0

## 维度成绩 (13 维度横向)

| 维度 | 通过 | 失败 | 异常 | 跳过 |
|---|---|---|---|---|
| 1. 正常参数 | 195 | 1 | 0 | 0 |
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
| posts/999999999 | 22 | 21 | 1 | 0 |
| admin/notifications | 8 | 8 | 0 | 0 |
| admin/roles | 7 | 7 | 0 | 0 |
| admin/posts | 7 | 7 | 0 | 0 |
| admin/users | 6 | 6 | 0 | 0 |
| admin/companies | 6 | 6 | 0 | 0 |
| admin/tags | 6 | 6 | 0 | 0 |
| companies/999999999 | 5 | 5 | 0 | 0 |
| admin/categories | 5 | 5 | 0 | 0 |
| admin/login-logs | 5 | 5 | 0 | 0 |
| admin/announcements | 5 | 5 | 0 | 0 |
| admin/banners | 5 | 5 | 0 | 0 |
| ai/draft | 4 | 4 | 0 | 0 |
| resumes/me | 4 | 4 | 0 | 0 |
| admin/audit-logs | 4 | 4 | 0 | 0 |
| users/999999999 | 3 | 3 | 0 | 0 |
| categories/999999999 | 3 | 3 | 0 | 0 |
| messages/999999999 | 3 | 3 | 0 | 0 |
| favorites | 2 | 2 | 0 | 0 |
| posts | 2 | 2 | 0 | 0 |
| users | 2 | 2 | 0 | 0 |
| categories | 2 | 2 | 0 | 0 |
| tags/house | 2 | 2 | 0 | 0 |
| notifications/999999999 | 2 | 2 | 0 | 0 |
| notifications/settings | 2 | 2 | 0 | 0 |
| reports | 2 | 2 | 0 | 0 |
| reports/999999999 | 2 | 2 | 0 | 0 |
| companies | 2 | 2 | 0 | 0 |
| admin/permissions | 2 | 2 | 0 | 0 |
| admin/reports | 2 | 2 | 0 | 0 |
| admin/ai | 2 | 2 | 0 | 0 |
| upload/image | 1 | 1 | 0 | 0 |
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
| favorites/count | 1 | 1 | 0 | 0 |
| favorites/999999999 | 1 | 1 | 0 | 0 |
| comments/999999999 | 1 | 1 | 0 | 0 |
| ai/health | 1 | 1 | 0 | 0 |
| posts/count | 1 | 1 | 0 | 0 |
| posts/me | 1 | 1 | 0 | 0 |
| posts/sitemap-data | 1 | 1 | 0 | 0 |
| auth/sms-code | 1 | 1 | 0 | 0 |
| auth/login-sms | 1 | 1 | 0 | 0 |
| auth/login-password | 1 | 1 | 0 | 0 |
| auth/refresh | 1 | 1 | 0 | 0 |
| auth/logout | 1 | 1 | 0 | 0 |
| auth/me | 1 | 1 | 0 | 0 |
| users/count | 1 | 1 | 0 | 0 |
| users/me | 1 | 1 | 0 | 0 |
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
| reports/reasons | 1 | 1 | 0 | 0 |
| resumes | 1 | 1 | 0 | 0 |
| resumes/999999999 | 1 | 1 | 0 | 0 |
| admin/ai-usage | 1 | 1 | 0 | 0 |
| admin/dashboard | 1 | 1 | 0 | 0 |
| admin/seo | 1 | 1 | 0 | 0 |

## 失败清单 (按严重度排序)

### [P0] POST /posts/999999999/boost — dim1: 正常参数
- 期望: [200,201,204,400,401,403,404,409] | 实际: 503
- 备注: server bug: 5xx on input

