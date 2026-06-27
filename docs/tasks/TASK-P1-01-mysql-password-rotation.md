# TASK-P1-01：MySQL + Redis + JWT 密码轮换

> **来源**：[yichun-phase1-tasks.md §T-P1-01](../yichun-phase1-tasks.md#t-p1-01-mysql--redis-密码轮换)
> **优先级**：🔴 P0 强阻塞
> **估时**：0.5h
> **依赖**：无
> **实施者**：Claude Code
> **审查者**：Codex
> **关联 F-1 教训**：file-type 锁 ^16.5.4 / sharp 锁 ^0.33.5 / main.ts webcrypto polyfill（**F-1 修复在 commit `466a647`，本次不动，只验证仍在**）
> **关联 MUST-1 教训**：JWT 密钥轮换 + 启动期强校验（已 commit `d2f3440`，本次补强）

---

## 1. 目标（一句话）

把 dev 环境的 MySQL root + user 密码、Redis 密码、JWT_SECRET 从仓库明文 `yichun123456` / `dev-jwt-secret-change-in-prod` 等弱值全部轮换为 `openssl rand -hex 16/32` 生成的强随机串，所有引用 .env / docker-compose 的位置同步更新；启动期强校验确保 .env 中弱密码 process.exit(1)。

## 2. 涉及文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `docker-compose.yml` | 修改 | MYSQL_ROOT_PASSWORD / MYSQL_PASSWORD / REDIS_PASSWORD 改 `${VAR:?VAR is required}` 强制从 .env 读 |
| `backend/.env` | 修改 | 写真实新密码（dev 用）|
| `backend/.env.example` | 修改 | 留占位符 + 注释"必须 ≥ 32 字符，启动期强校验" |
| `.env.prod.example` | 修改 | 同上 |
| `.gitignore` | 验证 | 确保 `backend/.env`、`.env.prod` 已在忽略列表 |
| `backend/src/main.ts` | 验证 | JWT_SECRET 启动期强校验是否到位（≥ 32 字符，否则 process.exit(1)）|

> **注意**：列出**所有**会动的文件。Claude 实施时若发现需要动其他文件，必须**先停下来报告 PM**，不得擅自扩大。

## 3. 实现要求

### 3.1 密码生成（Claude 执行）

```bash
# 4 个新密码
echo "MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)"
echo "MYSQL_PASSWORD=$(openssl rand -hex 16)"
echo "REDIS_PASSWORD=$(openssl rand -hex 16)"
echo "JWT_SECRET=$(openssl rand -hex 32)"  # 64 字符
```

> ⚠️ **不要**把输出 commit 到任何文件。直接把值粘到 .env。

### 3.2 docker-compose.yml 修改要点

**之前**（在文件里写死）：
```yaml
environment:
  MYSQL_ROOT_PASSWORD: yichun123456
  MYSQL_PASSWORD: yichun123456
```

**之后**（强制从 .env 读，缺值启动失败）：
```yaml
environment:
  MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}
  MYSQL_PASSWORD: ${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}
```

同理改 REDIS_PASSWORD。

### 3.3 backend/.env 修改要点

```env
DATABASE_URL="mysql://root:5c9e91fbb821027452c8d95ca7833996@localhost:3307/yichun_db"
REDIS_URL="redis://:8a1a34a6cc6f82de8d3fdd4fe1599dfc@localhost:6379"
JWT_SECRET="8ab26c48cf998a759abf0097ae0d49ecc276c471822d99e1584c82e74f217e55"

MYSQL_ROOT_PASSWORD=5c9e91fbb821027452c8d95ca7833996
MYSQL_PASSWORD=a281663c1f8eb9a5226cc56cb25a93c0
REDIS_PASSWORD=8a1a34a6cc6f82de8d3fdd4fe1599dfc
```

> ⚠️ 上述密码是**示例**。Claude 必须用 3.1 自己生成的密码覆盖。

### 3.4 backend/.env.example 修改要点

```env
# === 必须配置（启动期强校验：长度 < 32 直接 process.exit(1)）===
DATABASE_URL="mysql://root:CHANGE_ME_AT_LEAST_32_CHARS@localhost:3307/yichun_db"
REDIS_URL="redis://:CHANGE_ME_AT_LEAST_32_CHARS@localhost:6379"
JWT_SECRET="CHANGE_ME_AT_LEAST_64_CHARS_USE_OPENSSL_RAND_HEX_32"

# === MySQL 容器密码（仅 docker-compose 读取）===
# 必填；生成命令：openssl rand -hex 16
MYSQL_ROOT_PASSWORD=
# 必填；生成命令：openssl rand -hex 16
MYSQL_PASSWORD=
# 必填；生成命令：openssl rand -hex 16
REDIS_PASSWORD=
```

### 3.5 main.ts 启动期强校验（验证是否到位）

确认存在类似代码：

```ts
// backend/src/main.ts 顶部
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  console.error('Generate with: openssl rand -hex 32');
  process.exit(1);
}
```

如未到位，**加上**。

### 3.6 .gitignore 验证

```bash
cat .gitignore | grep -E "\.env(\b|$|\.|\.prod)"
# 期望输出：.env / .env.prod 等
```

如果 .env 没被忽略，加：
```gitignore
# 环境变量（含真实密码，禁止 commit）
.env
.env.prod
.env.local
.env.*.local
```

### 3.7 轮换流程

```bash
# 1. 停旧服务（不删数据卷）
cd E:\workspace\yichun-you-shi-er-shuo
docker compose down

# 2. 启动新密码（用 .env 注入）
docker compose up -d mysql redis

# 3. 验证新密码能连
docker compose exec mysql mysql -uroot -p<新 MYSQL_ROOT_PASSWORD> -e "SELECT 1"
# 期望：能连

# 4. 验证旧密码失效
docker compose exec mysql mysql -uroot -pyichun123456 -e "SELECT 1" 2>&1
# 期望：ERROR 1045 (28000): Access denied

# 5. 跑迁移
cd backend && npx prisma migrate deploy
# 期望：14 migrations already applied 或全 OK

# 6. 启后端
cd .. && cd backend && npm run start:dev &
# 期望：监听 3001，无 DB/Redis 连接错误
```

### 3.8 安全要求

- ⚠️ **绝不要**把真实密码 commit 到 git
- ⚠️ **绝不要** echo 密码到终端后再截图
- ⚠️ 跑 `git status` 确保 `backend/.env` 在 "Untracked" 或不被显示
- ⚠️ `git log -p backend/.env` 应该是空（如果之前 commit 过 .env，**必须**用 `git filter-repo` 清历史，**不要**只删当前 commit）

## 4. 验收标准

### 4.1 冒烟用例（必跑，必 PASS）

| # | 场景 | 命令 | 期望 | 实际 |
|---|------|------|------|------|
| 1 | .env 真实密码已变 | `grep MYSQL_PASSWORD backend/.env` | 输出 32 字符 hex（非 yichun123456）| [实施者填] |
| 2 | .env.example 是占位符 | `grep MYSQL_PASSWORD backend/.env.example` | 输出 `CHANGE_ME` 或 `=` 空 | [实施者填] |
| 3 | .env 被 gitignore | `git check-ignore backend/.env` | 输出 `backend/.env`（表示被忽略）| [实施者填] |
| 4 | .env 无 commit 历史 | `git log --all --oneline -- backend/.env` | 输出空 | [实施者填] |
| 5 | 旧密码失效 | `docker compose exec mysql mysql -uroot -pyichun123456 -e "SELECT 1"` | `ERROR 1045 Access denied` | [实施者填] |
| 6 | 新密码生效 | `docker compose exec mysql mysql -uroot -p<新密码> -e "SHOW TABLES"` | 17+ 张表 | [实施者填] |
| 7 | Redis 旧密码失效 | `redis-cli -a yichun123456 ping` | `NOAUTH` | [实施者填] |
| 8 | Redis 新密码生效 | `redis-cli -a <新密码> ping` | `PONG` | [实施者填] |
| 9 | Prisma 迁移 | `cd backend && npx prisma migrate deploy` | `14 migrations already applied` | [实施者填] |
| 10 | 后端启动 | `cd backend && npm run start:dev` | 监听 3001，log 无 DB 错误 | [实施者填] |
| 11 | 后端 health | `curl http://localhost:3001/api/v1/health` | 200 | [实施者填] |
| 12 | JWT_SECRET 长度 ≥ 32 | `grep ^JWT_SECRET backend/.env \| awk -F= '{print $2}' \| wc -c` | ≥ 33（含换行）| [实施者填] |
| 13 | 弱密码启动失败 | 把 backend/.env 的 JWT_SECRET 改成 `weak` + 重启 | 启动期 `process.exit(1)` | [实施者填] |

### 4.2 验收签字

- [ ] 13 冒烟用例全 PASS
- [ ] 实施者 commit 落地 + push origin/main
- [ ] 实施者交付消息含：
  - commit hash
  - 13 冒烟结果（含用例 13 弱密码启动失败的截图/日志）
  - 影响文件清单
  - **未 commit** 的 .env 真实密码**不要**贴到交付消息（PM 信任你）

## 5. 预计工时

- 密码生成 + .env 更新：10min
- docker-compose.yml + .env.example + main.ts：10min
- 5 轮换步骤（down/up/migrate/start）：10min
- 13 冒烟用例：10min

**合计**：0.5h

## 6. 特殊说明（V1 教训沉淀）

- ⚠️ **F-1 教训**：file-type 锁 ^16.5.4、sharp 锁 ^0.33.5、main.ts webcrypto polyfill。**本次只验证**这 3 个仍在，**不要**改 file-type/sharp 版本（**升 ^22 / ^0.35 必爆**）
- ⚠️ **MUST-1 教训**：JWT_SECRET 启动期强校验。如未到位必加，**不要**软警告
- ⚠️ **docker compose down -v 会删数据卷**，dev 数据可重建，prod 必须先备份
- ⚠️ **不要**改 schema.prisma、不要跑 `migrate dev`（只 `migrate deploy`）
- ⚠️ GitHub Actions CI 跑测试时如果用了 env，也需要把新密码同步到 GitHub Secrets（**不**在本次范围，留 TODO 给 PM）

## 7. 开发提示词（给 Claude 的额外提示）

```
你是一个严谨的 NestJS / Docker / 安全工程师。

任务：TASK-P1-01 - MySQL + Redis + JWT 密码轮换
仓库根目录：E:\workspace\yichun-you-shi-er-shuo

技术栈基线：
- 后端：NestJS 10 + Prisma 5 + MySQL 8 + Redis 7
- 部署：Docker Compose（dev）
- 鉴权：JWT 双 token（access 7d + refresh 30d）+ Redis 黑名单
- 重要约束：file-type@^16.5.4 / sharp@^0.33.5（**不要动**）
- 启动期强校验：JWT_SECRET < 32 字符直接 process.exit(1)

请严格按任务书 §3 实现要求执行。**不要**：
- 改 file-type / sharp 版本（F-1 教训）
- 改 schema.prisma 或跑 migrate dev（Prisma FULLTEXT 漂移教训）
- commit 真实 .env 到 git（违反 .gitignore）
- 把真实密码 echo 到终端日志后截图
- 添加任务书未列的依赖

请按以下步骤推进：
1. 用 `openssl rand -hex 16/32` 生成 4 个新密码（**只**写到 .env，不输出到聊天）
2. 改 `docker-compose.yml`：MYSQL_ROOT_PASSWORD / MYSQL_PASSWORD / REDIS_PASSWORD 改 `${VAR:?VAR is required}`
3. 改 `backend/.env`：写真实新密码（**gitignored，不 commit**）
4. 改 `backend/.env.example` 和 `.env.prod.example`：留占位符 + 注释
5. 验证 `.gitignore` 含 `.env` / `.env.prod`
6. 验证 `backend/src/main.ts` 顶部有 JWT_SECRET 长度校验（如无则加）
7. 跑 3.7 轮换流程
8. 跑 §4.1 13 冒烟用例
9. commit + push（**只** commit docker-compose.yml / .env.example / .env.prod.example / main.ts，**不** commit .env）
10. 输出交付消息：commit hash + 13 冒烟结果 + 影响文件清单

完成后等 Codex 审查。
```

---

## 8. PM 跟踪点

| 检查点 | 时机 | PM 动作 |
|---|---|---|
| **启动** | 用户说"开始" | PM 出本任务书 + 给出执行交接指令 |
| **实施中** | Claude 在跑 | PM 跟踪进度，记录到 project-memory §10.12 |
| **交付** | Claude 输出交付消息 | PM 验证 13 冒烟全 PASS + commit hash 真实 |
| **Codex 审查** | PM 收到交付后 | PM 出 Codex 审查指令（参考 [codex-review-rules.md §3 模板](../codex-review-rules.md#3-审查报告模板)）|
| **收尾** | Codex 评分 ≥ B | PM 更新 project-memory §10.12 / TASKS.md / CHANGELOG.md，标 T-P1-01 完成 |
| **回滚** | Codex 评分 C/D/F | PM 退回 Claude 重做 |

---

**📋 本任务书由 PM（Hermes）于 2026-06-15 发出。**  
**🤝 实施者：Claude Code。审查者：Codex。**  
**⏱️ 期望 0.5h 完成。**
