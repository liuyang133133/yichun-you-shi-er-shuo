#!/bin/bash
# T-P1-05 Admin 业务流真测

set -e
cd /e/workspace/yichun-you-shi-er-shuo

curl -s -X POST http://localhost:3001/api/v1/auth/sms-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000000"}' > /dev/null

SC=$(docker exec yichun-redis redis-cli get sms:code:13800000000 | tr -d '\r')
echo "STEP-1 sms code: $SC"

LOGIN_RESP=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-sms \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"13800000000\",\"code\":\"$SC\"}")

ADMIN_TOKEN=*** "$LOGIN_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "STEP-2 token len: ${#ADMIN_TOKEN}"

echo ""
echo "=== STEP-3 /auth/me 验证 role=admin ==="
curl -s http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer $ADMIN...echo ""

echo ""
echo "=== STEP-4 /admin/dashboard ==="
curl -s http://localhost:3001/api/v1/admin/dashboard \
  -H "Authorization: Bearer $ADMIN...echo ""

echo ""
echo "=== STEP-5 /admin/posts?auditStatus=pending ==="
PENDING_JSON=$(curl -s "http://localhost:3001/api/v1/admin/posts?auditStatus=pending" \
  -H "Authorization: Bearer *** | head -c 500)
echo "$PENDING_JSON"

POST_ID=$(echo "$PENDING_JSON" | grep -o '"id":"[0-9]*"' | head -1 | cut -d'"' -f4)
echo ""
echo "STEP-6 待审 POST_ID: $POST_ID"

if [ -n "$POST_ID" ]; then
  echo ""
  echo "=== STEP-7 审核通过 ==="
  curl -s -X POST "http://localhost:3001/api/v1/admin/posts/$POST_ID/audit" \
    -H "Authorization: Bearer *** \
    -H "Content-Type: application/json" \
    -d '{"action":"pass"}'
  echo ""

  echo ""
  echo "=== STEP-8 posts 表状态 ==="
  mysql -h127.0.0.1 -P3307 -uyichun -pyichun123456 --ssl-mode=DISABLED yichun_db \
    -e "SELECT id, status, audit_status FROM posts WHERE id=$POST_ID" 2>&1 | grep -v Warning

  echo ""
  echo "=== STEP-9 audit_logs 落库 ==="
  mysql -h127.0.0.1 -P3307 -uyichun -pyichun123456 --ssl-mode=DISABLED yichun_db \
    -e "SELECT id, admin_user_id, module, action, target_id, created_at FROM audit_logs ORDER BY id DESC LIMIT 3" 2>&1 | grep -v Warning
fi
