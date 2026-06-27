# V1.0 真实上线 — 代码侧收尾 + 一键启动脚本

> **日期**：2026-06-16
> **作者**：Claude Code
> **项目**：伊春有事儿说
> **目标**：把仓库内 V1.0 上线的最后 5 项代码侧工作收尾，并产出一个让用户 1 条命令即可启动的脚本
> **关联文档**：[yichun-status-report.md](../../yichun-status-report.md) / [yichun-phase1-tasks.md](../../yichun-phase1-tasks.md) / [PRD.md](../../PRD.md) / [DATABASE.md](../../DATABASE.md)

---

## 1. 背景

V1.0 P0 (25/25) + P1 关键 (20/20) 全部完工，62 commit 已 push。Phase 1 收尾 7 任务中 5 个已实施，剩 T-P1-06（生产 compose 启动）和 T-P1-07（HTTPS）需要：

1. 用户提供公网域名 + 真实 CORS_ORIGINS
2. 用户执行 `docker compose up` + certbot + 浏览器验证

**问题**：当前工作区 dirty（docker-compose.prod.yml / nginx.conf / .gitignore 改动未 commit），用户要 1 条命令启动但有 2 个脚本要选。

**目标**：仓库干净 + 1 个合并脚本 + 1 份运行手册 + nginx 域名模板化。

---

## 2. Scope

### In-scope（5 项）

| # | 任务 | 文件 |
|---|---|---|
| D1 | 提交工作区 T-P1-06/07 dirty 配置 | docker-compose.prod.yml / docker/nginx/nginx.conf / .gitignore |
| D2 | 写 `docs/DEPLOY.md` 运行手册 | docs/DEPLOY.md |
| D3 | 写合并 `scripts/go-live.sh` 一键启动 | scripts/go-live.sh |
| D4 | nginx `server_name` 模板化（支持 default_server + 单 IP 调试） | docker/nginx/nginx.conf |
| D5 | 静态校验：compose config + bash 语法 + 3 端 type-check | （脚本 + 校验步骤）|

### Out-of-scope（用户做）

- 公网域名注册 + DNS A 记录
- 编辑 `.env.prod` 填真实域值
- B-NEW-1 MySQL/Redis ALTER USER（约 5min）
- 执行 `./scripts/go-live.sh start` 启动
- 浏览器访问验收

### 不做（避免蔓延）

- 不引入新依赖
- 不改业务代码（已 100% 完工 + 验收通过）
- 不重写 certbot 自动续期（compose 已就位）
- 不动 dev compose / .env

---

## 3. 关键决策

### 3.1 nginx `server_name` 模板化

**Before**:
```nginx
server_name yourdomain.com www.yourdomain.com;  # 硬编码
```

**After**:
```nginx
# 443 server 用 default_server 模式（单 IP 调试 + 多域名生产两相宜）
server {
    listen 443 ssl http2 default_server;
    server_name _;
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ...
}
```

理由：
- `default_server` 让任意 SNI 客户端能命中（避免用户首次部署时 nginx 起不来）
- 真实域名上线后保留此模式（多域名 SAN 证书同样工作）

### 3.2 go-live.sh 子命令设计

```bash
./scripts/go-live.sh start [DOMAIN]    # 启动 prod compose + 跑迁移 + seed
./scripts/go-live.sh smoke             # 10 冒烟（不动数据）
./scripts/go-live.sh ssl-init DOMAIN   # 签 HTTPS 证书（前置：DNS 已解析 + 80 可达）
./scripts/go-live.sh logs [SERVICE]    # 实时日志
./scripts/go-live.sh stop              # 停服
./scripts/go-live.sh backup            # mysqldump 到 ./backups/
```

**关键约束**：
- 不破坏 dev compose（容器名加 `-prod` 后缀已就位）
- 失败早退（`set -euo pipefail`）
- 可重入（已迁移跳过 / 已 seed 跳过）

### 3.3 DEPLOY.md 内容大纲

1. **前置**：公网域名 + DNS + 80 端口可达
2. **B-NEW-1** 复制粘贴 ALTER USER SQL
3. **编辑 .env.prod** 真实域值
4. **一键启动** `./scripts/go-live.sh start`
5. **签 HTTPS** `./scripts/go-live.sh ssl-init yourdomain.com`
6. **10 冒烟** `./scripts/go-live.sh smoke`
7. **日常运维** logs / backup / stop

---

## 4. 实现要求

### D1 — commit dirty 工作区

```bash
git add docker-compose.prod.yml docker/nginx/nginx.conf .gitignore
git commit -m "chore(deploy): T-P1-06/07 nginx 443 + admin service + certbot + .env.prod gitignore"
```

### D2 — DEPLOY.md

包含：
- B-NEW-1 SQL 片段（可直接复制）
- 域名配置 checklist
- 启动/签证书/冒烟/备份/回滚命令
- 故障排查（容器起不来、nginx 502、certbot 失败）

### D3 — go-live.sh

参数：`set -euo pipefail`
入口：判 docker 可用 + 判 .env.prod 存在 + 判 DOMAIN 参数
子命令：

```bash
start)    # docker compose up -d + 等 healthy + prisma migrate deploy + db seed
smoke)    # 10 冒烟（同 t06-prod-smoke.sh 内容）
ssl-init) # certbot certonly webroot + 复制证书 + restart nginx
logs)     # docker compose logs -f [service]
stop)     # docker compose down（不删卷）
backup)   # mysqldump → ./backups/yyyy-mm-dd-hhmmss.sql
```

### D4 — nginx.conf

把 line 74 `server_name yourdomain.com www.yourdomain.com;` 改为 `server_name _;` + `listen ... default_server;`

### D5 — 静态校验

```bash
docker compose -f docker-compose.prod.yml config --quiet && echo "✅ compose ok"
bash -n scripts/go-live.sh && echo "✅ bash syntax ok"
cd backend && npm run type-check && cd ..
cd frontend && npm run type-check && cd ..
cd admin && npm run type-check && cd ..
```

---

## 5. 验收标准

| # | 场景 | 命令 | 期望 |
|---|------|------|------|
| 1 | 工作区干净（除未跟踪）| `git status --short` | 仅 ?? .pm-tmp/ .codex/ 等 |
| 2 | compose 校验通过 | `docker compose config --quiet` | exit 0 |
| 3 | bash 语法通过 | `bash -n scripts/go-live.sh` | exit 0 |
| 4 | backend type-check | `cd backend && npm run type-check` | 0 error |
| 5 | frontend type-check | `cd frontend && npm run type-check` | 0 error |
| 6 | admin type-check | `cd admin && npm run type-check` | 0 error |
| 7 | DEPLOY.md 含 B-NEW-1 SQL | grep "ALTER USER" docs/DEPLOY.md | 命中 |
| 8 | go-live.sh 含全部子命令 | grep -E "^(start\|smoke\|ssl-init\|logs\|stop\|backup)" scripts/go-live.sh | 6 行 |

---

## 6. 风险与缓解

| 风险 | 缓解 |
|---|---|
| D4 default_server 影响真实多域名 | certbot 配 SAN 证书可覆盖多域 |
| 用户域名未解析就跑 ssl-init | 脚本 step 0 `dig +short` 失败早退 |
| compose up 后 MySQL 起不来 | 已配 healthcheck，等 healthy 15 次 × 5s 才进下一步 |
| MySQL ALTER USER 错密码格式 | DEPLOY.md 给完整 SQL 片段，避免手抖 |
| .env.prod 误提交 | .gitignore 双兜底 + git push 前 `git status` |

---

## 7. 不做清单

- 单元测试（V1.1 补）
- OSS 替换（V1.1 补）
- Sentry 接入（V1.1 补）
- P1 常规 22 项 / P2 19 项（V1.1+）
- 真实域名的 nginx 模板占位回退（D4 一次性解决）

---

## 8. 相关任务

- T-P1-06 生产 compose 启动
- T-P1-07 HTTPS 证书
- B-NEW-1 / B-NEW-2 / B-NEW-3 服务侧阻塞
