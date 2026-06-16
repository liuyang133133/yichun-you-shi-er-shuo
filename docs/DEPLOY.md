# V1.0 部署运行手册（Production Go-Live Runbook）

> **目标**：把 `yichun-you-shi-er-shuo` V1.0 部署到生产环境并签 HTTPS 证书。
> **前置**：公网域名已注册 + DNS A 记录已解析到本机公网 IP + 80/443 端口对外可达。
> **总用时**：约 1.5 小时（含等待 + 验收）。
> **关联**：spec → `docs/superpowers/specs/2026-06-16-go-live-design.md`，plan → `docs/superpowers/plans/2026-06-16-go-live.md`

---

## 0. 前置 checklist

- [ ] 公网域名（例：`yichun.example.com`）
- [ ] DNS A 记录：`yichun.example.com` → 服务器公网 IP（dig 验证：`dig +short yichun.example.com`）
- [ ] 服务器 80 / 443 端口未被防火墙拦截（`curl -I http://yichun.example.com` 应返回 nginx 响应或连接拒绝但端口可达）
- [ ] Docker / Docker Compose 已装（`docker --version` ≥ 20.10）
- [ ] 本仓库已 clone 到服务器

---

## 1. 服务侧密码轮换（B-NEW-1）

> **目的**：把仓库 `backend/.env` / `docker-compose.prod.yml` 引用的 MySQL/Redis 密码从 dev 默认值同步到生产新密码。
> **场景**：Phase 1 commit `4c0d5c0` 已生成新密码并写入 `.env.prod`，但 MySQL/Redis 服务容器内的用户密码仍是 `yichun123456`。执行以下 SQL 让服务侧同步。

### 1.1 进入 dev compose MySQL 容器

```bash
cd /e/workspace/yichun-you-shi-er-shuo
docker compose exec mysql mysql -uroot -p"$(grep '^MYSQL_ROOT_PASSWORD=' .env.prod | cut -d= -f2)"
```

> 注：dev compose 与 prod compose 用的是**不同容器**（dev = `yichun-mysql-dev`，prod = `yichun-mysql-prod`）。如果 dev compose 密码已是新值（commit `4c0d5c0` 后轮换过），跳过本步。

### 1.2 同步密码

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '<MYSQL_ROOT_PASSWORD 来自 .env.prod>';
ALTER USER 'yichun'@'%' IDENTIFIED BY '<MYSQL_PASSWORD 来自 .env.prod>';
FLUSH PRIVILEGES;
```

> 完整 SQL 片段（直接复制，替换占位符）：
>
> ```sql
> -- 从 .env.prod 读取真实密码
> SET @root_pwd = '<填 MYSQL_ROOT_PASSWORD>';
> SET @user_pwd = '<填 MYSQL_PASSWORD>';
> ALTER USER 'root'@'localhost' IDENTIFIED BY @root_pwd;
> ALTER USER 'yichun'@'%' IDENTIFIED BY @user_pwd;
> FLUSH PRIVILEGES;
> ```

### 1.3 验证

```bash
docker compose exec mysql mysql -uroot -p"<MYSQL_ROOT_PASSWORD>" -e "SELECT 1"
```

Expected: `1` (single row)

### 1.4 Redis 密码轮换（如果 dev compose Redis 仍用旧密码）

```bash
docker compose exec redis redis-cli -a "<REDIS_PASSWORD 来自 .env.prod>" PING
```

Expected: `PONG`

---

## 2. 编辑 `.env.prod` 真实域值

```bash
cd /e/workspace/yichun-you-shi-er-shuo
cp .env.prod.example .env.prod   # 如果 .env.prod 不存在
$EDITOR .env.prod
```

修改以下 4 行（替换占位符）：

```bash
CORS_ORIGINS=https://yichun.example.com,https://www.yichun.example.com
NEXT_PUBLIC_API_URL=https://yichun.example.com/api/v1
NEXT_PUBLIC_SITE_URL=https://yichun.example.com
CAPTCHA_PROVIDER=turnstile    # 生产 fail-closed，生产前配 TURNSTILE_SECRET
```

> 其余密码（`MYSQL_*_PASSWORD` / `REDIS_PASSWORD` / `JWT_SECRET`）保持 commit `4c0d5c0` 写入的值，**不要重新生成**（会让 §1 的 ALTER USER 失效）。

---

## 3. 一键启动生产 compose

```bash
./scripts/go-live.sh start
```

脚本会：
1. `docker compose -f docker-compose.prod.yml up -d` 启动 6 service（mysql/redis/backend/frontend/admin/nginx）
2. 等 MySQL `healthy`（最长 75 秒）
3. 跑 `npx prisma migrate deploy`（14 migrations）
4. 跑 `npx prisma db seed`（4 顶级分类 + 25 子分类 + 测试用户）

Expected: 全部步骤打印 `✅`，最后一行 `✅ 启动完成`。

---

## 4. 10 冒烟

```bash
./scripts/go-live.sh smoke
```

Expected: 10 个用例全部 `✅`。详见 `docs/yichun-phase1-tasks.md §T-P1-06`。

---

## 5. 签 HTTPS 证书（需公网域名 + 80 端口可达）

```bash
./scripts/go-live.sh ssl-init yichun.example.com admin@yichun.example.com
```

脚本会：
1. DNS 验证（dig +short）
2. 用 webroot 模式让 certbot 签发证书（不中断 nginx）
3. 复制证书到 `docker/nginx/certs/`
4. 重启 nginx
5. 跑 7 个 HTTPS 冒烟

Expected: 证书签发成功 + `curl https://yichun.example.com/api/v1/health` 返回 200。

---

## 6. 浏览器验收

1. 打开 https://yichun.example.com
   - 预期：锁图标 + 绿色 + 首页 4 大模块展示
2. 打开 https://yichun.example.com/admin/
   - 预期：管理后台登录页
3. 用 seed 出的 admin 账号登录（默认 `13800000000` + 验证码 `123456`，SMS 为 mock，控制台查看）
4. 进入 `/admin/dashboard`，预期看到 9 字段看板数据
5. 进入 `/admin/posts?auditStatus=pending`，审核一条帖子

---

## 7. 日常运维

```bash
./scripts/go-live.sh logs              # 全栈实时日志
./scripts/go-live.sh logs backend      # 单服务日志
./scripts/go-live.sh backup            # mysqldump → ./backups/
./scripts/go-live.sh stop              # 停服（不删卷）
```

证书自动续期：compose 内 `certbot` 容器每 12 小时跑 `certbot renew`。

---

## 8. 故障排查

| 症状 | 排查 |
|---|---|
| `mysql-prod` 一直 `starting` | 看 `docker compose logs mysql`，多半是密码格式（MySQL 8 需 ≥ 8 字符） |
| `backend` 起不来，密码错 | 检查 `docker compose exec backend env \| grep DATABASE_URL` |
| nginx 502 | `docker compose logs backend frontend admin` 看上游 |
| certbot 签发失败 | DNS 未解析 / 80 端口被运营商封 / rate limit |
| `https://your-domain/` 证书警告 | nginx 还在用旧 `default_server` 模式，确认 `docker compose exec nginx ls /etc/nginx/certs` |

---

## 9. 回滚

```bash
./scripts/go-live.sh stop
# 不删卷，保留数据
# 重新跑 ./scripts/go-live.sh start 即可恢复
```

---

**🤝 上线完成判定**：完成 §0~§6 所有步骤且浏览器验收通过 → PM 更新 `project-memory.md` §10.11。
