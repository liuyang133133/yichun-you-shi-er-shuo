# T-020 Banner — 硬删 → 软删修复 + PermissionGuard 改造 + admin UI 重写

> **任务**：完整修复 banner 模块（service 软删 + controller 拆分 + PermissionGuard + admin UI 重写）
> **分支**：`feature/T-020-banner-hard-delete-fix`（基于 `main` 重建）
> **状态**：✅ 完成 2026-06-27
> **关联**：T-019 announcement 软删修复（基线参考）/ T-001 软删除基础 / T-003 PermissionGuard

---

## Context

### 现状（T-020 启动前）

**后端 banner 模块（需多维修复）**：
- ❌ `service.remove()` 用 `prisma.banner.delete()` **硬删**
- ❌ 缺 `restore` 方法 + controller 端点
- ❌ `update()` 不写 `updatedBy`
- ❌ DTO 缺 `includeDeleted` 字段
- ❌ Controller 用 `@Roles('admin')` 而**非 AdminGuard + PermissionGuard**
- ❌ 缺 `banner.view / banner.restore` 权限码
- ✅ schema `Banner` 已含软删字段（T-001 已加）

**后端单测**：
- `banner.service.spec.ts` **0 文件**（需新建）

**admin UI（重大改造）**：
- ❌ `banners/page.tsx` 239 行 **卡片布局**
- ❌ 无搜索/无过滤/无表格/无分页/无编辑/无状态 chip/无"包含已删除"/无恢复
- ❌ 裸 `apiFetch` 调用，无 `adminBannerApi` 封装
- ❌ Banner interface 缺软删字段

### 解决方案

**后端（11 文件）**：
1. `service.remove` 软删
2. `service.restore` 新增（事务双写）
3. `service.update` 仅破坏性字段写 `updatedBy`
4. `service.findAll` 加 `includeDeleted`
5. Controller 拆分（admin / 公开）
6. DTO 拆分（filter / update 独立）
7. seed 加 `banner.view + banner.restore` + operator 绑定
8. 新建 `banner.service.spec.ts`（17 用例）

**admin UI（2 文件）**：
1. `api.ts` 加 `adminBannerApi` + `AdminBanner` interface
2. `banners/page.tsx` **卡片 → 表格**重写

---

## 数据流

```
admin 点"删除" → DELETE /api/v1/admin/banners/:id
  ↓ AdminBannerController.remove (banner.delete)
  ↓ BannerService.remove(adminId, id)
  ↓ findFirst(deletedAt=null) → 不存在 → NotFoundException
  ↓ prisma.banner.update
  ↓   data: { deletedAt, deletedBy: adminId, updatedBy: adminId }
  ↑ { id, deleted: true }

admin 勾选"包含已删除" → GET /api/v1/admin/banners?includeDeleted=true
  ↓ AdminBannerController.findAll (banner.view)
  ↓ where.deletedAt = undefined（绕过中间件）
  ↑ 含已软删 banner 列表

admin 点"恢复" → POST /api/v1/admin/banners/:id/restore
  ↓ AdminBannerController.restore (banner.restore)
  ↓ findUnique → 不存在 → NotFoundException
  ↓ 未软删 → BadRequestException
  ↓ $transaction
  ↓   update: { deletedAt: null, deletedBy: null, status: 1, updatedBy }
  ↓   auditLog.create: { action: 'restore', targetType: 'banner' }
  ↑ { id, restored: true }
```

---

## 关键设计决策

### 1. Controller 拆分（用户确认）

**原 `banner.controller.ts`**（混合 `@Controller()`）：
- 保留：`GET banners/active` 公开端点
- 移除：4 admin 端点

**新 `admin-banner.controller.ts`**：
```ts
@ApiTags('admin-banners')
@Controller('admin/banners')
@UseGuards(AdminGuard, PermissionGuard)
export class AdminBannerController {
  @Get() @RequirePermission('banner.view') findAll(@Query() query)
  @Post() @RequirePermission('banner.create') create(@CurrentUser() user, @Body() dto)
  @Patch(':id') @RequirePermission('banner.update') update(...)
  @Delete(':id') @RequirePermission('banner.delete') remove(...)
  @Post(':id/restore') @RequirePermission('banner.restore') restore(...)
}
```

**路由路径不变**：`@Controller('admin/banners')` + 全局 `/api/v1` = `/api/v1/admin/banners/*`，完全等价改造前。

### 2. service.remove 软删（与 T-019 一致）

```ts
async remove(adminId: bigint, id: bigint) {
  const exists = await this.prisma.banner.findFirst({ where: { id, deletedAt: null } });
  if (!exists) throw new NotFoundException(`Banner ID ${id} 不存在`);
  await this.prisma.banner.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: adminId, updatedBy: adminId },
  });
  return { id: id.toString(), deleted: true };
}
```

### 3. service.restore 复用 T-019 模式

```ts
async restore(adminId: bigint, id: bigint) {
  const banner = await this.prisma.banner.findUnique({ where: { id } });
  if (!banner) throw new NotFoundException(`Banner ID ${id} 不存在`);
  if (!banner.deletedAt) throw new BadRequestException(`Banner ID ${id} 未被软删，无需恢复`);

  await this.prisma.$transaction([
    this.prisma.banner.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, status: 1, updatedBy: adminId },
    }),
    this.prisma.auditLog.create({
      data: {
        adminUserId: adminId, module: 'banner', action: 'restore',
        targetType: 'banner', targetId: id,
        reason: `从 ${banner.deletedAt?.toISOString()} 软删恢复`,
        metadata: { previousDeletedBy: banner.deletedBy?.toString() ?? null, title: banner.title },
      },
    }),
  ]);
  return { id: id.toString(), restored: true };
}
```

### 4. update 仅破坏性字段写 updatedBy

```ts
const destructive =
  dto.status !== undefined ||
  dto.startsAt !== undefined ||
  dto.endsAt !== undefined;
if (destructive) data.updatedBy = adminId;
```

**破坏性字段**：status / startsAt / endsAt
**普通字段**（不算）：title / imageUrl / linkType / linkTarget / position / sortOrder

### 5. admin UI 卡片 → 表格（仿 announcement）

**工具条**：
- 搜索框（title 模糊）
- 位置过滤 chips（全部 / 首页头部 / 首页中部 / 列表页头部）
- 状态过滤 chips（全部 / 启用 / 停用）
- `includeDeleted` 复选框

**表格列**：
- ID / Banner（缩略图 + title + linkType:linkTarget）/ 位置 chip / 状态 chip / 排序 / 生效时段 / 创建时间 / [删除时间（仅 includeDeleted）] / 操作

**状态 chip 三态**：
- 启用（emerald）
- 停用（gray）
- 已删除（red opacity + title 显示删除时间）

**操作列**：
- 未删：⚡ 停用 / ✏ 编辑 / 🗑 删除（三按钮）
- 已删：🟢 恢复（单按钮）

---

## 单测覆盖矩阵（17 用例）

### findActive（3）
1. 不带 position → where 不含 position
2. 带 position=home_top → where.position === 'home_top'
3. 时间窗 AND 数组含 startsAt/endsAt OR 条件

### findAll（3）
4. 不带参数 → where 不含 status
5. 带 includeDeleted='true' → where.deletedAt = undefined
6. 分页 page=2, pageSize=10 → skip=10, take=10

### findOne（1）
7. 找不到 → NotFoundException

### create（2）
8. 成功 → 默认 linkType/position/sortOrder/status + createdBy
9. 含 linkType=post + startsAt/endsAt ISO → 转 Date

### update（3）
10. 找不到 → NotFoundException
11. 只改 title → 不写 updatedBy
12. 含 status=0 → 写 updatedBy

### remove（T-020 改软删 2 用例）
13. 找不到 → NotFoundException
14. 成功 → 软删（调 update + 写 3 字段，不调 delete）

### restore（T-020 新增 3 用例）
15. 找不到 → NotFoundException
16. 未软删 → BadRequestException
17. 成功 → $transaction 双写 update + auditLog

---

## 验收对照

### 自动化

```bash
cd backend && npx jest src/modules/banner/ --runInBand
# 期望：Tests: 17 passed

cd backend && npx jest src/modules/announcement/ src/modules/tag/ --runInBand
# 期望：Tests: 54 passed（无回归）

cd admin && npx tsc --noEmit
# 期望：0 errors
```

### 手动冒烟

1. 启动 backend + admin → 登录 admin → /admin/banners → 看到列表
2. 切换"位置/状态"过滤：列表立即过滤
3. 点"新建 Banner" → 模态弹出 → 填全字段（含 startsAt/endsAt）→ 保存 → 列表新增
4. 点"编辑"任一行 → 模态回显 → 改 status=停用 → 保存 → 状态 chip 变灰
5. 点"删除"任一行 → confirm "可恢复" → 行变"已删除"（red opacity） + 操作变"恢复"
6. 取消勾选"包含已删除"：刚删的消失
7. 重新勾选 → 点"恢复" → confirm → banner 回到"启用"
8. 前台访问 / → 已删 banner 不显示

### Git

```bash
git log --oneline -3
# 期望：
# 1. fix(banner): T-020a remove→软删 + restore endpoint + PermissionGuard改造 (新 17 tests)
# 2. feat(admin): T-020b banner 软删 UI + restore 按钮 + includeDeleted 复选框（卡片→表格）
# 3. docs(banner): T-020 design doc + CHANGELOG + README
```

---

## 复用与一致性（与 T-019 announcement 对齐）

| T-019 announcement | T-020 banner |
|---|---|
| `service.remove` 软删 | `service.remove` 软删 — 完全复用模式 |
| `service.restore` 事务双写 | `service.restore` — 完全复用模式 |
| `service.update` 破坏性字段判断 | `service.update` — status/startsAt/endsAt 一致 |
| `admin-announcement.controller.ts` | `admin-banner.controller.ts` — 完全复用结构 |
| `FilterAnnouncementDto.includeDeleted` | `FilterBannerDto.includeDeleted` — `@IsBooleanString` 一致 |
| `adminAnnouncementApi.restore` | `adminBannerApi.restore` — 复用签名 |
| `announcements/page.tsx` 三态 chip | `banners/page.tsx` 三态 chip — 完全复用模式 |
| `seed.ts` announcement.restore | `seed.ts` banner.restore — 复用模式 |

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Controller 拆分破坏现有 admin/banners 路由路径 | @Controller('admin/banners') + 全局 /api/v1 前缀 = 完全等价 |
| PermissionGuard 改造破坏 super_admin 短路 | PermissionGuard.ts:23-24 super_admin 自动通过；T-019 已成功应用 |
| page.tsx 大改（239 → ~580 行）引入新 bug | 严格参照 announcements/page.tsx 模板；提交前 tsc 0 错 + 手动冒烟 |
| banner.service.findAll 新加 includeDeleted 字符串解析 | 沿用 announcement DTO `@IsBooleanString` + service 内 `if (includeDeleted) where.deletedAt = undefined` |
| operator 角色权限丢失 | seed 同步绑定 banner.view + banner.restore |
| DTO 拆分会破坏现有引用 | 同步建 `dto/index.ts` 聚合导出 |
| schema Banner 缺字段 | 已确认完整含 deletedAt / updatedBy / deletedBy / createdBy，无需迁移 |
| AuditLog 表缺失 | schema 已存在，无需迁移 |

---

## 后续（V1.1 / T-021+）

- ❌ banner 富文本 / 图片上传
- ❌ banner 30 天硬清 cron（与 post / announcement 同步）
- ❌ banner 批量操作
- ❌ 前端 i18n / Toast 国际化
- ❌ banner 历史批量恢复
- ❌ 修复 admin globals.css 4 级相对路径

---

**最后更新**：2026-06-27
**Commit 计划**：
1. `fix(banner): T-020a remove→软删 + restore endpoint + PermissionGuard改造 (新 17 tests)` — `9b610a4`
2. `feat(admin): T-020b banner 软删 UI + restore 按钮 + includeDeleted 复选框（卡片→表格）` — `65036a9`
3. `docs(banner): T-020 design doc + CHANGELOG + README` — 待
