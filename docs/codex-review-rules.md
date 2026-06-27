# Codex 代码审查规则

> **用途**：Codex（代码审查工程师）审查 Claude 实施产物的标准化规则
> **使用方**：Codex
> **触发方**：Claude 实施完成 → PM 收 → Codex 审查
> **维护人**：Hermes（PM）
> **最后更新**：2026-06-15

---

## 1. 审查总则

### 1.1 审查时机

- **前置**：Claude 必须已 commit + push + 跑过冒烟用例 + 提交"交付消息"
- **后置**：Codex 必须在 1 小时内产出审查报告
- **降级**：P2 / 重构类任务可异步审查（24h 内）

### 1.2 审查范围

按任务书的"涉及文件"清单为准。**Codex 不得审查未列文件**——发现可疑关联文件应**上报 PM**。

### 1.3 审查姿态

- **严格但务实**：V1.0 阶段允许已知遗留（详见 [project-memory §10 各 Sprint R-*](./project-memory.md)），但**新引入**问题必须修
- **不替 Claude 重写**：只指出问题 + 建议修复方案，不直接改代码
- **关注安全 > 性能 > 可读性**：P0 安全问题一票否决

---

## 2. 审查维度与评分

### 2.1 必查项（4 维度，各 25 分，总分 100）

| 维度 | 权重 | 关注点 |
|---|---|---|
| **正确性 / 潜在 Bug** | 25% | 边界、空值、并发、路由顺序、事务完整性 |
| **安全风险** | 25% | 注入、越权、CSRF、PII 泄露、密钥泄露、依赖漏洞 |
| **性能风险** | 25% | N+1、缺索引、缓存未失效、长事务、大 payload |
| **代码规范** | 25% | TS 类型、命名、注释、Prisma 用法、错误处理一致性 |

### 2.2 加分 / 减分项

| 项 | 范围 |
|---|---|
| + 复用现有 helper / pattern | +1~3 分 |
| + 补充边界单测 / 冒烟 | +1~3 分 |
| + 文档内联注释到位 | +1~2 分 |
| - 引入新依赖未声明 | -3 分/个 |
| - 抄了审计 outdated 内容（如 F-1 教训：file-type 升 ^22）| -5 分 |
| - 跳过任务书要求（如未跑冒烟）| -10 分 |
| - 引入 P0 级安全风险（如明文存密码）| 一票否决（≤ 60 分） |

### 2.3 通过门槛

| 等级 | 分 | 处理 |
|---|---|---|
| **A 优秀** | 90-100 | 通过，PM 收尾 |
| **B 良好** | 80-89 | 通过，Codex 列出小建议（可改可不改）|
| **C 合格** | 70-79 | 有条件通过，必须改 P0/P1 项再合 |
| **D 不合格** | 60-69 | 退回 Claude 重做 |
| **F 严重** | < 60 | 退回 + 复盘 + 加 P0 安全 review |

---

## 3. 审查报告模板

```markdown
# 审查报告 [REVIEW-ID]：[任务名]

> **审查日期**：2026-06-XX  
> **审查者**：Codex  
> **审查对象**：[commit hash / PR 链接 / 文件清单]  
> **关联任务**：[TASK-ID]

---

## 1. 审查范围

- 文件：[列出]
- commit：[hash]
- 冒烟结果：[Claude 报告的]
- 任务书：[链接]

## 2. 评分

| 维度 | 分 | 说明 |
|---|---|---|
| 正确性 | XX/25 | [一句话] |
| 安全 | XX/25 | [一句话] |
| 性能 | XX/25 | [一句话] |
| 规范 | XX/25 | [一句话] |
| 加分/减分 | +X / -X | [原因] |
| **总分** | **XX/100** | **等级 X** |

## 3. 潜在 Bug（必列）

| # | 严重度 | 位置 | 描述 | 复现 | 建议修复 |
|---|--------|------|------|------|----------|
| B-1 | 🔴/🟡/🟢 | `xxx.ts:123` | [描述] | [步骤] | [方案] |

## 4. 安全风险（必列）

| # | 严重度 | 类型 | 描述 | 建议 |
|---|--------|------|------|------|
| S-1 | 🔴/🟡/🟢 | SQL 注入/XSS/CSRF/越权/... | [描述] | [方案] |

## 5. 性能风险

| # | 严重度 | 位置 | 描述 | 建议 |
|---|--------|------|------|------|
| P-1 | 🔴/🟡/🟢 | `xxx.ts:45` | N+1 / 缺索引 / 长事务 / ... | [方案] |

## 6. 代码规范问题

| # | 严重度 | 位置 | 描述 | 建议 |
|---|--------|------|------|------|
| N-1 | 🟢 | `xxx.ts:20` | 命名 / 注释 / TS 类型 / ... | [方案] |

## 7. 修复建议（汇总）

### 7.1 必须改（🔴 + 🟡）

1. [B-1 / S-1 / P-1] [具体改法，引用代码]
2. ...

### 7.2 建议改（🟢）

1. [N-1] ...

## 8. 最终评分

- **总分**：XX/100
- **等级**：A/B/C/D/F
- **结论**：✅ 通过 / 🟡 有条件通过 / ❌ 退回

## 9. 复盘要点（仅 F/D 时填）

- 为什么漏掉？
- 任务书是否需要补条款？
- 是否需要加自动化检查（lint / pre-commit hook）？
```

---

## 4. 关键检查清单（按文件类型）

### 4.1 NestJS Controller 检查清单

```markdown
- [ ] 路径前缀 `@Controller('xxx')`（不写裸 '/xxx'）
- [ ] 公开/受保护/admin 三档用 `@Public()` / 默认 / `@Roles('admin')` 标注
- [ ] 路由顺序：字面量路径（`me` / `count` / `tree`）在 `:id` 之前（F-4 教训）
- [ ] 请求 DTO 用 `class-validator` 装饰器
- [ ] 响应统一用 `code: 0, message, data` 格式
- [ ] 错误用 `HttpException` 子类，不 throw string
- [ ] Swagger 装饰器 `@ApiTags` + `@ApiOperation` + `@ApiBearerAuth`（如有）
- [ ] 限流用 `@Throttle()` 或全局默认
- [ ] 写操作有日志（含 requestId）
```

### 4.2 Prisma Service 检查清单

```markdown
- [ ] 写操作有 try-catch + 错误日志
- [ ] 多表写入用 `$transaction`（不要在 controller 层 try-catch 后部分回滚）
- [ ] BigInt 字段在 service 层 `.toString()` 或用 `TransformInterceptor`（前端不收 BigInt）
- [ ] N+1：用 `include` / `select` 一次拉，不要循环里 query
- [ ] 索引：WHERE/ORDER BY 字段有索引；新表建 @@index
- [ ] 软删：用 `status: 'deleted'` 而非 `delete()`（参考 SHOULD-16）
- [ ] 分页：`skip` / `take` 而非 load all；pageSize 上限 `@Max(100)`（SHOULD-7）
- [ ] 全文搜索：`MATCH() AGAINST()` 后用 `Number(_score)` 防 BigInt 序列化（F-3 教训）
```

### 4.3 Next.js 页面检查清单

```markdown
- [ ] App Router 路径正确
- [ ] `'use client'` 标注清晰（不需要交互的页面不要加）
- [ ] `useSearchParams()` 必须包 `<Suspense>`（MUST-11 教训）
- [ ] API 调用走 `@/lib/api.ts`，不用裸 fetch
- [ ] 受保护页面：layout 加 middleware 重定向到 /login（SHOULD-19 模式）
- [ ] 时区：用 `Intl.DateTimeFormat`（SHOULD-36 教训），不用 `toLocaleString()`
- [ ] 暗色适配：bg-background / text-foreground 等 CSS 变量，不用 hard-coded `bg-white`
- [ ] Loading / Error / Empty 三态
- [ ] 表单：required + 客户端校验
- [ ] 错误用 toast 不用 alert（SHOULD-21）
- [ ] Metadata：每页独立 title/desc（MUST-21）
- [ ] 提交后清理状态 / 路由跳转
```

### 4.4 通用安全检查清单

```markdown
- [ ] 任何用户输入都校验（DTO / Zod）
- [ ] 任何 SQL 走 Prisma 参数化（不拼字符串）
- [ ] 任何 HTML 输出转义（React 默认，但 dangerouslySetInnerHTML 必须过滤）
- [ ] 任何文件上传 MIME 嗅探（file-type@^16.5.4）+ 重编码（sharp@^0.33.5）
- [ ] 任何鉴权决策：isSelf || isAdmin 显式检查（F-6 教训）
- [ ] 任何 PII 输出脱敏（手机号 138****1234）
- [ ] 任何 .env 引用：密码 / 密钥不在代码硬编码（MUST-1 教训）
- [ ] 任何新依赖：版本锁到当前 Node 18 兼容（file-type ^16.5.4，sharp ^0.33.5）
- [ ] 任何新接口：默认需鉴权（除非 @Public 显式）
- [ ] 任何错误信息：不含 stack 给客户端（开发模式可）
```

### 4.5 数据库变更检查清单

```markdown
- [ ] schema.prisma 改了
- [ ] 迁移文件生成（`migrate dev --name xxx`）
- [ ] 迁移文件不含破坏性（删字段先 nullable + 步骤）
- [ ] 索引命名规范（`_idx` / `_uk` / `_fk`）
- [ ] **FULLTEXT 索引（如有）**：用 raw SQL migration，不在 schema.prisma（F 教训）
- [ ] **不跑 `migrate dev`**：FULLTEXT 索引迁移后只跑 `migrate deploy`（R-4 教训）
- [ ] BigInt 主键前端是 string（schema 不变，但 service 处理）
```

---

## 5. 复盘（V1 教训沉淀）

V1.0 期间踩过的坑必须**入典**，Codex 审查时主动检查：

| 教训 | 来源 | Codex 检查动作 |
|---|---|---|
| file-type 必须锁 ^16.5.4 | F-1 | package.json 锁定；新依赖全 grep |
| sharp 必须锁 ^0.33.5 | F-1 | 同上 |
| webcrypto polyfill | F-1 | main.ts 顶部有 `globalThis.crypto ??= require('crypto').webcrypto` |
| `Number(_score)` 防御 | F-3 | search.service.ts 有 _score 转 number |
| 路由字面量先于 :id | F-4 | controller 路由顺序检查 |
| CORS 空 = 仅同源 + boot warn | F-5 | main.ts CORS 配置检查 |
| isSelf \|\| isAdmin 显式 | F-6 | 写接口权限检查 |
| buildTokenPair 传 role | Sprint 4 bugfix | auth.service.ts login 流程 |
| 软删 status=2 + Redis 黑名单 | SHOULD-16 + R-2 | 删除/封禁流程 |
| FULLTEXT 不在 schema | R-4 | 迁移目录是否有 raw SQL |
| 中文 UTF-8 无 BOM | R-5 | 编辑器检查 |

---

## 6. 与 PM 协作约定

- **Codex 报告**发到 PM 终端 + 任务书关联位置
- **PM 决策**：
  - A/B 等级 → 收尾（更新 project-memory / TASKS / CHANGELOG）
  - C 等级 → 转 Claude 修复 → 二次审查
  - D/F 等级 → 转 Claude 重做 → 二次审查
- **重大安全问题** → PM 立即通报用户（不走异步）
- **Codex 自身工作质量**也接受 PM 抽样复核（每 10 个审查抽查 1 个）

---

## 7. 自我约束

Codex **不**做：

- 替 Claude 改代码
- 替 PM 写文档
- 跳过审查维度
- 跟 Claude "争论风格"（只关注"对不对、安不安全、快不快"）
- 接收 Claude 反驳（"这是 PM 决定的，你照做"）

Codex **应**做：

- 客观、有理有据（issue 必带位置 + 复现 + 建议）
- 关注"新引入"问题，不翻旧账
- 对照项目专属教训（§5）逐条检查
- 给出可执行的修复建议（不是"建议重构"这种空话）
