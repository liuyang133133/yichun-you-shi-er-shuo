# 伊春有事儿说

> 面向伊春本地居民的信息发布平台 - 房屋出租 / 二手交易 / 招聘求职 / 便民信息

## 项目状态

🚧 **V1 开发中** - 架构设计已完成，详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15 + TypeScript + TailwindCSS + Shadcn UI |
| 移动端 | H5 响应式（V1）/ 微信小程序（V2） |
| 后端 | NestJS + Prisma |
| 数据库 | MySQL 8 |
| 缓存 | Redis 7 |
| 部署 | Docker Compose |

## 仓库结构

```
.
├── backend/       # NestJS 后端
├── frontend/      # Next.js 15 用户端
├── admin/         # Next.js 15 管理后台
├── docs/          # 文档
└── docker/        # Docker 配置
```

## 快速开始

> 待 T1.2 完成后补充

## 文档

- [架构设计](docs/ARCHITECTURE.md) - V1 完整架构方案
- [开发任务清单](docs/ARCHITECTURE.md#6-claude-开发任务拆分) - 58 个任务，每个 ≤ 2h

## License

MIT
