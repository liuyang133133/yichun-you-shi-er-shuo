#!/bin/bash
# T-P1-07 HTTPS 证书 + nginx 443
# 需用户公网域名 + 80 端口公网可达
# ============================================================

set -e

DOMAIN="${1:-yourdomain.com}"
EMAIL="${2:-admin@yourdomain.com}"
WWW_DOMAIN="www.${DOMAIN}"

echo "============================================"
echo "T-P1-07 HTTPS 证书 ($DOMAIN)"
echo "============================================"

# Step 0: DNS 验证
echo "Step 0: 验证 DNS A 记录 (需用户在域名商设置)"
ip=$(dig +short "$DOMAIN" | head -1)
if [ -z "$ip" ]; then
  echo "❌ DNS 未解析 $DOMAIN,中止"
  exit 1
fi
echo "✅ $DOMAIN -> $ip"

# Step 1: 启动 nginx (临时,80 端口可达)
cd /e/workspace/yichun-you-shi-er-shuo
echo "Step 1: 启动 nginx (certbot webroot 模式)"
docker compose -f docker-compose.prod.yml up -d nginx

# Step 2: 签发证书
echo "Step 2: certbot 签发"
docker run --rm \
  -v "$(pwd)/docker/nginx/certs:/etc/letsencrypt" \
  -v "$(pwd)/docker/nginx/certbot/www:/var/www/certbot:rw" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" -d "$WWW_DOMAIN" \
  --email "$EMAIL" \
  --agree-tos --no-eff-email

# Step 3: 复制证书
echo "Step 3: 复制证书到 nginx 卷"
cp docker/nginx/certs/live/$DOMAIN/fullchain.pem docker/nginx/certs/
cp docker/nginx/certs/live/$DOMAIN/privkey.pem docker/nginx/certs/
chmod 644 docker/nginx/certs/*.pem

# Step 4: 修改 nginx.conf 加 443 server block
echo "Step 4: nginx.conf 加 443 server block (由 PM 出配置 patch)"

# Step 5: 重启 nginx
echo "Step 5: 重启 nginx"
docker compose -f docker-compose.prod.yml restart nginx

# Step 6: 7 冒烟
echo "Step 6: 7 冒烟"
echo "--- 1. HTTP 跳 HTTPS ---"
curl -sI "http://$DOMAIN" | head -3
echo "--- 2. HTTPS 证书有效 ---"
echo | openssl s_client -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null | head -3
echo "--- 3. HTTPS 后端 API ---"
curl -s "https://$DOMAIN/api/v1/health" | head -c 200
echo ""
echo "--- 4. HTTPS 前端 ---"
curl -sI "https://$DOMAIN/" | head -3
echo "--- 5. HTTPS admin ---"
curl -sI "https://$DOMAIN/admin/" | head -3
echo "--- 6. 浏览器无证书警告 ---"
echo "  ⚠️  需用户在浏览器实际打开 https://$DOMAIN/ 验证"
echo "--- 7. SSL Labs A 评级 ---"
echo "  ⚠️  需用户到 https://www.ssllabs.com/ssltest/ 验证"

echo "✅ T-P1-07 7 冒烟完成"
