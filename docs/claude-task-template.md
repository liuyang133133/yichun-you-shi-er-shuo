# Claude 开发任务书模板

> **用途**：PM 出给 Claude（软件开发工程师）的标准化任务指令
> **使用方**：PM（Hermes）
> **接收方**：Claude Code
> **维护人**：Hermes（PM）
> **最后更新**：2026-06-15

---

## 模板使用说明

1. PM 按本模板填好具体任务，下发给 Claude Code
2. Claude 实施时**严格按"实现要求"执行，不得擅自扩大范围**
3. 实施完成后，**必须**触发 Codex 审查（见 [codex-review-rules.md](./codex-review-rules.md)）
4. 实施 + 审查均通过后，PM 收尾：更新 project-memory / TASKS / CHANGELOG

---

## 任务书模板

```markdown
# 任务书 [TASK-ID]：[任务名称]

> **优先级**：🔴 P0 / 🟡 P1 / 🟢 P2  
> **来源**：P0-25 / P1-关键-XX / P1-常规-XX / P2-XX / 手动-B-X / 重构-RX  
> **估时**：X 小时  
> **依赖**：列出前置任务（无则填"无"）  
> **实施者**：Claude Code  
> **审查者**：Codex

---

## 1. 目标（一句话）

[用一句话说清楚做完这个任务后，用户能/系统能做什么事]

## 2. 涉及文件（必须列出）

| 文件路径 | 动作（新增/修改/删除） | 说明 |
|---|---|---|
| `backend/src/modules/xxx/xxx.controller.ts` | 修改 | xxx 接口调整 |
| `backend/src/modules/xxx/xxx.service.ts` | 修改 | xxx 业务逻辑 |
| `backend/prisma/migrations/xxx/migration.sql` | 新增 | xxx 表/索引 |
| `backend/src/modules/xxx/dto/xxx.dto.ts` | 修改 | xxx DTO |
| `frontend/src/app/xxx/page.tsx` | 修改 | xxx 页面 |
| `.env.example` | 修改 | xxx 环境变量 |
| `docs/` | 修改 | 同步 PM 文档（PM 守则：你不写，PM 写）|

> **注意**：列出**所有**会动的文件。Claude 实施时若发现需要动其他文件，必须**先停下来报告 PM**，不得擅自扩大。

## 3. 实现要求（具体到代码级）

### 3.1 后端（如涉及）

- 路由：`POST /api/v1/xxx` 路径前缀 `api/v1`
- 请求 DTO：用 `class-validator` 装饰器校验
- 响应格式：`{ code: 0, message: 'ok', data: ... }`（code !== 0 视为错误）
- 鉴权：标记 `@Public()` 跳过 JWT；需登录则不加；需 admin 加 `@Roles('admin')` + `AdminGuard`
- 错误：抛标准 `HttpException`（`BadRequestException` / `UnauthorizedException` / `ForbiddenException` / `NotFoundException` / `ConflictException`）
- 数据库：Prisma 调用，**不写**原始 SQL（除非有特殊索引需求，并在任务书"特殊说明"列出）
- 事务：多表写入用 `$transaction`
- 缓存：写操作要清相关 Redis key（遵循 SHOULD-7 模式）

### 3.2 前端（如涉及）

- 路径：`frontend/src/app/xxx/page.tsx`（App Router）
- 状态：用 React Hooks（`useState` / `useReducer`），复杂状态考虑 `zustand`
- 数据请求：`@/lib/api` 的 `api.get/post/patch/delete`，不要用裸 `fetch`
- 鉴权：受保护页面用中间件重定向（参考 SHOULD-19）
- 样式：Tailwind + Shadcn UI 组件
- 时区：用 `Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai' })` 统一显示（不要 `new Date().toLocaleString()`）
- 主题：暗色模式适配（用 `bg-background` / `text-foreground` 等 CSS 变量）

### 3.3 数据库（如涉及）

- 表/字段定义：在 `backend/prisma/schema.prisma` 改
- 迁移：跑 `npx prisma migrate dev --name <name>` 生成
- 索引：组合索引字段顺序 = WHERE 高频字段在前、ORDER BY 字段在后
- FULLTEXT：如需 FULLTEXT，**不要**在 schema.prisma 写（Prisma 不支持），迁移后用 raw SQL 单独加（**重要！必须用 `migrate deploy` 而不是 `migrate dev`，否则会被 drop**）
- BigInt：所有 id 是 BigInt，service 层转 string 返回前端

### 3.4 安全（如涉及）

- 鉴权：分清"公开 / 登录 / admin"三档
- 限频：写操作接 `@nestjs/throttler`（默认短窗 10/s）
- 输入：所有用户输入 `class-validator` 校验 + `class-transformer` 转义
- 输出：手机号等 PII 脱敏（`138****1234`）
- 文件：上传必须 MIME 嗅探（`file-type@^16.5.4`，Node 18 兼容）+ sharp 重编码
- 错误日志：含 stack + requestId（已用 nestjs-pino）

### 3.5 测试（如涉及）

- 单测：放在 `backend/src/modules/xxx/xxx.service.spec.ts`（Jest 框架）
- E2E 冒烟：用 curl 命令贴在"验收标准"里，PM/QA 实际跑过
- 冒烟用例数：≥ 任务涉及接口数
- **V1.0 阶段**不强制单测，但冒烟必须有（V1.1 起强制单测 60%）

### 3.6 文档（如涉及）

**Claude 实施时**：
- 改 `backend/src/**/*.ts` 同步更新 controller 上的 `@ApiOperation` 注释（Swagger）
- 改 `schema.prisma` **不**同步 DATABASE.md（PM 负责）
- 改 API 行为 **不**同步 ARCHITECTURE.md（PM 负责）

**Claude 实施完成后**，在交付消息中**列出**动了哪些 docs 相关（PM 据此更新文档）。

### 3.7 特殊说明

[本任务特有的、容易踩坑的点。如：
- "file-type 必须锁 ^16.5.4（Node 18 兼容，^22 是 ESM-only）"
- "FULLTEXT 索引必须用 raw SQL 追加，且不能再跑 migrate dev"
- "上线时 `CORS_ORIGINS` 必须显式配置，env 里空 = 仅同源" ]

## 4. 验收标准（PM/QA 实际跑）

### 4.1 冒烟用例（必跑，必 PASS）

```bash
# 启动服务（如未启动）
cd backend && npm run start:dev &

# 用例 1：xxx
curl -X POST http://localhost:3001/api/v1/xxx \
  -H "Content-Type: application/json" \
  -d '{"foo":"bar"}' | jq

# 用例 2：xxx（鉴权）
TOKEN=$(curl -s -X POST ... | jq -r .data.accessToken)
curl -X GET http://localhost:3001/api/v1/xxx \
  -H "Authorization: Bearer $TOKEN" | jq
```

| # | 场景 | 命令 | 期望 | 实际 |
|---|------|------|------|------|
| 1 | 公开接口无 token | curl GET /xxx | 200 | [实施者填] |
| 2 | 受保护接口无 token | curl GET /xxx | 401 | [实施者填] |
| 3 | 越权接口 | curl ... | 403 | [实施者填] |
| 4 | 正常流程 | curl ... | 200 + 期望 data | [实施者填] |
| 5 | 异常输入 | curl POST 错数据 | 400 + 期望 message | [实施者填] |

### 4.2 验收签字

- [ ] 冒烟 5/5 PASS
- [ ] 实施者 commit 落地 + push origin/main
- [ ] 实施者交付消息含：commit hash + 冒烟结果 + 影响文件清单

## 5. 预计工时

- 后端：[X]h
- 前端：[X]h  
- 数据库：[X]h
- 测试/冒烟：[X]h
- **合计**：[X]h

## 6. 开发提示词（给 Claude 的额外提示）

```
你是一个严谨的 NestJS / Next.js / Prisma 工程师。

任务：[任务名]
仓库根目录：E:\workspace\yichun-you-shi-er-shuo

技术栈基线：
- 后端：NestJS 10 + Prisma 5 + MySQL 8 + Redis 7
- 前端：Next.js 15 + TypeScript + Tailwind + Shadcn UI
- 鉴权：JWT 双 token（access 7d + refresh 30d）+ Redis 黑名单 + Turnstile
- 重要约束：file-type@^16.5.4 / sharp@^0.33.5（Node 18 兼容）
- 时区统一：Asia/Shanghai（Intl helper 在 frontend/src/lib/date.ts）
- 主题：next-themes 三态（已在 Sprint 6 接入）
- 日志：nestjs-pino 结构化（reqId 注入）

请严格按任务书 §3 实现要求执行。**不要**：
- 扩大范围动其他文件
- 用任何 emoji 注释
- 添加任务书未列的依赖（先报告 PM）
- 跳过冒烟用例
- 写单测（V1 阶段不强制；V1.1 起会强制）

请按以下步骤推进：
1. 通读任务书 + 必要代码
2. 用 CodeGraph 查影响范围（`codegraph impact <symbol>`）
3. 实施
4. 跑 §4 冒烟用例
5. commit + push
6. 输出交付消息（commit hash + 冒烟结果 + 影响文件清单 + 需 PM 同步的 docs 列表）
```

---

## 附：任务书质量自检清单（PM 写完任务书后自检）

- [ ] 目标一句话说清，不模糊
- [ ] 涉及文件清单完整（含每个文件的动作：增/改/删）
- [ ] 实现要求具体到 API 路径、字段、装饰器、错误码
- [ ] 验收标准含 ≥ 5 个冒烟用例
- [ ] 预计工时拆分到子项
- [ ] 特殊说明列出本任务特有陷阱
- [ ] 提示词给出技术栈基线（Claude 不用每次去查）
- [ ] 来源追溯到 P0/P1/P2 编号
- [ ] 与其他任务的依赖关系明示

## 附：常见任务类型快速模板

### A. 后端新接口

参考上面"3.1 后端"完整规范。

### B. 后端 Bug 修复

加 §3.0 根因分析 + 回归测试用例（同时验证旧接口没坏）。

### C. 前端新页面

参考上面"3.2 前端"，重点列：API 调用、loading 态、错误态、空态。

### D. 数据库变更

参考上面"3.3 数据库"，**FULLTEXT 必须用 raw SQL + migrate deploy** 这条单独标红。

### E. 安全修复

参考上面"3.4 安全"，加 §"3.5 安全测试用例"（SQL 注入 / XSS / 越权）。

### F. 部署 / 运维

不写代码，只写操作步骤 + smoke 用例 + 回滚方案。文件动作列 `.env.prod.example`、`docker-compose.prod.yml`、`docker/nginx/nginx.conf`。
