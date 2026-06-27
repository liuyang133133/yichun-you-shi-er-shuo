# T-021 公司 — 后台管理升级 + 软删规范统一

> **任务**：升级 admin `/admin/companies`（58 行 placeholder → 完整表格 UI）+ 后端补 service.remove/restore + DTO + 权限码
> **分支**：`feature/T-021-company-admin`（基于 `main` 重建）
> **状态**：✅ 完成 2026-06-27
> **关联**：T-019 announcement / T-020 banner 软删 + UI 重写模板 / T-001 软删除基础 / T-003 PermissionGuard

---

## Context

### 现状（T-021 启动前）

**后端 company 模块**：
- ✅ `admin-company.service.ts`（97 行）：`findAll / findOne / verify / unverify`（4 方法）
- ✅ `admin-company.controller.ts`（57 行）：4 endpoints + AdminGuard + PermissionGuard + `company.view/verify/unverify` 3 权限码
- ❌ 缺 `remove`（软删）+ `restore`（事务双写）+ `update`
- ❌ DTO 缺失（用 raw `@Query` 字符串）
- ❌ `findAll` 不支持 `includeDeleted`
- ❌ 缺单测 `admin-company.service.spec.ts`

**admin UI**：
- ❌ `admin/src/app/companies/page.tsx` **58 行 placeholder**（仅 GET `/companies` + 卡片列表）
- ❌ 无 `adminCompanyApi` 封装（裸 `apiFetch`）
- ❌ 无 `AdminCompany` interface
- ❌ 无搜索/无过滤/无认证操作按钮/无状态 chip/无软删支持

**Schema**：
- ✅ `Company` model 已含 `deletedAt/deletedBy/updatedBy/createdBy`（T-001 已加）— **无需迁移**

**侧边栏**：
- ✅ `admin-shell.tsx:11-20` 已含 `/companies` 入口（无需变动）

### 解决方案

**后端（5 文件新建 + 4 文件修改）**：
1. `service.remove` 软删（写 deletedAt/deletedBy/updatedBy）
2. `service.restore` 事务双写（update + auditLog）
3. `service.findAll` 加 `includeDeleted` 过滤
4. Controller 加 `DELETE /:id`（perm `company.delete`）+ `POST :id/restore`（perm `company.restore`）
5. DTO 拆分：filter-company.dto + update-company.dto + index.ts
6. seed.ts 加 `company.delete + company.restore` 2 权限码
7. 新建 `admin-company.service.spec.ts` 8 用例

**admin UI（2 文件修改）**：
1. `api.ts` 加 `adminCompanyApi` 6 方法 + `AdminCompany` interface（含软删字段）
2. `companies/page.tsx` **卡片 → 表格**重写（仿 banners/announcements，~390 行）

**不在 T-021 范围**：
- ❌ 创建/编辑公司模态（含 logo/industry/scale/nature/address/description 全字段编辑）
- ❌ operator 角色绑定 company.*（沿用现状，仅 super_admin）
- ❌ 公开端点 `/companies` 变更（T-001 中间件自动过滤 deletedAt=null，前台不变）

---

## 数据流

```
admin 点"取消认证" → POST /api/v1/admin/companies/:id/unverify
  ↓ AdminCompanyController.unverify (company.unverify)
  ↓ AdminCompanyService.unverify
  ↓ findOne 预查
  ↓ prisma.company.update({ verified: 0 })
  ↓ prisma.auditLog.create({ action: 'unverify' })
  ↑ updated

admin 点"删除" → DELETE /api/v1/admin/companies/:id
  ↓ AdminCompanyController.remove (company.delete)
  ↓ AdminCompanyService.remove(adminId, id)
  ↓ findFirst(deletedAt=null) → 不存在 → NotFoundException
  ↓ prisma.company.update
  ↓   data: { deletedAt, deletedBy: adminId, updatedBy: adminId }
  ↑ { id, deleted: true }

admin 勾选"包含已删除" → GET /api/v1/admin/companies?includeDeleted=true
  ↓ AdminCompanyController.findAll (company.view)
  ↓ where.deletedAt = undefined（绕过中间件）
  ↑ 含已软删 company 列表

admin 点"恢复" → POST /api/v1/admin/companies/:id/restore
  ↓ AdminCompanyController.restore (company.restore)
  ↓ AdminCompanyService.restore
  ↓ findUnique → 不存在 → NotFoundException
  ↓ 未软删 → BadRequestException
  ↓ $transaction
  ↓   update: { deletedAt: null, deletedBy: null, updatedBy: adminId }
  ↓   auditLog.create: { action: 'restore' }
  ↑ { id, restored: true }
```

---

## 关键设计决策

### 1. 后端 service 方法设计

**`service.remove`**（与 T-020 banner 一致）：
```ts
async remove(adminId: bigint, id: bigint) {
  const exists = await this.prisma.company.findFirst({ where: { id, deletedAt: null } });
  if (!exists) throw new NotFoundException(`公司 ID ${id} 不存在`);
  await this.prisma.company.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: adminId, updatedBy: adminId },
  });
  return { id: id.toString(), deleted: true };
}
```

**`service.restore` 复用 T-020 banner 模式 + Company 差异**：
```ts
async restore(adminId: bigint, id: bigint) {
  const company = await this.prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundException(`公司 ID ${id} 不存在`);
  if (!company.deletedAt) throw new BadRequestException(`公司 ID ${id} 未被软删，无需恢复`);

  await this.prisma.$transaction([
    this.prisma.company.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        updatedBy: adminId,
        // 注意：Company 没有 status 字段（只有 verified）
        // 不强制重置 verified = 1，保留原认证状态
      },
    }),
    this.prisma.auditLog.create({
      data: {
        adminUserId: adminId,
        module: 'company',
        action: 'restore',
        targetType: 'company',
        targetId: id,
        reason: `从 ${company.deletedAt?.toISOString()} 软删恢复`,
        metadata: { previousDeletedBy: company.deletedBy?.toString() ?? null, name: company.name },
      },
    }),
  ]);
  return { id: id.toString(), restored: true };
}
```

### 2. Company vs Banner/Announcement 关键差异

| 项 | Banner | Announcement | Company |
|---|---|---|---|
| status 字段 | ✅ 有 | ✅ 有 | ❌ 无 |
| verified 字段 | ❌ 无 | ❌ 无 | ✅ 有 |
| restore 重置 status = 1 | ✅ | ✅ | N/A |
| restore 保留 verified | N/A | N/A | ✅ |
| 操作按钮 | 启用/停用 | 启用/停用 | 认证/取消认证 |

**关键决策**：Company 无 status 字段，restore 不强制重置任何状态；保留软删前的 verified 状态由 admin 自行决定是否需要重新认证。

### 3. Controller 不拆分

保持 `admin-company.controller.ts` 单文件（不像 T-020 banner 拆分），加 2 endpoint：

```ts
@Delete(':id')
@RequirePermission('company.delete')
remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
  return this.adminCompanyService.remove(BigInt(user.sub), BigInt(id));
}

@Post(':id/restore')
@RequirePermission('company.restore')
restore(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
  return this.adminCompanyService.restore(BigInt(user.sub), BigInt(id));
}
```

`findAll` 改用 `@Query() query: FilterCompanyDto`（替换 raw 字符串）。

### 4. DTO 拆分（filter / update 独立文件）

**`filter-company.dto.ts`**：
```ts
@IsOptional() @IsString() keyword?: string;
@IsOptional() @IsIn([0, 1]) @Type(() => Number) verified?: number;
@IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1;
@IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) pageSize?: number = 20;
@IsOptional() @IsBooleanString() includeDeleted?: string;
```

**`update-company.dto.ts`**：全字段 Optional，scale/nature 用 `@IsIn([...])` 验证（参考 `COMPANY_SCALES` / `COMPANY_NATURES` 常量）。

**`dto/index.ts`**：聚合导出。

### 5. seed.ts 权限码（operator 不绑）

```ts
// 当前 486-489
{ code: 'company.view',     module: 'company', action: 'view',     name: '查看公司' },
{ code: 'company.verify',   module: 'company', action: 'verify',   name: '认证公司' },
{ code: 'company.unverify', module: 'company', action: 'unverify', name: '取消公司认证' },

// T-021 新增（user 确认：operator 不绑）
{ code: 'company.delete',   module: 'company', action: 'delete',   name: '删除公司' },
{ code: 'company.restore',  module: 'company', action: 'restore',  name: '恢复公司' },
```

**operator 角色不变**（admin-company.controller.ts:11 注释已声明「默认仅 super_admin」）。

### 6. admin UI 卡片 → 表格重写（仿 banners/announcements）

**工具条**：
- 搜索框（name / industry / address 模糊）
- 认证状态过滤 chips（全部 / 已认证 / 未认证）
- `includeDeleted` 复选框

**表格列**：
| ID | 公司 | 认证 | 规模 | 职位数 | 创建人 | 创建时间 | [删除时间（仅 includeDeleted）] | 操作 |

**认证 chip 三态**：
- 已认证 (verified=1)：emerald
- 未认证 (verified=0)：gray
- 已删除 (deletedAt)：red opacity-60

**操作列**：
- 未删：⚡ 取消认证 / ✅ 认证（按钮根据 verified 切换显示）/ 🗑 删除
- 已删：🟢 恢复（单按钮）

### 7. adminCompanyApi 6 方法

```ts
adminCompanyApi.list({ keyword?, verified?, page?, pageSize?, includeDeleted? })
adminCompanyApi.findOne(id)
adminCompanyApi.verify(id)
adminCompanyApi.unverify(id)
adminCompanyApi.remove(id)
adminCompanyApi.restore(id)  // T-021 新增
```

---

## 关键文件清单

### 新建（5 文件）

| 路径 | 用途 |
|---|---|
| `backend/src/modules/admin/company/dto/filter-company.dto.ts` | 分页 + includeDeleted + verified + keyword |
| `backend/src/modules/admin/company/dto/update-company.dto.ts` | 全字段 Optional（含 scale/nature @IsIn） |
| `backend/src/modules/admin/company/dto/index.ts` | 聚合导出 |
| `backend/src/modules/admin/company/admin-company.service.spec.ts` | 8 用例（findAll 2 + findOne 1 + verify 2 + unverify 2 + remove 1） |
| `docs/t-021-company-admin.md` | 设计文档（本文件） |

### 修改（6 文件）

| 路径 | 变更详情 |
|---|---|
| `backend/src/modules/admin/company/admin-company.service.ts` | + remove 软删 + restore 事务双写 + findAll includeDeleted |
| `backend/src/modules/admin/company/admin-company.controller.ts` | + DELETE + POST :id/restore + @Query FilterCompanyDto |
| `backend/prisma/seed.ts` | + `company.delete` + `company.restore` 权限码 |
| `admin/src/lib/api.ts` | + `AdminCompany` interface + `adminCompanyApi` 6 方法 |
| `admin/src/app/companies/page.tsx` | **重写**：58 行 → ~390 行（卡片→表格） |
| `CHANGELOG.md` + `README.md` | T-021 节 |

---

## 单测覆盖矩阵（8 用例）

### findAll（2）
1. 不带 includeDeleted → 默认不返回软删
2. 带 `includeDeleted='true'` → where.deletedAt === undefined

### findOne（1）
3. 找不到 → NotFoundException

### verify（2）
4. 成功 → 调 prisma.update + auditLog.create（action: 'verify'）
5. 找不到 → NotFoundException

### unverify（2）
6. 成功 → 调 prisma.update + auditLog.create（action: 'unverify'）
7. 找不到 → NotFoundException

### remove（T-021 新增 1 用例）
8. 成功 → 软删（调 update 而非 delete + 写 deletedAt/deletedBy/updatedBy）

**注**：restore 暂不测（与 T-020 banner 一致，restore 是新增方法但单测覆盖率优先保证 remove；T-022+ 可补）

---

## admin UI 字段对照

### 表格列定义

| 列 | 字段 | 渲染 |
|---|---|---|
| ID | id | mono `text-xs` |
| 公司 | logo + name + industry + address | truncate (含 logo 缩略图) |
| 认证 | verified (含 deletedAt 三态) | chip（已认证/未认证/已删除） |
| 规模 | scale | 直接展示 |
| 职位数 | _count.jobs | 数字 |
| 创建人 | creator.nickname | 直接展示 |
| 创建时间 | createdAt | formatDateTime |
| 删除时间 | deletedAt | **仅 includeDeleted=true** 时显示，红色 |
| 操作 | 按钮组 | 未删：⚡✏🗑 / 已删：🟢恢复 |

### 操作按钮逻辑

```tsx
{company.deletedAt ? (
  <Button onClick={() => handleRestore(company)} variant="ghost" size="sm">
    <RotateCcw className="h-4 w-4 text-emerald-600" />
  </Button>
) : (
  <>
    <Button onClick={() => handleToggleVerify(company)} variant="ghost" size="sm">
      {company.verified ? <XCircle className="text-gray-600" /> : <CheckCircle2 className="text-emerald-600" />}
    </Button>
    <Button onClick={() => handleDelete(company)} variant="ghost" size="sm">
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  </>
)}
```

---

## 验收对照

### 自动化

```bash
# 后端单测
cd backend && npx jest src/modules/admin/company/ --runInBand
# 期望：Tests: 8 passed

# 回归
cd backend && npx jest src/modules/banner/ src/modules/announcement/ src/modules/tag/ --runInBand
# 期望：Tests: 71 passed（17 banner + 24 announcement + 30 tag，无回归）

# admin tsc
cd admin && npx tsc --noEmit
# 期望：0 errors
```

### 手动冒烟（5 步）

1. 启动 backend + admin → seed 重建 → 登录 admin（super_admin）→ /admin/companies → 看到列表
2. 切换"认证"过滤 + 搜索框 → 列表立即过滤
3. 点"取消认证"任一行 → confirm → 行认证状态 chip 变灰
4. 点"删除"任一行 → confirm "可恢复" → 行变"已删除"（red opacity） + 操作变"恢复"
5. 取消勾选"包含已删除"：刚删的消失 → 重新勾选 → 点"恢复" → confirm → 行回到原状态

### Git

```bash
git log --oneline -3
# 期望：
# 1. fix(company): T-021a remove→软删 + restore endpoint + DTO拆分 + 单测 (8 用例)
# 2. feat(admin): T-021b company 软删 UI + restore 按钮 + includeDeleted 复选框（卡片→表格）
# 3. docs(company): T-021 design doc + CHANGELOG + README
```

---

## 复用与一致性（与 T-019/T-020 对齐）

| T-019 announcement | T-020 banner | T-021 company |
|---|---|---|
| `service.remove` 软删 | `service.remove` 软删 | `service.remove` 软删 — 完全复用模式 |
| `service.restore` 事务双写 | `service.restore` 事务双写 | `service.restore` — 完全复用模式 |
| `service.findAll` includeDeleted | `service.findAll` includeDeleted | `service.findAll` includeDeleted — 完全复用 |
| `admin-announcement.controller.ts` | `admin-banner.controller.ts` | `admin-company.controller.ts` — **不拆分**（已是 admin 专用） |
| `FilterAnnouncementDto.includeDeleted` | `FilterBannerDto.includeDeleted` | `FilterCompanyDto.includeDeleted` — 完全一致 |
| `adminAnnouncementApi.restore` | `adminBannerApi.restore` | `adminCompanyApi.restore` — 完全复用签名 |
| `announcements/page.tsx` 三态 chip | `banners/page.tsx` 三态 chip | `companies/page.tsx` 三态 chip — 完全复用 |
| `seed.ts` announcement.restore | `seed.ts` banner.restore | `seed.ts` company.restore — 完全复用 |
| operator 绑定 announcement.* | operator 绑定 banner.view/restore | **operator 不绑 company.***（用户确认） |

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Service.remove 改成软删破坏现有调用方 | 当前仅 admin-company.controller.ts 内调用，外层 admin UI 是 placeholder（无删除按钮），风险 = 0 |
| Restore 缺单测 | 沿用 T-020 banner 测试策略：restore 是新增方法，业务用 mock $transaction 验证即可（用户确认不在 8 用例内） |
| DTO 拆分破坏现有 raw 字符串调用 | controller 同步从 raw 改为 `@Query() query: FilterCompanyDto`，raw 字符串保留向后兼容 |
| `findOne` 预查 + 重复验证性能 | 单次查询，无额外开销；与 banner.service 一致 |
| page.tsx 大改（58 → ~390 行）引入 bug | 严格参照 announcements/page.tsx（598 行已稳定）；提交前 tsc 0 错 + 手动冒烟 5 步 |
| 已认证 company 软删后 status 字段如何处理 | Company 没有 status 字段（只有 verified），restore 不需要重置 verified = 1（与 banner/announcement 的 status=1 不同） |
| `creator` 字段在 findAll/findOne 中已 include | 现有代码已经 include，无需变动 |
| AuditLog 表已存在 | schema 已存在，无需迁移 |

---

## 后续（V1.1 / T-022+）

- ❌ 公司创建/编辑模态（T-021 用户决定不做）
- ❌ 公司 logo 上传（与 T-022 banner 图片上传同步）
- ❌ operator 角色绑定 company.view + company.verify（与 T-041 商家入驻同步）
- ❌ 公司 30 天硬清 cron（与 post / banner / announcement 同步）
- ❌ 公司批量操作
- ❌ 修复 admin globals.css 4 级相对路径

---

**最后更新**：2026-06-27
**Commit 计划**：
1. `fix(company): T-021a remove→软删 + restore endpoint + DTO拆分 + 单测 (8 用例)` — `be690da`
2. `feat(admin): T-021b company 软删 UI + restore 按钮 + includeDeleted 复选框（卡片→表格）` — `d16a7ec`
3. `docs(company): T-021 design doc + CHANGELOG + README` — 待