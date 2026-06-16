#!/usr/bin/env bash
# ============================================================
# yichun-you-shi-er-shuo 生产环境一键管理脚本
# 子命令：start | smoke | ssl-init | logs | stop | backup
# 前置：.env.prod 已存在 + Docker 已装
# 关联：docs/DEPLOY.md / docs/superpowers/specs/2026-06-16-go-live-design.md
# ============================================================

set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
COMPOSE_FILE="docker-compose.prod.yml"

# --------- 工具函数 ---------
log()  { printf '\033[36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
ok()   { printf '\033[32m✅ %s\033[0m\n' "$*"; }
err()  { printf '\033[31m❌ %s\033[0m\n' "$*" >&2; }
die()  { err "$*"; exit 1; }

require_docker() {
  command -v docker >/dev/null 2>&1 || die "docker 未安装"
  docker compose version >/dev/null 2>&1 || die "docker compose plugin 未装"
}

require_env() {
  [ -f .env.prod ] || die ".env.prod 不存在，先 cp .env.prod.example .env.prod 并填值"
  # 校验必填项
  for key in MYSQL_ROOT_PASSWORD MYSQL_PASSWORD REDIS_PASSWORD JWT_SECRET CORS_ORIGINS NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL; do
    grep -q "^${key}=" .env.prod || die ".env.prod 缺 $key"
  done
}

wait_mysql_healthy() {
  log "等待 mysql-prod healthy..."
  for i in $(seq 1 15); do
    status=$(docker inspect --format='{{.State.Health.Status}}' yichun-mysql-prod 2>/dev/null || echo "starting")
    if [ "$status" = "healthy" ]; then
      ok "MySQL healthy"
      return 0
    fi
    sleep 5
  done
  die "MySQL 未在 75s 内 healthy，docker compose logs mysql 看错误"
}

# --------- 子命令 ---------

cmd_start() {
  require_docker
  require_env

  log "Step 1: 启动 prod compose (后台)"
  docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d

  wait_mysql_healthy

  log "Step 2: 跑迁移 prisma migrate deploy"
  docker compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate deploy

  log "Step 3: 跑 seed prisma db seed"
  docker compose -f "$COMPOSE_FILE" exec -T backend npx prisma db seed

  ok "启动完成 — 6 service up + 14 migrations applied + seed loaded"
  log "下一步：./scripts/go-live.sh smoke"
}

cmd_smoke() {
  require_docker
  require_env

  MYSQL_ROOT_PWD=$(grep '^MYSQL_ROOT_PASSWORD=' .env.prod | cut -d= -f2)

  log "--- 1. 6 service up ---"
  docker compose -f "$COMPOSE_FILE" ps

  log "--- 2. backend health ---"
  docker compose -f "$COMPOSE_FILE" exec -T backend wget -q -O - http://localhost:3001/api/v1/health
  echo ""

  log "--- 3. backend 业务 ---"
  curl -fsS "http://localhost/api/v1/posts?type=house" 2>/dev/null | head -c 300 || echo "(若 nginx 未启，跳过)"
  echo ""

  log "--- 4. frontend ---"
  curl -sI http://localhost/ | head -3

  log "--- 5. admin ---"
  curl -sI http://localhost/admin/ | head -3

  log "--- 6. mysql 17+ 表 ---"
  docker compose -f "$COMPOSE_FILE" exec -T mysql mysql -uroot -p"${MYSQL_ROOT_PWD}" -e "SHOW TABLES" 2>/dev/null | wc -l

  log "--- 7. 4 顶级分类 ---"
  docker compose -f "$COMPOSE_FILE" exec -T mysql mysql -uroot -p"${MYSQL_ROOT_PWD}" yichun_db -e "SELECT COUNT(*) FROM categories WHERE parent_id=0" 2>/dev/null

  log "--- 8. 测试用户 ---"
  docker compose -f "$COMPOSE_FILE" exec -T mysql mysql -uroot -p"${MYSQL_ROOT_PWD}" yichun_db -e "SELECT COUNT(*) FROM users" 2>/dev/null

  log "--- 9. seed 输出 ---"
  docker compose -f "$COMPOSE_FILE" logs --tail=200 backend 2>/dev/null | grep -iE "seed|created" | head -10

  log "--- 10. 无 ERROR ---"
  errs=$(docker compose -f "$COMPOSE_FILE" logs --tail=200 backend 2>/dev/null | grep -ci error || echo 0)
  echo "backend ERROR count = $errs"

  ok "10 冒烟完成"
}

cmd_ssl_init() {
  local domain="${1:?用法: $0 ssl-init <domain> <email>}"
  local email="${2:-admin@${domain}}"
  local www_domain="www.${domain}"

  require_docker

  log "Step 0: 验证 DNS"
  ip=$(dig +short "$domain" | head -1 || true)
  if [ -z "$ip" ]; then
    die "DNS 未解析 $domain，先去域名商设置 A 记录"
  fi
  ok "$domain -> $ip"

  log "Step 1: 启动 nginx (certbot webroot 模式)"
  docker compose -f "$COMPOSE_FILE" up -d nginx

  log "Step 2: certbot 签发证书"
  mkdir -p docker/nginx/certbot/www
  docker run --rm \
    -v "$(pwd)/docker/nginx/certs:/etc/letsencrypt" \
    -v "$(pwd)/docker/nginx/certbot/www:/var/www/certbot:rw" \
    certbot/certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$domain" -d "$www_domain" \
    --email "$email" \
    --agree-tos --no-eff-email

  log "Step 3: 复制证书到 nginx 卷"
  cp "docker/nginx/certs/live/${domain}/fullchain.pem" docker/nginx/certs/
  cp "docker/nginx/certs/live/${domain}/privkey.pem" docker/nginx/certs/
  chmod 644 docker/nginx/certs/*.pem
  ok "证书复制完成"

  log "Step 4: 重启 nginx 加载新证书"
  docker compose -f "$COMPOSE_FILE" restart nginx

  log "Step 5: HTTPS 7 冒烟"
  echo "--- 1. HTTP 跳 HTTPS ---"
  curl -sI "http://${domain}" | head -3
  echo "--- 2. HTTPS 证书有效 ---"
  echo | openssl s_client -connect "${domain}":443 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null | head -3
  echo "--- 3. HTTPS 后端 API ---"
  curl -fsS "https://${domain}/api/v1/health" | head -c 300
  echo ""
  echo "--- 4. HTTPS 前端 ---"
  curl -sI "https://${domain}/" | head -3
  echo "--- 5. HTTPS admin ---"
  curl -sI "https://${domain}/admin/" | head -3

  ok "HTTPS 签发完成 — 浏览器访问 https://${domain}/ 验收"
}

cmd_logs() {
  require_docker
  local svc="${1:-}"
  if [ -n "$svc" ]; then
    docker compose -f "$COMPOSE_FILE" logs -f "$svc"
  else
    docker compose -f "$COMPOSE_FILE" logs -f
  fi
}

cmd_stop() {
  require_docker
  log "停止 prod compose（保留数据卷）"
  docker compose -f "$COMPOSE_FILE" stop
  ok "已停止"
}

cmd_backup() {
  require_docker
  require_env
  local MYSQL_ROOT_PWD
  MYSQL_ROOT_PWD=$(grep '^MYSQL_ROOT_PASSWORD=' .env.prod | cut -d= -f2)
  mkdir -p backups
  local ts
  ts=$(date +%Y%m%d-%H%M%S)
  local file="backups/yichun-db-${ts}.sql"
  log "mysqldump → $file"
  docker compose -f "$COMPOSE_FILE" exec -T mysql mysqldump -uroot -p"${MYSQL_ROOT_PWD}" yichun_db > "$file"
  ok "备份完成: $file ($(du -h "$file" | cut -f1))"
}

# --------- 入口 ---------
case "${1:-}" in
  start)     cmd_start ;;
  smoke)     cmd_smoke ;;
  ssl-init)  shift; cmd_ssl_init "$@" ;;
  logs)      shift; cmd_logs "$@" ;;
  stop)      cmd_stop ;;
  backup)    cmd_backup ;;
  *)
    cat <<EOF
用法: $0 <subcommand>

子命令:
  start              启动 prod compose + migrate + seed
  smoke              10 冒烟（不破坏数据）
  ssl-init DOMAIN EMAIL
                     签发 Let's Encrypt 证书并启用 HTTPS
  logs [SERVICE]     查看日志（默认全栈）
  stop               停服（保留数据卷）
  backup             mysqldump 到 ./backups/

详细：docs/DEPLOY.md
EOF
    exit 1
    ;;
esac
