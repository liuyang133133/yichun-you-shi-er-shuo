# API 安全审计详细报告 (L1)

## DELETE /comments/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /companies/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /devices/fake-device-token (1/1)

- dim1 正常参数: **PASS**

## DELETE /favorites/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /messages/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /notifications/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /posts/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /posts/999999999/house (1/1)

- dim1 正常参数: **PASS**

## DELETE /posts/999999999/job (1/1)

- dim1 正常参数: **PASS**

## DELETE /posts/999999999/lifebiz (1/1)

- dim1 正常参数: **PASS**

## DELETE /posts/999999999/secondhand (1/1)

- dim1 正常参数: **PASS**

## DELETE /reports/999999999 (1/1)

- dim1 正常参数: **PASS**

## DELETE /resumes/me (1/1)

- dim1 正常参数: **PASS**

## GET /applications/me (1/1)

- dim1 正常参数: **PASS**

## GET /applications/post-job/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /auth/me (1/1)

- dim1 正常参数: **PASS**

## GET /favorites (1/1)

- dim1 正常参数: **PASS**

## GET /favorites/count (1/1)

- dim1 正常参数: **PASS**

## GET /messages/inbox (1/1)

- dim1 正常参数: **PASS**

## GET /messages/outbox (1/1)

- dim1 正常参数: **PASS**

## GET /messages/unread-count (1/1)

- dim1 正常参数: **PASS**

## GET /messages/with/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /notifications/me (1/1)

- dim1 正常参数: **PASS**

## GET /notifications/settings (1/1)

- dim1 正常参数: **PASS**

## GET /notifications/unread-count (1/1)

- dim1 正常参数: **PASS**

## GET /posts/999999999/contact (1/1)

- dim1 正常参数: **PASS**

## GET /posts/me (1/1)

- dim1 正常参数: **PASS**

## GET /reports (1/1)

- dim1 正常参数: **PASS**

## GET /reports/999999999 (1/1)

- dim1 正常参数: **PASS**

## GET /resumes/me (1/1)

- dim1 正常参数: **PASS**

## GET /users/me (1/1)

- dim1 正常参数: **PASS**

## PATCH /applications/999999999/status (1/1)

- dim1 正常参数: **PASS**

## PATCH /companies/999999999 (1/1)

- dim1 正常参数: **PASS**

## PATCH /posts/999999999 (1/1)

- dim1 正常参数: **PASS**

## PATCH /posts/999999999/house (1/1)

- dim1 正常参数: **PASS**

## PATCH /posts/999999999/job (1/1)

- dim1 正常参数: **PASS**

## PATCH /posts/999999999/lifebiz (1/1)

- dim1 正常参数: **PASS**

## PATCH /posts/999999999/secondhand (1/1)

- dim1 正常参数: **PASS**

## PATCH /users/999999999 (1/1)

- dim1 正常参数: **PASS**

## POST /ai/draft/extract (1/1)

- dim1 正常参数: **PASS**

## POST /ai/draft/rewrite (1/1)

- dim1 正常参数: **PASS**

## POST /ai/draft/score (1/1)

- dim1 正常参数: **PASS**

## POST /ai/draft/suggest-title (1/1)

- dim1 正常参数: **PASS**

## POST /applications (1/1)

- dim1 正常参数: **PASS**

## POST /auth/logout (1/1)

- dim1 正常参数: **PASS**

## POST /companies (1/1)

- dim1 正常参数: **PASS**

## POST /companies/999999999/restore (1/1)

- dim1 正常参数: **PASS**

## POST /devices/register (1/1)

- dim1 正常参数: **PASS**

## POST /favorites (1/1)

- dim1 正常参数: **PASS**

## POST /messages (1/1)

- dim1 正常参数: **PASS**

## POST /messages/999999999/read (1/1)

- dim1 正常参数: **PASS**

## POST /messages/999999999/recall (1/1)

- dim1 正常参数: **PASS**

## POST /messages/read-all (1/1)

- dim1 正常参数: **PASS**

## POST /notifications/999999999/read (1/1)

- dim1 正常参数: **PASS**

## POST /notifications/read-all (1/1)

- dim1 正常参数: **PASS**

## POST /posts (1/1)

- dim1 正常参数: **PASS**

## POST /posts/999999999/boost (0/1)

- dim1 正常参数: **FAIL** — 期望 [200,201,204,400,401,403,404,409], 实际 503 [P0] (server bug: 5xx on input)

## POST /posts/999999999/comments (1/1)

- dim1 正常参数: **PASS**

## POST /posts/999999999/house (1/1)

- dim1 正常参数: **PASS**

## POST /posts/999999999/job (1/1)

- dim1 正常参数: **PASS**

## POST /posts/999999999/lifebiz (1/1)

- dim1 正常参数: **PASS**

## POST /posts/999999999/secondhand (1/1)

- dim1 正常参数: **PASS**

## POST /posts/999999999/status (1/1)

- dim1 正常参数: **PASS**

## POST /reports (1/1)

- dim1 正常参数: **PASS**

## POST /resumes/me/restore (1/1)

- dim1 正常参数: **PASS**

## POST /upload/image (1/1)

- dim1 正常参数: **PASS**

## PUT /notifications/settings/system (1/1)

- dim1 正常参数: **PASS**

## PUT /resumes/me (1/1)

- dim1 正常参数: **PASS**

