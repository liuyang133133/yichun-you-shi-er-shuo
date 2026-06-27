# T-019 公告 — 硬删 → 软删修复 + restore

> **任务**：修复 T-016 遗留的 announcement `remove()` 硬删问题
> **分支**：`feature/T-019-fix-announcement-hard-delete`（基于 `main` 重建）
> **状态**：✅ 完成 2026-06-27
> **关联**：T-016 announcement admin / T-001 软删除基础 / T-015 标签 admin 软删参考

---

## Context

### 现状（T-019 启动前）

**后端 announcement 模块**：
- ❌ `service.remove()` 用 `prisma.announcement.delete()` **硬删**（与 T-001 软删规范不一致）
- ❌ 缺 `restore` 方法 + controller 端点
- ❌ `update()` 不写 `updatedBy`（破坏性操作缺审计）
- ❌ DTO `FilterAnnouncementDto` 缺 `includeDeleted` 字段
- ❌ 缺 `announcement.restore` 权限码 + operator 角色绑定
- ✅ schema `Announcement` 已含 `deletedAt / updatedBy / deletedBy`（T-001 已加）
- ✅ T-003 改造完成（`AdminGuard + PermissionGuard + @RequirePermission`）

**后端单测**：
- `announcement.service.spec.ts` T-016 12 用例（#11 + #12 测硬删）
- `findList.spec.ts` T-017 8 用例（公开 list/detail）

**admin UI**：
- ❌ 删除按钮带"硬删警告"条（已知问题）
- ❌ 表格无 `includeDeleted` 复选框
- ❌ 操作列无"恢复"按钮
- ❌ 状态 chip 仅二态（启用/停用），缺"已删"
- ❌ `AdminAnnouncement` interface 缺 `deletedAt`

### 解决方案

**后端**：
1. `remove()` 改用 `prisma.update` 写 `deletedAt / deletedBy / updatedBy`
2. `restore(adminId, id)` 新增（事务双写 update + AuditLog）
3. `update()` 仅 `status/startsAt/endsAt` 变更时写 `updatedBy`
4. `controller` 加 `POST :id/restore` + `@RequirePermission('announcement.restore')`
5. DTO 加 `includeDeleted: string`
6. `seed.ts` 加 `announcement.restore` 权限码 + operator 角色绑定

**admin UI**：
1. 删除"硬删警告"条
2. 顶部加"包含已删除"复选框
3. 状态 chip 三态：启用 / 停用 / **已删除**
4. 操作列：未删显"删除" / 已删显"恢复"
5. 表格加 `deletedAt` 列（仅 includeDeleted=true 时显示）
6. `AdminAnnouncement` interface 加 `deletedAt / deletedBy`

### 不在 T-019 范围（V1.1 / T-020+）

- ❌ `banner.service.remove` 硬删修复（独立任务）
- ❌ banner PermissionGuard 改造
- ❌ 30 天硬清 cron
- ❌ 前端 i18n / Toast 国际化
- ❌ 历史公告批量恢复

---

## 数据流

```
admin 点"删除"公告 → DELETE /api/v1/admin/announcements/:id
  ↓ AnnouncementService.remove(adminId, id)
  ↓ findUnique (deletedAt=null) 预查绕过中间件
  ↓ 不存在 → NotFoundException
  ↓ prisma.announcement.update
  ↓   data: { deletedAt: now(), deletedBy: adminId, updatedBy: adminId }
  ↑ { id: '1', deleted: true }

admin 勾选"包含已删除" → GET /api/v1/admin/announcements?includeDeleted=true
  ↓ AdminAnnouncementController.findAll
  ↓ AnnouncementService.findAll
  ↓ where.deletedAt = undefined（绕过中间件过滤）
  ↑ JSON: 含已软删公告列表

admin 点"恢复" → POST /api/v1/admin/announcements/:id/restore
  ↓ AnnouncementService.restore(adminId, id)
  ↓ findUnique (绕过中间件)
  ↓ 不存在 → NotFoundException
  ↓ deletedAt=null → BadRequestException
  ↓ prisma.$transaction
  ↓   update: { deletedAt: null, deletedBy: null, status: 1, updatedBy: adminId }
  ↓   auditLog.create: { action: 'restore', targetType: 'announcement', targetId: id, reason }
  ↑ { id: '1', restored: true }
```

---

## 关键设计决策

### 1. service.remove 改软删（与 post.offline 规范一致）

```ts
async remove(adminId: bigint, id: bigint) {
  const exists = await this.prisma.announcement.findFirst({
    where: { id, deletedAt: null },
  });
  if (!exists) throw new NotFoundException(`公告 ID ${id} 不存在`);
  await this.prisma.announcement.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: adminId,
      updatedBy: adminId,
    },
  });
}
```

要点：
- findFirst (deletedAt=null) 预查（防止重复软删 + 绕过中间件）
- 移除 `prisma.delete()` 硬删
- 同时写 updatedBy（破坏性操作）

### 2. service.restore 复用 post.restore 模式

```ts
async restore(adminId: bigint, id: bigint) {
  const announcement = await this.prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw new NotFoundException(`公告 ID ${id} 不存在`);
  if (!announcement.deletedAt) throw new BadRequestException(`公告 ID ${id} 未被软删，无需恢复`);

  await this.prisma.$transaction([
    this.prisma.announcement.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, status: 1, updatedBy: adminId },
    }),
    this.prisma.auditLog.create({
      data: {
        adminUserId: adminId,
        module: 'announcement',
        action: 'restore',
        targetType: 'announcement',
        targetId: id,
        reason: `从 ${announcement.deletedAt?.toISOString()} 软删恢复`,
        metadata: { previousDeletedBy: announcement.deletedBy?.toString() ?? null, title: announcement.title },
      },
    }),
  ]);
}
```

要点：
- findUnique 不带 deletedAt 过滤（绕过中间件查看完整记录）
- 区分 NotFoundException（不存在）vs BadRequestException（未软删）
- 事务双写 update + auditLog
- status=1 强制恢复为启用
- auditLog metadata 含 previousDeletedBy + title 用于追溯

### 3. update 仅破坏性字段写 updatedBy（用户确认）

```ts
const destructive =
  dto.status !== undefined ||
  dto.startsAt !== undefined ||
  dto.endsAt !== undefined;
if (destructive) data.updatedBy = adminId;
```

要点：
- title / content 修订不算破坏性，不写 updatedBy
- status / startsAt / endsAt 变更属于"运营状态变更"，是破坏性，写 updatedBy
- 与 `post.offline` / `post.reject` 规范一致

### 4. admin UI 状态 chip 三态

```tsx
function StatusChip({ a }: { a: AdminAnnouncement }) {
  if (a.deletedAt) {
    return <span className="...red opacity-60...">已删除</span>;
  }
  const sc = STATUS_LABEL[a.status] ?? STATUS_LABEL[0];
  return <span className={clsx(..., sc.cls)}>{sc.text}</span>;
}
```

要点：
- 已删行整体 opacity-60 + 浅红背景（`bg-red-50/30`），视觉区分
- 操作列按状态切换：未删三按钮（停用/编辑/删除），已删单按钮（恢复）
- 删除按钮 title 改为"软删除（可在包含已删除中恢复）"

### 5. FilterAnnouncementDto.includeDeleted 用 IsBooleanString

```ts
@IsOptional() @IsBooleanString() includeDeleted?: string;
```

- controller 内 `query.includeDeleted === 'true'` 转 boolean
- 与 T-015 tag DTO `includeDeleted` 模式一致
- 默认 undefined（service.findAll 不传 `where.deletedAt = undefined`，由中间件默认过滤）

---

## 单测覆盖矩阵（16 用例）

### findActive（2）/ findAll（3）/ create（2）/ update（5）
- T-016 已覆盖 + T-019 新增 `#16` (update 含 status → 写 updatedBy)

### remove + restore（4）
- `#11` remove 找不到 → NotFoundException
- `#12` remove 成功 → 软删（断言 `prisma.update` 被调用 + `data.deletedAt/deletedBy/updatedBy` 正确 + **不调用** `prisma.delete`）
- `#13` restore 找不到 → NotFoundException
- `#14` restore 未软删（deletedAt=null）→ BadRequestException
- `#15` restore 成功 → `$transaction` 被调用 + update.mock.calls 数据正确 + auditLog.mock.calls 数据正确

---

## admin UI 字段对照

### AdminAnnouncement interface 变更

```ts
export interface AdminAnnouncement {
  // ... 原有字段
  deletedAt: string | null;   // T-019 新增
  deletedBy: string | null;   // T-019 新增
}
```

### 表格列定义（更新）

| ID | 标题 | 状态 chip | 优先级 chip | 生效时段 | 创建时间 | 删除时间 | 操作 |
|---|---|---|---|---|---|---|---|
| #1 | 系统升级 | 已删除（red opacity） | 置顶 | - | 2026-06-26 | 2026-06-27 | 🟢恢复 |

- 删除时间列仅 `includeDeleted=true` 时显示
- 操作列：已删显示"恢复"按钮（emerald 颜色），未删显示三按钮

### 工具条

| 状态过滤 | 包含已删除 复选框 |
|---|---|
| 全部 / 启用 / 停用 | ☐ 包含已删除（默认 false） |

---

## 验收对照

### 自动化

```bash
# 后端
cd backend && npx jest src/modules/announcement/announcement.service.spec --runInBand
# 期望：Tests: 16 passed
cd backend && npx jest src/modules/announcement/findList.spec --runInBand
# 期望：Tests: 8 passed（无回归）
cd backend && npx jest src/modules/tag/tag.service.spec --runInBand
# 期望：Tests: 30 passed（无回归）

# admin
cd admin && npx tsc --noEmit       # 期望：0 errors（T-019b 自身）
cd admin && npm run build          # 期望：受 pre-existing globals.css 路径问题影响（独立任务修）
```

### 手动冒烟

1. 启动 backend + admin → 登录 admin → /admin/announcements → 看到 5 条
2. 勾选"包含已删除"：列表无变化（当前无已删）
3. 点"删除"任一公告 → confirm "可恢复" → 列表仍显示但状态变"已删除"（red opacity） + 操作变"恢复"
4. 取消勾选"包含已删除"：刚删的消失
5. 重新勾选 → 点"恢复" → confirm "前台 banner 显示" → 公告回到"启用"状态
6. 前台访问 / → banner 区域：已删公告不显示（公开 API 仍正确过滤）
7. 后端查 audit_logs 表：恢复记录已写入

### Git

```bash
git log --oneline -3
# 期望：T-019a (后端) + T-019b (admin UI) 2 commits
git push origin feature/T-019-fix-announcement-hard-delete
# 期望：成功
```

---

## 复用与一致性

| 已有 | 复用方式 |
|---|---|
| `admin-post.service.ts:51` restore 模式 | 复用到 `announcement.service.restore`（事务双写 update + AuditLog）|
| `tag.service.spec.ts` mock 模式 | 复用到 announcement 新增 #13-#16 用例 |
| `adminTagApi` 5 方法 (T-015) | 同模式扩展 `adminAnnouncementApi.restore` + `list.includeDeleted` |
| `tag.service.ts` delete 是软删 | 复用到 `announcement.service.remove`（移除 prisma.delete）|
| T-015 admin /tags "包含已删/已停用" 复选框 | 同模式到 announcements "包含已删除" |
| `AdminGuard + PermissionGuard + @RequirePermission` T-003 | restore 端点复用相同模式 |

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| AuditLog 表缺失 | 已存在，无需迁移 |
| 公开 API 行为变化 | T-001 中间件自动过滤；findActive/findList/findOne 行为不变 |
| `update` 写 updatedBy 范围过广 | 仅破坏性字段写；title/content 不算 |
| operator 角色权限丢失 | seed 同步绑定 `announcement.restore` |
| 已存在软删记录 | 当前无数据；schema 字段已就位 |
| restore 误操作 | 二次确认 + 显式"恢复后该公告将在前台生效"警告 |
| AuditLog.action 'restore' | 已存在（admin-post.service.ts 用 'restore' 字符串）|

---

## 后续（V1.1 / T-020+）

- **必修**：banner 模块硬删修复（同款模式）
- banner PermissionGuard 改造（独立任务）
- announcement 30 天硬清 cron（与 post 同步）
- 公告批量恢复 / 批量删除
- 富文本编辑器
- 公告预览管理
- 修复 admin globals.css 4 级相对路径

---

**最后更新**：2026-06-27
**Commit 计划**：
1. `fix(announcement): T-019a remove→软删 + restore endpoint + update写updatedBy (12→16 tests)` — `15cc8b7`
2. `feat(admin): T-019b announcement 软删 UI 同步 + restore 按钮 + includeDeleted 复选框` — `87be2d6`
