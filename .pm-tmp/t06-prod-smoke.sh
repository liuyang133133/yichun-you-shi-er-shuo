#!/bin/bash
# T-P1-06 生产 compose 启动 + 10 冒烟
# 需用户授权真实环境运行
# ============================================================

set -e
cd /e/workspace/yichun-you-shi-er-shuo

echo "============================================"
echo "T-P1-06 生产 compose 启动 + 10 冒烟"
echo "============================================"

# Step 0: 准备 .env.prod
if [ ! -f .env.prod ]; then
  echo "Step 0: 创建 .env.prod (gitignored)"
  cp .env.prod.example .env.prod
  # 生成新密码
  MYSQL_ROOT_PWD=$(openssl rand -hex 16)
  MYSQL_PWD=$(openssl rand -hex 16)
  REDIS_PWD=$(openssl rand -hex 16)
  JWT_SEC=$(openssl rand -hex 32)
  # 用 sed 替换占位符 (这里需要人工确认或用更智能的 sed)
  # 推荐: 人工编辑 .env.prod 填入
  echo "⚠️  请人工编辑 .env.prod 填入:"
  echo "    MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PWD}"
  echo "    MYSQL_PASSWORD=${MYSQL_PWD}"
  echo "    REDIS_PASSWORD=${REDIS_PWD}"
  echo "    JWT_SECRET=${JWT_SEC}"
  echo "    CORS_ORIGINS=https://yourdomain.com"
  echo "    NEXT_PUBLIC_API_URL=https://api.yourdomain.com"
  echo "    NEXT_PUBLIC_SITE_URL=https://yourdomain.com"
  exit 1
fi

echo "Step 1: 启动 prod compose (新容器,不破坏 dev 容器)"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
echo "✅ 启动命令已发,容器在 background 起"

echo ""
echo "Step 2: 等 mysql healthy"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  status=$(docker inspect --format='{{.State.Health.Status}}' yichun-mysql-prod 2>/dev/null)
  echo "  尝试 $i: mysql-prod status = $status"
  if [ "$status" = "healthy" ]; then
    echo "✅ MySQL healthy"
    break
  fi
  sleep 5
done

echo ""
echo "Step 3: 跑迁移"
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

echo ""
echo "Step 4: 跑 seed"
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed

echo ""
echo "Step 5: 10 冒烟用例"
echo "--- 1. 6 service up ---"
docker compose -f docker-compose.prod.yml ps
echo "--- 2. backend health (容器内) ---"
docker compose -f docker-compose.prod.yml exec backend wget -q -O - http://localhost:3001/api/v1/health
echo ""
echo "--- 3. backend 业务 (走 nginx 80 端口) ---"
curl -s http://localhost:80/api/v1/posts?type=house | head -c 300
echo ""
echo "--- 4. frontend (走 nginx 80) ---"
curl -sI http://localhost:80/ | head -5
echo "--- 5. admin (走 nginx 80 /admin) ---"
curl -sI http://localhost:80/admin/ | head -5
echo "--- 6. mysql 17+ 表 ---"
docker compose -f docker-compose.prod.yml exec mysql mysql -uroot -p"${MYSQL_ROOT_PWD}" -e "SHOW TABLES" | wc -l
echo "--- 7. 4 顶级分类 ---"
docker compose -f docker-compose.prod.yml exec mysql mysql -uroot -p"${MYSQL_ROOT_PWD}" yichun_db -e "SELECT COUNT(*) FROM categories WHERE parent_id=0"
echo "--- 8. 1 测试用户 ---"
docker compose -f docker-compose.prod.yml exec mysql mysql -uroot -p"${MYSQL_ROOT_PWD}" yichun_db -e "SELECT COUNT(*) FROM users"
echo "--- 9. seed 输出 ---"
docker compose -f docker-compose.prod.yml logs backend | grep -E "seed|Created" | head -10
echo "--- 10. 无 ERROR 日志 ---"
docker compose -f docker-compose.prod.yml logs --tail=200 backend | grep -i error | head -5

echo ""
echo "✅ T-P1-06 10 冒烟完成"
