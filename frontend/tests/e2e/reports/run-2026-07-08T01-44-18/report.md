# API 安全审计详细报告 (L1)

## DELETE /admin/announcements/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /admin/banners/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /admin/categories/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /admin/companies/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /admin/notifications/templates/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /admin/roles/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /admin/tags/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /admin/users/999999999/roles/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /categories/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /users/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /admin/ai-usage/stats (1/1)

- dim1 正常参数: **PASS**

## GET /admin/announcements (1/1)

- dim1 正常参数: **PASS**

## GET /admin/audit-logs (1/1)

- dim1 正常参数: **PASS**

## GET /admin/audit-logs/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /admin/audit-logs/export (1/1)

- dim1 正常参数: **PASS**

## GET /admin/audit-logs/options (1/1)

- dim1 正常参数: **PASS**

## GET /admin/banners (1/1)

- dim1 正常参数: **PASS**

## GET /admin/categories (1/1)

- dim1 正常参数: **PASS**

## GET /admin/categories/tree (1/1)

- dim1 正常参数: **PASS**

## GET /admin/companies (1/1)

- dim1 正常参数: **PASS**

## GET /admin/companies/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /admin/dashboard (1/1)

- dim1 正常参数: **PASS**

## GET /admin/login-logs (1/1)

- dim1 正常参数: **PASS**

## GET /admin/login-logs/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /admin/login-logs/abnormal-ips (1/1)

- dim1 正常参数: **PASS**

## GET /admin/login-logs/export (1/1)

- dim1 正常参数: **PASS**

## GET /admin/login-logs/options (1/1)

- dim1 正常参数: **PASS**

## GET /admin/notifications/templates (1/1)

- dim1 正常参数: **PASS**

## GET /admin/notifications/templates/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /admin/permissions (1/1)

- dim1 正常参数: **PASS**

## GET /admin/permissions/modules (1/1)

- dim1 正常参数: **PASS**

## GET /admin/posts (1/1)

- dim1 正常参数: **PASS**

## GET /admin/reports (1/1)

- dim1 正常参数: **PASS**

## GET /admin/roles (1/1)

- dim1 正常参数: **PASS**

## GET /admin/roles/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /admin/roles/999999999/permissions (1/1)

- dim1 正常参数: **PASS**

## GET /admin/tags (1/1)

- dim1 正常参数: **PASS**

## GET /admin/users (1/1)

- dim1 正常参数: **PASS**

## GET /admin/users/999999999/roles (1/1)

- dim1 正常参数: **PASS**

## PATCH /admin/announcements/999999999 (1/1)

- dim1 正常参数: **PASS**

## PATCH /admin/banners/999999999 (1/1)

- dim1 正常参数: **PASS**

## PATCH /admin/categories/999999999 (1/1)

- dim1 正常参数: **PASS**

## PATCH /admin/notifications/templates/999999999 (1/1)

- dim1 正常参数: **PASS**

## PATCH /admin/roles/999999999 (1/1)

- dim1 正常参数: **PASS**

## PATCH /admin/tags/999999999 (1/1)

- dim1 正常参数: **PASS**

## PATCH /categories/999999999 (1/1)

- dim1 正常参数: **PASS**

## POST /admin/ai/regenerate-seo-batch (0/1)

- dim1 正常参数: **FAIL** — 期望 [200,201,204,400,401,403,404,409], 实际 0 [P2] (connection failed)

## POST /admin/ai/regenerate-seo/999999999 (0/1)

- dim1 正常参数: **FAIL** — 期望 [200,201,204,400,401,403,404,409], 实际 500 [P0] (server bug: 5xx on input)

## POST /admin/announcements (1/1)

- dim1 正常参数: **PASS**

## POST /admin/announcements/999999999/restore (1/1)

- dim1 正常参数: **PASS**

## POST /admin/banners (1/1)

- dim1 正常参数: **PASS**

## POST /admin/banners/999999999/restore (1/1)

- dim1 正常参数: **PASS**

## POST /admin/categories (1/1)

- dim1 正常参数: **PASS**

## POST /admin/companies/999999999/restore (1/1)

- dim1 正常参数: **PASS**

## POST /admin/companies/999999999/unverify (1/1)

- dim1 正常参数: **PASS**

## POST /admin/companies/999999999/verify (1/1)

- dim1 正常参数: **PASS**

## POST /admin/notifications/broadcast (1/1)

- dim1 正常参数: **PASS**

## POST /admin/notifications/templates (1/1)

- dim1 正常参数: **PASS**

## POST /admin/notifications/templates/999999999/preview (1/1)

- dim1 正常参数: **PASS**

## POST /admin/notifications/templates/999999999/toggle (1/1)

- dim1 正常参数: **PASS**

## POST /admin/posts/999999999/audit (1/1)

- dim1 正常参数: **PASS**

## POST /admin/posts/999999999/offline (1/1)

- dim1 正常参数: **PASS**

## POST /admin/posts/999999999/restore (1/1)

- dim1 正常参数: **PASS**

## POST /admin/posts/audit-batch (1/1)

- dim1 正常参数: **PASS**

## POST /admin/posts/offline-batch (1/1)

- dim1 正常参数: **PASS**

## POST /admin/posts/purge (1/1)

- dim1 正常参数: **PASS**

## POST /admin/reports/999999999/handle (1/1)

- dim1 正常参数: **PASS**

## POST /admin/roles (1/1)

- dim1 正常参数: **PASS**

## POST /admin/seo/push-baidu (0/1)

- dim1 正常参数: **FAIL** — 期望 [200,201,204,400,401,403,404,409], 实际 500 [P0] (server bug: 5xx on input)

## POST /admin/tags (1/1)

- dim1 正常参数: **PASS**

## POST /admin/tags/999999999/merge (1/1)

- dim1 正常参数: **PASS**

## POST /admin/tags/migrate-from-json (1/1)

- dim1 正常参数: **PASS**

## POST /admin/users/999999999/ban (1/1)

- dim1 正常参数: **PASS**

## POST /admin/users/999999999/roles (1/1)

- dim1 正常参数: **PASS**

## POST /admin/users/999999999/unban (1/1)

- dim1 正常参数: **PASS**

## POST /categories (1/1)

- dim1 正常参数: **PASS**

## POST /users (1/1)

- dim1 正常参数: **PASS**

## PUT /admin/roles/999999999/permissions (1/1)

- dim1 正常参数: **PASS**

