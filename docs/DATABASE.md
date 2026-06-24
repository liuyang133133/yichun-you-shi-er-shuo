# DATABASE 数据库设计文档

> **项目**：伊春有事儿说
> **DBMS**：MySQL 8.0
> **ORM**：Prisma 5
> **维护人**：Hermes（PM）
> **最后更新**：2026-06-15
> **源文件**：[`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)

---

## 1. 总览

- **17 个 Model**（13 业务核心 + 4 运营/日志）
- **14 个 Prisma 迁移**已应用到 `mysql_data` Docker 卷
- **2 个 MySQL FULLTEXT 索引**（`posts.title`、`posts.description`）—— Prisma 不支持，由 SQL 单独添加
- **主键策略**：所有表 `BigInt AUTO_INCREMENT`
- **时间字段**：DB 存 UTC+8（DATETIME），前端通过 `Intl.DateTimeFormat` 统一展示（Asia/Shanghai）
- **字符集**：utf8mb4

---

## 2. ER 图（核心）

```
┌────────┐
│  User  │──┬── Post ──┬── PostHouse (1:1)
│        │  │          ├── PostSecondhand (1:1)
│        │  │          ├── PostJob (1:1) ── Company (N:1)
│        │  │          ├── PostLifebiz (1:1)
│        │  │          ├── PostImage (1:N, V1 预留)
│        │  │          ├── Comment (1:N, 树形)
│        │  │          ├── Favorite (1:N)
│        │  │          ├── Report (1:N)
│        │  │          └── ViewLog (1:N, anon ok)
│        │  ├── Company (1:N) ── PostJob
│        │  ├── Resume (1:1) ── JobApplication
│        │  ├── JobApplication (1:N)
│        │  ├── Message (1:N, 双向: 收/发)
│        │  ├── AuditLog (1:N, 仅 admin)
│        │  └── LoginLog (1:N)
└────────┘

┌──────────┐    ┌──────────┐
│ Category │    │   Area   │    (字典，自关联树形)
│ (4+25)   │    │ (1+12+15)│
└────┬─────┘    └────┬─────┘
     │               │
     └───── Post ────┘
```

---

## 3. 表结构详解

### 3.1 users（用户）

| 字段 | 类型 | 索引 | 说明 |
|---|---|---|---|
| id | BigInt PK | | |
| phone | VarChar(20) | UNIQUE | 手机号，`/^1[3-9]\d{9}$/` |
| password | VarChar(100)? | | bcrypt |
| nickname | VarChar(50) | | 默认 "" |
| avatar | VarChar(255)? | | 头像 URL |
| gender | TinyInt | | 0未知/1男/2女 |
| bio | VarChar(255)? | | 简介 |
| **status** | TinyInt | `(status, createdAt)`、`(role, status)` | **0 正常 / 1 封禁 / 2 软删**（Sprint 1 SHOULD-16）|
| **role** | VarChar(20) | | `user` / `admin`（Sprint 4 修 buildTokenPair 硬编码 bug）|
| lastLoginAt | DateTime? | | |
| createdAt | DateTime | | |
| updatedAt | DateTime | | |

**安全约束**：
- 写接口（POST/PATCH/DELETE）需要 `isSelf || isAdmin` 校验（MUST-2 后改 F-6）
- phone 字段在管理接口脱敏
- 自动注册场景 (login-sms) 无 password 字段

---

### 3.2 posts（信息主表 — 4 大模块共用）

| 字段 | 类型 | 索引 | 说明 |
|---|---|---|---|
| id | BigInt PK | | |
| userId | BigInt FK→users | `userId` | |
| categoryId | BigInt FK→categories | `(categoryId, status, createdAt)` | |
| areaId | BigInt? FK→areas | `(areaId, status, createdAt)` | |
| **type** | VarChar(20) | `(type, status, createdAt)` | `house` / `secondhand` / `job` / `lifebiz` |
| title | VarChar(100) | `(title)` + FULLTEXT | |
| description | Text | FULLTEXT | |
| price | Decimal(10,2) | | 默认 0 |
| priceUnit | VarChar(20)? | | 元/月、万、议价 |
| contactName | VarChar(50)? | | |
| contactPhone | VarChar(20)? | | |
| contactWechat | VarChar(50)? | | |
| **status** | VarChar(20) | | `draft` / `pending` / `active` / `sold` / `expired` / `deleted` / `rejected` |
| **auditStatus** | VarChar(20) | `(auditStatus, createdAt)` | `pending` / `passed` / `rejected` |
| auditReason | VarChar(255)? | | 驳回理由 |
| viewCount | Int | | 默认 0（SHOULD-3 加防刷）|
| favoriteCount | Int | | 默认 0 |
| commentCount | Int | | 默认 0 |
| createdAt | DateTime | | |
| updatedAt | DateTime | | |

**FULLTEXT 索引**（手工 SQL 添加）：
```sql
ALTER TABLE posts ADD FULLTEXT INDEX posts_title_ft (title);
ALTER TABLE posts ADD FULLTEXT INDEX posts_description_ft (description);
```
⚠️ **Prisma drift 风险**：每次 `prisma migrate dev` 会 drop 未在 schema 声明的 FULLTEXT 索引，详见 [project-memory §10.6 R-4](./project-memory.md)。

---

### 3.3 posts 详情表（1:1，4 张）

#### 3.3.1 post_houses（房屋）

| 字段 | 说明 |
|---|---|
| postId | UNIQUE FK→posts |
| rentalType | 整租/合租 |
| propertyType | 公寓/住宅/别墅... |
| decoration | 毛坯/简装/精装/豪装 |
| areaSqm | Decimal(8,2) |
| rooms / livingRooms / bathrooms | TinyInt |
| floorInfo | "5/18层" |
| orientation | 朝向 |
| buildingYear | Int |
| communityName | 小区名 |
| address | 详细地址 |
| longitude / latitude | Decimal(10,6) — V2 地图用 |
| **facilities** | **Json** — 家具家电数组 |

**索引**：`rentalType` / `propertyType` / `areaSqm` / 组合 `(rentalType, propertyType, areaSqm)`（SHOULD-32）

#### 3.3.2 post_secondhands（二手）

| 字段 | 说明 |
|---|---|
| postId | UNIQUE FK |
| categoryName | 手机数码/家电/家具... |
| condition | 全新/9成新/8成新... |
| originalPrice | Decimal(10,2)? |
| tradeMethod | 上门/快递/同城 |
| usageDuration | 用多久 |

**索引**：`categoryName` / `condition`

#### 3.3.3 post_jobs（招聘）

| 字段 | 说明 |
|---|---|
| postId | UNIQUE FK |
| **companyId** | FK→companies（Restrict，不允许删有职位的公司）|
| jobType | 全职/兼职/实习 |
| salaryMin / salaryMax / salaryUnit | Decimal + 月/时/日 |
| education | 学历要求 |
| experience | 经验要求 |
| industry | 行业 |
| **welfare** | **Json** — 福利数组（五险一金、餐补...）|
| recruitCount | Int 默认 1 |
| workCity / workAddress | |

**索引**：`companyId` / `(salaryMin, salaryMax)`（SHOULD-33）

#### 3.3.4 post_lifebizs（便民）

| 字段 | 说明 |
|---|---|
| postId | UNIQUE FK |
| subCategory | 子类目 |
| serviceType | 提供/需求 |
| price / priceText | Decimal 或自由文本 |
| validityPeriod | 1天/1周/1月/长期 |
| **expireAt** | DateTime? — **SHOULD-15 cron 30 天硬清的依据** |

**索引**：`subCategory` / `serviceType` / `expireAt`（SHOULD-35）

---

### 3.4 字典表（自关联树形）

#### 3.4.1 categories

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| parentId | `(parentId, sortOrder)` | 自关联，NoAction |
| code | `(code)` | 顶级 4 个：house/secondhand/job/lifebiz |
| name | | 分类名 |
| icon | | 图标 URL |
| sortOrder | | |
| status | | 1启用/0禁用 |

**seed**：4 顶级 + 25 子分类

#### 3.4.2 areas

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| parentId | `(parentId, sortOrder)` | 自关联 |
| name | | |
| level | | 1市/2区县/3街道 |
| adCode | `(adCode)` | 行政区划代码 |
| sortOrder | | |

**seed**：1 市（伊春市）+ 12 区县 + 15 街道

---

### 3.5 互动表

#### 3.5.1 post_images（V1 预留，1:N）

| 字段 | 说明 |
|---|---|
| postId | FK→posts Cascade |
| url | VarChar(500) |
| width / height | Int? |
| size | Int? |
| mimeType | VarChar(50) |
| sortOrder | |
| isCover | TinyInt 0/1 |

**索引**：`(postId, sortOrder)`

**状态**：V1 暂未接入 publish 流程，V1.1 接入

#### 3.5.2 comments（树形）

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| userId | `userId` | |
| postId | `(postId, createdAt)` | |
| parentId | | 自关联，NoAction |
| content | VarChar(500) | |
| status | | 0正常/1删除 |
| createdAt | | |

#### 3.5.3 favorites

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| userId | `(userId, createdAt)` | |
| postId | | |
| createdAt | | |

**约束**：`@@unique([userId, postId])`

#### 3.5.4 reports

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| userId | `userId` | 举报人 |
| postId | `postId` | 被举报信息 |
| reason | VarChar(50) | 违规类型 |
| description | VarChar(500)? | |
| status | `(status, createdAt)` | `pending` / `handled` / `ignored` |
| handledBy | FK→users SetNull | 处理人 |
| handledAt | | |

---

### 3.6 业务支撑表

#### 3.6.1 companies（公司）

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| creatorUserId | `(creatorUserId)` | FK→users Cascade |
| name | `(name)` | |
| logo / industry / scale / nature / address / description | | |
| **verified** | `(verified)` | 0未认证/1已认证（SHOULD-34 索引）|

#### 3.6.2 resumes（简历，1:1 user）

| 字段 | 说明 |
|---|---|
| userId | UNIQUE FK→users |
| name / gender / age | |
| phone | （MUST-8 脱敏）|
| email / education / experience | |
| expectedPosition / expectedSalary / expectedCity | |
| selfIntro / isPublic | 0私有/1公开 |

#### 3.6.3 job_applications（投递记录）

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| postJobId | | FK→post_jobs Cascade |
| resumeId | | FK→resumes Cascade |
| userId | `(userId, createdAt)` | FK→users Cascade |
| coverLetter | VarChar(500)? | |
| status | | 已投递/已查看/已面试/已录用/已拒绝 |

**约束**：`@@unique([postJobId, resumeId])` — 同一简历对同一职位只能投递一次

---

### 3.7 运营/日志表（4 张，Sprint 1-2 加）

#### 3.7.1 messages（站内信，MUST-17）

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| senderId | `(senderId, createdAt)` | FK→users Cascade |
| receiverId | `(receiverId, isRead, createdAt)` | FK→users Cascade |
| content | VarChar(1000) | |
| isRead | | 0未读/1已读 |
| readAt | DateTime? | |

#### 3.7.2 audit_logs（操作审计）

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| adminUserId | `(adminUserId, createdAt)` | FK→users Cascade |
| module | `(module, action, createdAt)` | 业务模块 |
| action | | 操作类型：audit_pass / audit_reject / offline / ban / unban ... |
| targetType | `(targetType, targetId)` | post/user/report/announcement |
| targetId | BigInt? | |
| reason | VarChar(500)? | |
| **metadata** | **Json** | 操作快照 / 前后状态 |
| createdAt | | |

#### 3.7.3 login_logs

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| userId | `(userId, createdAt)` | FK→users Cascade |
| ip | `(ip, createdAt)` | VarChar(45) — 支持 IPv6 |
| userAgent | VarChar(500)? | |
| device | VarChar(100)? | UA 解析 |
| status | | success/fail |
| failReason | VarChar(100)? | |
| createdAt | | |

#### 3.7.4 view_logs（浏览量去重基础）

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| postId | `(postId, createdAt)` | 不建 FK（性能）|
| userId | `(userId, createdAt)` | BigInt? — **未登录可空** |
| ip | `(ip, createdAt)` | |
| userAgent | VarChar(500)? | |
| createdAt | | |

**注意**：userId 不与 User 建反向关系（可空 + 性能）

#### 3.7.5 announcements（公告系统，SHOULD-30）

| 字段 | 索引 | 说明 |
|---|---|---|
| id | PK | |
| title | VarChar(100) | |
| content | Text | |
| status | | 0下线/1上线 |
| priority | | 0普通/1置顶 |
| startsAt / endsAt | `(startsAt, endsAt)` | 上线窗口 |
| createdBy | | admin userId（无 FK，应用层校验）|
| createdAt / updatedAt | | |

**索引**：`(status, priority, createdAt)`

---

## 4. 索引清单（全量）

| 索引名 | 字段 | 备注 |
|---|---|---|
| users_phone_unique | users.phone | UNIQUE |
| users_status_createdAt_idx | users(status, createdAt) | |
| users_role_status_idx | users(role, status) | **SHOULD-32（审计 outdated）** |
| categories_parentId_sortOrder_idx | categories(parentId, sortOrder) | |
| categories_code_idx | categories(code) | |
| posts_userId_idx | posts(userId) | |
| posts_categoryId_status_createdAt_idx | posts(categoryId, status, createdAt) | |
| posts_areaId_status_createdAt_idx | posts(areaId, status, createdAt) | |
| posts_type_status_createdAt_idx | posts(type, status, createdAt) | |
| posts_auditStatus_createdAt_idx | posts(auditStatus, createdAt) | |
| posts_title_idx | posts(title) | |
| **posts_title_ft** | posts(title) | **FULLTEXT, 手工 SQL** |
| **posts_description_ft** | posts(description) | **FULLTEXT, 手工 SQL** |
| areas_parentId_sortOrder_idx | areas(parentId, sortOrder) | |
| areas_adCode_idx | areas(adCode) | |
| post_images_postId_sortOrder_idx | post_images(postId, sortOrder) | |
| favorites_userId_postId_unique | favorites(userId, postId) | UNIQUE |
| favorites_userId_createdAt_idx | favorites(userId, createdAt) | |
| comments_postId_createdAt_idx | comments(postId, createdAt) | |
| comments_userId_idx | comments(userId) | |
| reports_postId_idx | reports(postId) | |
| reports_status_createdAt_idx | reports(status, createdAt) | |
| reports_userId_idx | reports(userId) | |
| post_houses_rentalType_idx | post_houses(rentalType) | |
| post_houses_propertyType_idx | post_houses(propertyType) | |
| post_houses_areaSqm_idx | post_houses(areaSqm) | |
| **post_houses_combo_idx** | post_houses(rentalType, propertyType, areaSqm) | **SHOULD-33** |
| post_secondhands_categoryName_idx | post_secondhands(categoryName) | |
| post_secondhands_condition_idx | post_secondhands(condition) | |
| **post_lifebizs_expireAt_idx** | post_lifebizs(expireAt) | **SHOULD-35, cron 目标** |
| post_lifebizs_subCategory_idx | post_lifebizs(subCategory) | |
| post_lifebizs_serviceType_idx | post_lifebizs(serviceType) | |
| companies_creatorUserId_idx | companies(creatorUserId) | |
| companies_name_idx | companies(name) | |
| **companies_verified_idx** | companies(verified) | **SHOULD-34** |
| post_jobs_companyId_idx | post_jobs(companyId) | |
| post_jobs_salaryMin_salaryMax_idx | post_jobs(salaryMin, salaryMax) | |
| resumes_userId_unique | resumes(userId) | UNIQUE |
| job_applications_postJobId_resumeId_unique | job_applications(postJobId, resumeId) | UNIQUE |
| job_applications_userId_createdAt_idx | job_applications(userId, createdAt) | |
| messages_receiverId_isRead_createdAt_idx | messages(receiverId, isRead, createdAt) | |
| messages_senderId_createdAt_idx | messages(senderId, createdAt) | |
| audit_logs_adminUserId_createdAt_idx | audit_logs(adminUserId, createdAt) | |
| audit_logs_module_action_createdAt_idx | audit_logs(module, action, createdAt) | |
| audit_logs_targetType_targetId_idx | audit_logs(targetType, targetId) | |
| login_logs_userId_createdAt_idx | login_logs(userId, createdAt) | |
| login_logs_ip_createdAt_idx | login_logs(ip, createdAt) | |
| view_logs_postId_createdAt_idx | view_logs(postId, createdAt) | |
| view_logs_userId_createdAt_idx | view_logs(userId, createdAt) | |
| view_logs_ip_createdAt_idx | view_logs(ip, createdAt) | |
| announcements_status_priority_createdAt_idx | announcements(status, priority, createdAt) | |
| announcements_startsAt_endsAt_idx | announcements(startsAt, endsAt) | |

---

## 5. 迁移历史（15 个）

`backend/prisma/migrations/` 目录按时间顺序：

1. `20260609_xxx_init` — users / categories / areas / posts / 4 详情表 / company / resume / application / favorite / comment / report
2-13. 增量调整（具体见目录）
14. `20260611_add_messages_audit_login_view` — Sprint 1-2 增 4 张表 + FULLTEXT 索引
15. `20260624_xxx_add_soft_delete_and_audit_fields` — T-001 18 张业务表 + 4 字段 + 索引

详见 `ls backend/prisma/migrations/` 实际目录。

### 5.1 软删除字段（T-001）

T-001 给 **18 张业务表**（User / Category / Post / Area / PostImage / Favorite / Comment / Report / PostHouse / PostSecondhand / PostLifebiz / Company / PostJob / Resume / JobApplication / Message / Announcement / Banner）统一添加 4 个字段：

| 字段 | 类型 | 用途 |
|---|---|---|
| `deleted_at` | `datetime(3) NULL` | 软删除时间戳；非空 = 已删除 |
| `created_by` | `bigint NULL` | 创建人 user_id（系统初始化为 NULL） |
| `updated_by` | `bigint NULL` | 最后修改人 user_id |
| `deleted_by` | `bigint NULL` | 软删执行人 user_id（purge 硬清时也写） |

配套索引：`@@index([deletedAt])`（按软删状态查询加速）。

**不应用软删的表**（保留物理删除或定时清理）：

- `audit_logs` / `login_logs` / `view_logs` / `ai_usage_logs` / `sitemap_push_logs` — 写多读少的日志表，软删反而增加成本
- `sms_codes` — 验证码有过期时间，无需软删恢复

**Prisma 中间件行为**（见 `backend/src/prisma/prisma.service.ts`）：

- 所有列表类查询（findUnique / findFirst / findMany / count / aggregate / groupBy）自动注入 `where.deletedAt = null`
- `findUnique` 自动改写为 `findFirst`（unique + deletedAt 复合不合法）
- 业务侧显式 `where.deletedAt = ...` 时不被覆盖
- 业务侧显式 `where.includeDeleted = true` 时绕过过滤（中间件会自动删除该字段）
- 模型不在 SOFT_DELETE_MODELS 集合中时，中间件不触发

**恢复流程**：

```
admin → POST /admin/posts/:id/restore → 写 deletedAt=null, deletedBy=null, status='active' + AuditLog
```

**30 天硬清**（不可恢复）：

```
cron → POST /admin/posts/purge { daysOld: 30 } → deleteMany + AuditLog
```

### 5.2 RBAC 表（T-002）

T-002 新增 4 张表，构成完整的 RBAC 数据基础：

| 表 | 字段 | 用途 |
|---|---|---|
| `roles` | code / name / isSystem / sortOrder / status | 角色定义 |
| `permissions` | code / module / action / name | 权限码定义（粒度到具体操作） |
| `user_roles` | userId / roleId / grantedBy / expiresAt | 用户 ↔ 角色 (N:N) |
| `role_permissions` | roleId / permissionId | 角色 ↔ 权限 (N:N) |

**预置数据**（seed）：

- **5 个角色**（`isSystem=true`，不可删）：
  - `super_admin` (32 权限，全部)
  - `content_auditor` (12 权限，post.* + comment.* + report.* + dashboard.view)
  - `customer_service` (7 权限，user.view + comment.* + report.* + dashboard.view)
  - `finance` (2 权限，post.view + dashboard.view)
  - `operator` (9 权限，announcement.* + banner.* + post.view + dashboard.view + aiUsage.view)
- **32 个权限码**（按 12 模块分组）：post(8) / comment(2) / report(2) / user(5) / role(4) / permission(1) / announcement(3) / banner(3) / auditLog(1) / loginLog(1) / aiUsage(1) / dashboard(1)
- **62 条角色-权限关联**

**Prisma 中间件**：Role / Permission / UserRole / RolePermission 加入 `SOFT_DELETE_MODELS` 集合，列表查询自动过滤 `deletedAt: null`。

**PermissionGuard 守卫**：

```typescript
@UseGuards(AdminGuard, PermissionGuard)
@RequirePermission('post.audit.pass')
@Post(':id/audit')
audit() { ... }
```

行为：
1. super_admin → 自动通过
2. 其他用户 → 查 `UserRole → RolePermission → Permission` 链路
3. 任一 role 拥有任一 permission code 即放行
4. 否则 403 ForbiddenException

**兼容期**：`User.role` 字符串字段保留 1 个月，与 `UserRole` 表并存。T-003 阶段统一切换。

---

## 6. Prisma 已知限制（运维注意）

1. **FULLTEXT 不支持** — `migrate dev` 会 drop；后续加 FULLTEXT 必须：
   - 放 `migrate deploy` 之后用独立 raw SQL
   - 不跑 `migrate dev`，否则索引被 drop
2. **BigInt 序列化** — 所有 id 是 BigInt，前端拿到的是 string（后端 `bigIntToString` helper / `TransformInterceptor`），不要再 `parseInt` 失败时回退
3. **Json 字段** — `facilities`、`welfare`、`metadata` 是 Json，Prisma 客户端返回原生 JS 对象

---

## 7. Seed 数据

`backend/prisma/seed.ts` 已完成：

- 4 顶级分类（house/secondhand/job/lifebiz）+ 25 子分类
- 1 测试用户：`phone=13800000000, role=user`
- 4 条示例 post（每个 type 一条）
- 1 市 + 12 区县 + 15 街道

**Admin 账号**：seed 未创建 role=admin 用户，需手动建（生产 checklist）

---

## 8. 后续演进

- **V1.1**：补 0 覆盖单测
- **V1.2**：换 ES 替代 MySQL FULLTEXT
- **V2**：PostGIS / 地理索引（地图找房）
