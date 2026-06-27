# AGENTS.md

> 面向 Codex 的项目协作指南 — 伊春有事儿说（Yichun You Shi Er Shuo）

## 项目概览

面向伊春本地居民的信息发布平台：房屋出租 / 二手交易 / 招聘求职 / 便民信息。

| 层 | 技术 |
|---|---|
| 前端（用户端） | Next.js 15 + TypeScript + TailwindCSS + Shadcn UI |
| 管理后台 | Next.js 15（`admin/`） |
| 后端 | NestJS + Prisma |
| 数据库 | MySQL 8 |
| 缓存 | Redis 7 |
| 部署 | Docker Compose |

## 仓库结构

```
.
├── backend/      # NestJS 后端
├── frontend/     # Next.js 15 用户端
├── admin/        # Next.js 15 管理后台
├── docs/         # 架构与设计文档
├── docker/       # Docker 配置
└── docker-compose.yml
```

## CodeGraph Skill

项目根目录已生成 `.codegraph/codegraph.db`（114 文件 / 1,226 节点 / 2,106 边）。  
**当用户询问以下内容时，优先调用 CodeGraph 而不是逐文件 grep**：

- 谁调用了某个函数 / 方法 / 类
- 某个函数的调用链、依赖图
- 修改某文件 / 函数的影响范围（impact analysis）
- 死代码检测
- 项目结构、模块划分
- 任何包含 "调用 / 引用 / 依赖 / 影响 / 调用链 / 死代码" 的问题

**调用方式**：

```bash
# 在项目根目录
codegraph query <符号>          # 搜索符号
codegraph callers <符号>        # 谁调用了它
codegraph callees <符号>        # 它调用了谁
codegraph impact <符号>         # 改动影响范围
codegraph files                 # 文件结构
codegraph status                # 索引状态
```

**详细文档**（位于 `.Codex/skills/codegraph/`）：

- `SKILL.md` — 主入口（数据库 schema、查询规则、注意事项）
- `reference.md` — 完整 schema 与 CLI 参考
- `examples.md` — 常用查询示例

**触发流程**：

1. 先读 `.Codex/skills/codegraph/SKILL.md` 了解协议
2. 通过 `codegraph` CLI 或 `sqlite3 .codegraph/codegraph.db` 查询
3. 输出结果时附上来源（节点 ID、文件:行号）

**同步**：文件修改后运行 `codegraph sync` 更新索引。

## 工作约定

- 后端模块位于 `backend/src/modules/<name>/`，每个模块含 `controller.ts` / `service.ts` / `module.ts` / `dto/` / `entities/`
- 数据库 schema 在 `backend/prisma/schema.prisma`
- 前端页面在 `frontend/src/app/`（App Router）
- API 路由在后端以 `@Controller('admin/xxx')` 形式组织

## 常用命令

```bash
# 后端
cd backend && npm run start:dev

# 前端
cd frontend && npm run dev

# 管理后台
cd admin && npm run dev

# CodeGraph
codegraph sync                  # 增量更新索引
codegraph status                # 查看索引
```
