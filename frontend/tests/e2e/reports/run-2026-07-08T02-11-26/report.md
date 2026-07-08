# API 安全审计详细报告 (L3)

## GET /auth/me (14/15)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim9 权限 bypass: 过期 token: **PASS**
- dim9 权限 bypass: 错签名 token: **PASS**
- dim9 权限 bypass: alg=none: **PASS**
- dim10 Token 过期: **PASS**
- dim11 Token 空 header ({"rawToken":""}): **PASS**
- dim11 Token 空 header ({"rawToken":"null"}): **PASS**
- dim11 Token 空 header ({"rawToken":"undefined"}): **PASS**
- dim11 Token 空 header ({"rawToken":" "}): **PASS**
- dim11 Token 空 header ({"rawToken":" fake"}): **PASS**
- dim11 Token 空 header ({"rawToken":"fake "}): **PASS**
- dim11 Token 空 header ({"rawToken":"\nfake"}): **ISSUE** — 期望 401, 实际 0 [P3]
- dim12 响应统一: **PASS**

## POST /auth/logout (14/15)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim9 权限 bypass: 过期 token: **PASS**
- dim9 权限 bypass: 错签名 token: **PASS**
- dim9 权限 bypass: alg=none: **PASS**
- dim10 Token 过期: **PASS**
- dim11 Token 空 header ({"rawToken":""}): **PASS**
- dim11 Token 空 header ({"rawToken":"null"}): **PASS**
- dim11 Token 空 header ({"rawToken":"undefined"}): **PASS**
- dim11 Token 空 header ({"rawToken":" "}): **PASS**
- dim11 Token 空 header ({"rawToken":" fake"}): **PASS**
- dim11 Token 空 header ({"rawToken":"fake "}): **PASS**
- dim11 Token 空 header ({"rawToken":"\nfake"}): **ISSUE** — 期望 401, 实际 0 [P3]
- dim12 响应统一: **PASS**

## POST /upload/image (14/15)

- dim1 正常参数: **PASS**
- dim9 权限 bypass: 空 token: **PASS**
- dim9 权限 bypass: null token: **PASS**
- dim9 权限 bypass: 过期 token: **PASS**
- dim9 权限 bypass: 错签名 token: **PASS**
- dim9 权限 bypass: alg=none: **PASS**
- dim10 Token 过期: **PASS**
- dim11 Token 空 header ({"rawToken":""}): **PASS**
- dim11 Token 空 header ({"rawToken":"null"}): **PASS**
- dim11 Token 空 header ({"rawToken":"undefined"}): **PASS**
- dim11 Token 空 header ({"rawToken":" "}): **PASS**
- dim11 Token 空 header ({"rawToken":" fake"}): **PASS**
- dim11 Token 空 header ({"rawToken":"fake "}): **PASS**
- dim11 Token 空 header ({"rawToken":"\nfake"}): **ISSUE** — 期望 401, 实际 0 [P3]
- dim12 响应统一: **PASS**

