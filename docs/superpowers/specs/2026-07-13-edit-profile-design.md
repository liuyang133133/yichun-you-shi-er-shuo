# 用户端"编辑资料"功能 — 设计文档

**日期**：2026-07-13
**作者**：Claude (brainstorming skill, PM 视角)
**状态**：✅ Approved → 等待 writing-plans
**目标版本**：V1.2 (or V1.3)
**作用范围**：仅前端用户端 `/me` 页

---

## 1. 背景

### 1.1 用户反馈

> "编辑资料"按钮点了提示"开发中"
> — `/me` 页右上角"编辑资料"按钮(用户截图红框标注)

### 1.2 现状

- [`frontend/src/app/me/page.tsx:138-146`](../../frontend/src/app/me/page.tsx#L138-L146) "编辑资料"按钮 `onClick` 仅 toast 一句"资料编辑功能开发中"
- [`frontend/src/app/me/security/page.tsx:202-237`](../../frontend/src/app/me/security/page.tsx#L202-L237) `/me/security` 页面有"改昵称" Card(V1.1b 实现)
- 后端 [`backend/src/modules/user/user.controller.ts:80-90`](../../backend/src/modules/user/user.controller.ts#L80-L90) `PATCH /users/me` **已存在**,支持 `nickname / avatar / bio / gender` 4 字段
- 后端 [`backend/src/modules/upload/upload.controller.ts:23-44`](../../backend/src/modules/upload/upload.controller.ts#L23-L44) `POST /upload/image` **已存在**(sharp 重编码 webp,5MB,嗅探 + 防 svg)
- 后端 [`User` model (schema.prisma:19-37)](../../backend/prisma/schema.prisma#L19-L37) 含 `nickname(50) / avatar(255) / gender(TinyInt) / bio(255)`

**结论:后端 0 行业务代码即可上线,核心工作量在前端 1 个新组件 + 1 个老页的微调。**

### 1.3 根因

- V1.0 上线时此功能未排期
- V1.1b 加 `/me/security` 时把"改昵称"塞进安全页(临时方案),未做"编辑资料"主入口
- 现有 `PATCH /users/me` 端点长期闲置

---

## 2. 目标

让 `/me` 页"编辑资料"按钮真正可用,提供**头像/昵称/性别/简介** 4 字段统一编辑入口,**10 分钟内**完成 1 次完整资料更新。

### 2.1 验收标准

- ✅ `/me` 页点"编辑资料" → 右侧 Sheet 抽屉滑出
- ✅ 抽屉 4 字段(头像/昵称/性别/简介)正确回填当前用户数据
- ✅ 头像支持本地上传(jpg/png/webp/gif, ≤ 5MB)→ 即时预览 + 立即落库
- ✅ 昵称 1-20 字(UI 限 20,后端 50 兜底)
- ✅ 性别 3 选 1:不透露 / 男 / 女
- ✅ 简介 0-80 字(textarea `maxLength=80`,后端 255 兜底)
- ✅ 整表单 1 个"保存"按钮 → 1 次 PATCH
- ✅ 保存成功后 `/me` 顶栏头像/昵称同步刷新(无刷新页面)
- ✅ `/me/security` 页面**删除**"改昵称" Card,仅保留改密 + 忘记密码引导(消除重复入口)
- ✅ 9 类错误场景全部有 toast 提示 + 系统行为符合 §5 错误矩阵
- ✅ 移动端(Chrome Android / iOS Safari)Sheet 从底部滑入,布局不破

### 2.2 非目标(本次不做)

- ❌ 不做"换绑手机号"(涉及个保法流程,后续单独排期)
- ❌ 不做"地区/家乡"字段(`User` 表无 `regionId`,且 V1 无此需求)
- ❌ 不做"通知/隐私"等其它设置(已在 `/me` 设置区,后续单独排期)
- ❌ 不做"系统预设头像库"(V2 再看真实反馈)
- ❌ 不做"头像圆形裁剪"(V1 用 `object-cover` + 圆框,等用户反馈再优化)
- ❌ 不改后端任何代码
- ❌ 不动 `/me/security` 的"改密"流程(只删昵称 Card)

---

## 3. 范围 & 决策(已与用户确认)

| # | 决策 | 结论 | 原因 |
|---|---|---|---|
| 1 | 范围 | **纯基础资料(头像/昵称/性别/简介)** | 改密独立在 `/me/security` 体验更清晰 |
| 2 | 入口 | **右侧 Sheet 抽屉**(移动端从底部) | 焦点集中,移动端友好,不改 URL |
| 3 | 头像 | **仅本地上传**(走 `POST /upload/image`) | 主流 App 体验,0 后端 |
| 4 | 性别 | **不透露 / 男 / 女**(0/1/2) | 隐私友好,符合 2026 主流 |
| 5 | bio | **UI 80 字 maxLength**(后端 255 兜底) | 80 字最符合社区调性 |
| 6 | 保存节奏 | **整表单 1 个"保存"按钮** | 4 字段统一原子提交 |
| 7 | 昵称唯一性 | **可重**(2 个"小李"可共存) | 社区平台主流(58/赶集) |
| 8 | `/me/security` 处理 | **删除"改昵称" Card** | 消除重复入口,改密保留 |
| 9 | 头像链路 | **上传即落库**(选完图 → 上传 → PATCH avatar) | 用户改头像响应快,失败可重选 |

---

## 4. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│ 前端 (Next.js 15)                                       │
│                                                         │
│  /me/page.tsx  (改)                                     │
│    └─ <Button "编辑资料">  →  setSheetOpen(true)       │
│                                                         │
│  /me/security/page.tsx  (改)                            │
│    └─ 删除"改昵称" Card (保留改密 + 忘记密码引导)       │
│                                                         │
│  新增 components/me/edit-profile-sheet.tsx              │
│    └─ <Sheet> 抽屉 (受控 open)                         │
│         ├─ 头像区 (Avatar 90px + "更换" 链接)           │
│         ├─ 昵称 Input (maxLength=20)                    │
│         ├─ 性别 RadioGroup (不透露/男/女)               │
│         ├─ 简介 Textarea (maxLength=80, 实时计数)       │
│         └─ 底部固定: 取消 / 保存                        │
│                                                         │
│  复用已有:                                              │
│    - userApi.updateMe  (PATCH /users/me)  [已有]        │
│    - 新建 lib/api-upload.ts → uploadApi.uploadImage     │
│    - Sheet 来自 shadcn/ui (项目已有)                    │
│    - Avatar 组件 components/patterns/avatar.tsx         │
│    - GENDER_OPTIONS 常量放 lib/constants/gender.ts (新) │
│                                                         │
│ 后端 (NestJS)  [0 改动]                                 │
│   PATCH /api/v1/users/me  — 已有                        │
│   POST  /api/v1/upload/image — 已有                     │
└─────────────────────────────────────────────────────────┘
```

### 4.1 边界

- 后端 0 行业务代码
- 前端新增 1 个组件(`edit-profile-sheet.tsx`)+ 1 个常量文件(`gender.ts`)+ 1 个 uploadApi wrapper
- 前端修改 1 个老页(`/me/page.tsx` 接 Sheet)+ 删除 1 个老页的 Card(`/me/security/page.tsx`)
- 无新增 store / 状态管理依赖
- 无新增依赖(shadcn Sheet 已用,其他组件来自项目)

---

## 5. 数据模型 & 字段映射

### 5.1 User 表(后端 schema 现状,无改动)

| 字段 | DB 类型 | 后端 DTO 限制 | 前端表单字段 | 初始值(优先级) |
|---|---|---|---|---|
| `phone` | VarChar(20) UNIQUE | 不在 DTO | **只读展示**(不进表单) | meDetail.phone |
| `nickname` | VarChar(50) | `@Length(0,50)` | nickname Input (UI max=20) | meDetail.nickname → localStorage → '' |
| `avatar` | VarChar(255) | `@IsString` | avatar URL(由上传写入) | meDetail.avatar → null |
| `gender` | TinyInt | `@Min(0) @Max(2)` | gender Radio (0/1/2) | meDetail.gender → 0 |
| `bio` | VarChar(255) | `@Length(0,255)` | bio Textarea (UI max=80) | meDetail.bio → '' |
| `password` | VarChar(100)? | 不在 DTO | **不进表单** | — |
| `role` / `status` | — | 不在 DTO | **不进表单** | — |

### 5.2 性别文案映射(新文件 `lib/constants/gender.ts`)

```ts
export const GENDER_OPTIONS = [
  { value: 0, label: '不透露' },
  { value: 1, label: '男'     },
  { value: 2, label: '女'     },
] as const;
export type GenderValue = 0 | 1 | 2;
```

### 5.3 客户端预校验(在 PATCH 之前,避免后端 400 抖动)

| 字段 | 规则 | 错误提示 |
|---|---|---|
| nickname | `trim` 后 1-20 字符 | "昵称 1-20 字" |
| avatar | 必须是 `http(s)://` 开头且 ≤ 255 字 | "头像链接无效" |
| gender | 0 / 1 / 2 之一(Radio 强约束) | — |
| bio | 0-80 字符(textarea `maxLength=80`) | "简介最多 80 字" |

### 5.4 写入策略(关键)

| 链路 | 时机 | 字段 | 备注 |
|---|---|---|---|
| **头像链路 A** | 用户选图片 → 立即 | 仅 `avatar` | 1 次 `POST /upload/image` + 1 次 `PATCH /users/me` |
| **保存链路 B** | 用户点"保存" | `nickname / gender / bio` | 1 次 `PATCH /users/me` |

**两条链路独立运行,互不阻塞**:
- 头像链路先完成,form 内的 `avatar` 已是 URL
- 保存链路只 PATCH 其余 3 字段(`UpdateUserDto` 全 `@IsOptional`,部分 PATCH 合法)
- 即便 B 失败,A 已生效(头像视觉强,用户能立即看到)

### 5.5 后端兼容性

- `PATCH /users/me` 已支持部分字段(`@IsOptional` 全配齐)
- `POST /upload/image` 已支持 jpg/png/webp/gif + 5MB + sharp 重编码 webp
- `User.avatar` 字段为 VARCHAR(255) URL,直接存上传返回的 URL 即可

---

## 6. UI 流程 & 状态机

### 6.1 抽屉布局(桌面 480px 宽 / 移动端 100% 宽)

```
┌────────────────────────────────────────────┐
│  编辑资料                          [×]     │  ← SheetHeader 固定
├────────────────────────────────────────────┤
│                                            │
│            ╭───────╮                       │
│            │  头  │   [更换头像]            │  ← 90×90 圆形 + 文字按钮
│            │  像  │                         │     hover: 编辑小图标
│            ╰───────╯                       │
│                                            │
│  昵称                                       │
│  ┌────────────────────────────────────┐    │
│  │ 小李                               │    │  ← 20 字 maxLength
│  └────────────────────────────────────┘    │
│                                            │
│  性别                                       │
│  ◯ 不透露    ◯ 男    ◯ 女                  │  ← 横向 RadioGroup
│                                            │
│  简介                                       │
│  ┌────────────────────────────────────┐    │
│  │                                    │    │  ← 4 行 textarea
│  │  说点什么…                         │    │     80 字 maxLength
│  │                                    │    │     实时显示 X/80
│  │                                    │    │
│  └────────────────────────────────────┘    │
│  0/80                                      │
│                                            │
├────────────────────────────────────────────┤
│              [ 取消 ]    [ 保存 ]          │  ← 底部固定 SheetFooter
└────────────────────────────────────────────┘
```

### 6.2 状态机(6 个核心交互)

| # | 用户操作 | 状态变化 | 失败处理 |
|---|---|---|---|
| 1 | 点"编辑资料"按钮 | `sheetOpen=false→true` + 用 `meDetail` 初始化 `form` | — |
| 2 | 点"更换头像" → 选图片 | 校验 size ≤ 5MB & 类型 → `POST /upload/image` | 失败:toast 错误,`form.avatar` 不变 |
| 2a | (上传中) | `avatarUploading=true`,头像位置显示 spinner 覆盖层 | 网络断:toast + 重试 |
| 2b | (上传成功) | 拿到 `url` → `PATCH /users/me {avatar:url}` → 头像预览刷新 + `authApi.me()` 重新拉 | 罕见,toast |
| 3 | 输入昵称/简介 | 纯本地 state,`onChange` 更新 form 字段 | — |
| 4 | 切换性别 Radio | `setForm({...form, gender: v})` | — |
| 5 | 点"保存" | 客户端校验 → `PATCH /users/me {nickname, gender, bio}` → 关闭抽屉 + toast 成功 + 父组件 `meDetail` 状态同步 | 失败:toast,抽屉不关,字段值保留 |
| 6 | 点"取消" / 关闭 / ESC | 弹"放弃修改?"确认(若 `form` 与 `meDetail` 不一致) | 取消确认 = 关,确认 = 留抽屉 |

### 6.3 关键 UX 细节

- **关闭确认**: 仅"用户改过任意字段"才弹"放弃修改?",没改任何东西则直接关
- **保存中状态**: 抽屉底部"保存"按钮显示 spinner + "保存中…",期间整个抽屉禁用交互
- **数据回填优先级**: `meDetail`(服务器权威) > `user` from localStorage > 空(沿用 V1.1b / T-XXX-LOGIN 模式)
- **空昵称保护**: 已有昵称不允许清空后保存;若要"匿名",需在昵称上写一个占位串(类似"用户 2552"逻辑)— **不强制**,仅 toast 提示"昵称不能为空"
- **头像无图状态**: 默认显示"首字母 + 性别默认色"占位(Avatar fallback)
- **a11y**: Sheet 用 `aria-labelledby` + `aria-describedby`;RadioGroup 用 `<fieldset><legend>性别</legend>`;textarea `aria-describedby` 关联字数提示
- **重提交保护**: 头像上传中禁用"更换头像"入口;保存中禁用整张表单交互 + 禁用关闭按钮

---

## 7. 错误处理矩阵

| 错误源 | HTTP | 触发场景 | 用户感知 | 系统行为 |
|---|---|---|---|---|
| **图片超 5MB** | — | 本地 size 校验 | toast "图片不能超过 5MB" | 不发请求 |
| **图片类型错** | 400 | 后端嗅探失败(伪 jpg/svg) | toast `e.message` | avatar 字段不变 |
| **上传网络断** | — | fetch reject | toast "上传失败,请检查网络后重试" + 重试入口 | 不调 PATCH |
| **上传 5xx** | 500 | 后端 OOM 等 | toast "服务器开小差了,稍后再试" | 不调 PATCH |
| **PATCH 401** | 401 | token 过期 | toast "登录已过期" + 跳 `/login?expired=1` | 清 auth 状态 |
| **PATCH 400** | 400 | nickname 超 50 / gender 越界 | toast `e.message` | 字段值保留,高亮错误项 |
| **PATCH 403** | 403 | 不应发生(自己改自己) | toast "无权操作" | 关闭抽屉 |
| **PATCH 5xx** | 500 | DB 抖动 | toast "保存失败,稍后再试" | 抽屉不关,字段值保留 |
| **me 二次拉失败** | — | 头像保存后 `/auth/me` 失败 | 静默(本地头像已更新) | 不报错,下次拉取同步 |

### 7.1 并发 & 数据一致性

- **不变量**: 头像落库(URL 写 avatar)与"保存其他 3 字段"是 2 个独立 PATCH;即便"保存"失败,头像也已生效 — 这是**有意的**:
  - 头像变更视觉强(在 /me 顶部),用户能立即看到
  - 合并到一次 PATCH,头像上传失败会让"保存"全失败,体验更糟
- **写后读**: PATCH 成功后调用 `authApi.me()` 重新拉权威值,确保 `meDetail` 与服务器一致
- **乐观更新**: **不采用** — 4 字段表单代价小,直接 PATCH 完再更新 state,失败回滚更清晰
- **重提交保护**: 头像上传中(`avatarUploading=true`)禁用"更换头像"入口;保存中(`saving=true`)禁用整张表单交互

### 7.2 容错 fallback

- **avatar 字段为 null** (用户从未上传): 抽屉内显示"上传你的第一张头像" 引导文字(可选优化,V1 沿用 Avatar fallback)
- **meDetail 加载失败**: 抽屉仍能打开(form 用 localStorage + 性别默认 0);保存时若有未加载到的字段则透传 null(后端 DTO `@IsOptional` 兼容)

### 7.3 审计与日志

- 改昵称/头像/简介 = 公开资料,前端不发埋点
- 后端 `userService.update` 已在 admin 改他人时写 `AuditLog`,自己改自己不写(沿用现有约定)
- 前端 `console.warn`:`avatarUploading 失败`、`PATCH 5xx`、`/auth/me 失败` 3 类打 warn 便于排查

---

## 8. 测试策略

### 8.1 后端(0 行业务代码,不新增测试)

- ✅ `PATCH /users/me` 已有 `user.service.spec.ts` 覆盖 4 字段
- ✅ `POST /upload/image` 已有 `upload.service.spec.ts` 覆盖嗅探/size/sharp
- 不写新测试,沿用现有覆盖

### 8.2 前端

| 层 | 测试类型 | 用例 | 期望 |
|---|---|---|---|
| **单测** | `edit-profile-sheet.test.tsx`(新) | 抽屉默认打开 + 4 字段渲染 | 字段值 = meDetail 回填 |
| | | 改昵称为空 → 点保存 | toast "昵称不能为空",不调 PATCH |
| | | 改昵称 21 字 → 点保存 | toast "昵称 1-20 字" |
| | | 改 bio 第 81 字 | maxLength 拦截,不能输入 |
| | | 切换性别 3 选项 | form.gender 同步更新 |
| | | 点"更换头像" mock uploadApi.uploadImage 成功 | 头像预览刷新,avatarUploading 复位 |
| | | mock uploadApi.uploadImage 失败 | toast 错误,avatar 不变 |
| | | mock PATCH 200 → 抽屉关闭 + toast 成功 | 父 meDetail 状态被同步 |
| | | mock PATCH 400 → 抽屉不关 + toast 错误 | 字段值保留 |
| | | mock PATCH 401 → 清 auth + 跳 /login | 导航事件触发 |
| | | 改 1 字段后点关闭 → 弹"放弃修改?"确认 | 取消=留抽屉,确认=关 |
| | | 没改任何字段点关闭 | 直接关,无确认 |
| | | 头像上传中点保存 | 保存按钮 disabled |
| **集成测** | Playwright(项目已有) | 真实登录 → /me → 点"编辑资料" | 抽屉打开,字段值 = 登录用户 |
| | | 选本地 jpg → 等预览 | 头像变,DB avatar 字段写入 URL |
| | | 改昵称 → 点保存 | /me 顶部昵称同步,抽屉关闭 |
| **回归** | 已有 E2E | 跑现有 v1-acceptance(应该无影响) | 全绿 |
| | | 跑 /me/security 改密流程 | 全绿(删昵称 Card 不影响改密) |

### 8.3 手动验证清单(发布前由 PM 跑)

1. 注册新用户 → 立即打开编辑资料 → 头像/昵称/简介/性别全改一遍 → 看 /me 顶部同步
2. 改昵称为空 → 看错误提示
3. 上传 6MB 图片 → 看拒绝
4. 上传 .gif 文件 → 看通过 + 显示
5. 改完不点保存,直接点 × → 看"放弃修改"确认
6. 改完点保存 → 网络断 → 看错误
7. 改完点保存 → 成功 → /me 顶栏头像/昵称同步刷新
8. 移动端:窄屏看 Sheet 是否从底部滑入 + 头像不变形
9. /me/security 进 → 确认"改昵称"Card 已删,只剩改密

---

## 9. 实施 TODO(预,详细见 writing-plans 输出)

- [ ] 创建 `lib/constants/gender.ts` (新文件,~5 行)
- [ ] 创建 `lib/api-upload.ts` wrapper (新文件,~15 行,导出 `uploadApi.uploadImage`)
- [ ] 创建 `components/me/edit-profile-sheet.tsx` (新文件,~250 行)
- [ ] 创建 `components/me/edit-profile-sheet.test.tsx` (新文件,~150 行,12 用例)
- [ ] 改 `app/me/page.tsx`:把"编辑资料"按钮 onClick 改为打开 Sheet(10 行)
- [ ] 改 `app/me/security/page.tsx`:删除"改昵称" Card(约 35 行)
- [ ] frontend `tsc --noEmit` 0 错
- [ ] frontend `npm run build` 成功
- [ ] frontend `npm run test` 12 个新单测全过
- [ ] Playwright 集成测试全过
- [ ] 手动验证 9 项

**预计代码量**: 净增 ~300 行(组件 ~250 + 常量/wrapper ~20 + 单测 ~150 - 删 /me/security 改昵称 ~35 - /me 改 onClick 约 10 行净增 ~10) = **+300 行**

---

## 10. 风险与回退

| 风险 | 概率 | 影响 | 回退方案 |
|---|---|---|---|
| Sheet 组件在 shadcn 老版本行为不一致 | 低 | 中 | 用 Dialog 替代(回退 1 小时) |
| 头像上传慢,用户连点 | 中 | 低 | `avatarUploading` 期间禁用入口 |
| `/me/security` 删昵称 Card 引发用户困惑 | 低 | 低 | 改密 Card 顶部加一行"想改昵称/头像?点 /me 的'编辑资料'" |
| 移动端 Sheet 滑入方向错 | 低 | 低 | 改 shadcn Sheet `side="right"` 为 `side="bottom"` (移动端媒体查询) |
| 头像上传 5MB 限制在弱网下不友好 | 中 | 低 | V2 加"压缩到 500KB"客户端预处理 |

**回退成本**: 0(后端 0 改动,前端 1 个组件删除 + 1 个老页还原即可)

---

## 11. 完成度自评

- 字段覆盖: 4/4 (头像/昵称/性别/简介)
- 入口验证: 1/1 (编辑资料按钮)
- 错误场景: 9/9 (全矩阵)
- 浏览器: 桌面 Chrome / Edge / 移动 Chrome / iOS Safari 四端
- 后端回归: 0 改动,0 风险
- 文档: 本 spec + writing-plans 输出 + 实施后 commit message

---

**✅ 等待 writing-plans 阶段。**

---

## 12. 已知限制 (T-023 follow-up)

- **后端 `authApi.me()` 当前不返回 `gender`/`bio`** (`backend/src/modules/auth/auth.service.ts:278-288`)。
  - 影响:用户首次打开"编辑资料"抽屉时,`gender` 显示 0(不透露),`bio` 显示空,即使已设置过。
  - 临时方案:用户改过 bio 后保存,后续关闭-再打开可以看到新值(因为父组件 `meDetail` 被 `onSaved` 更新)。
  - 修复(T-024):后端 `getMeDetail` 加 `gender`/`bio` select,前端无需改动即可正确显示。
- **401 重定向用 `window.location.href` 而非 `router.replace`**: 简单可靠,但会硬刷新。其它页面用 `router.replace` 软导航。这是 plan 范围内的设计选择,不是 bug。
