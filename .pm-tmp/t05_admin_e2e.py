import subprocess
import json

BASE = "http://localhost:3001/api/v1"
H_TEMPLATE = "Authorization: Bearer {TOK}"

# 拿 token
subprocess.run([
    "curl", "-s", "-X", "POST", f"{BASE}/auth/sms-code",
    "-H", "Content-Type: application/json",
    "-d", '{"phone":"13800000000"}'
], capture_output=True)
code = subprocess.run([
    "docker", "exec", "yichun-redis", "redis-cli", "get", "sms:code:13800000000"
], capture_output=True, text=True).stdout.strip()
login = json.loads(subprocess.run([
    "curl", "-s", "-X", "POST", f"{BASE}/auth/login-sms",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"phone":"13800000000","code":code})
], capture_output=True, text=True).stdout)
token = login["data"]["accessToken"]
H = ["-H", H_TEMPLATE.replace("{TOK}", token)]

# /admin/posts 看完整结构
r = subprocess.run(["curl","-s",f"{BASE}/admin/posts?auditStatus=pending"] + H, capture_output=True, text=True)
posts_resp = json.loads(r.stdout)
print(f"admin/posts 响应 code: {posts_resp.get('code')}")
data = posts_resp.get('data')
print(f"data type: {type(data).__name__}")
if isinstance(data, dict):
    print(f"data keys: {list(data.keys())}")
    items = data.get('list') or data.get('items') or data.get('data') or []
    print(f"list type: {type(items).__name__}, len: {len(items) if hasattr(items, '__len__') else 'N/A'}")
    if isinstance(items, list) and items:
        first = items[0]
        print(f"first: id={first.get('id')}, auditStatus={first.get('auditStatus')}, status={first.get('status')}, title={first.get('title')}")

# 看 posts 表全部状态
r = subprocess.run([
    "mysql","-h127.0.0.1","-P3307","-uyichun","-pyichun123456",
    "--ssl-mode=DISABLED","yichun_db",
    "-e","SELECT id, type, status, audit_status, title FROM posts ORDER BY id"
], capture_output=True, text=True)
print(f"\nposts 表全部:\n{r.stdout}")
