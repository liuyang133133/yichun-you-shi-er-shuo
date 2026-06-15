import subprocess, json, time
BASE = "http://localhost:3001/api/v1"
time.sleep(65)
subprocess.run(["curl","-s","-X","POST",f"{BASE}/auth/sms-code","-H","Content-Type: application/json","-d",'{"phone":"13800000000"}'], capture_output=True)
code = subprocess.run(["docker","exec","yichun-redis","redis-cli","get","sms:code:13800000000"], capture_output=True, text=True).stdout.strip()
print("code:", code)
r = subprocess.run(["curl","-s","-X","POST",f"{BASE}/auth/login-sms","-H","Content-Type: application/json","-d",json.dumps({"phone":"13800000000","code":code})], capture_output=True, text=True)
login = json.loads(r.stdout)
token = login["data"]["accessToken"]
PH = "XTOKENX"
hdr_value = "Bearer " + token
hdr = hdr_value.replace(token, PH)
print("hdr contains placeholder:", PH in hdr)

# 跑审核
r = subprocess.run(["curl","-s","-X","POST",f"{BASE}/admin/posts/18/audit","-H",hdr,"-H","Content-Type: application/json","-d",json.dumps({"action":"pass"})], capture_output=True, text=True)
# 替换回来在 subprocess 内部 — 用 env
import os
r = subprocess.run(["bash","-c",f'curl -s -X POST {BASE}/admin/posts/18/audit -H "{hdr_value}" -H "Content-Type: application/json" -d \'{json.dumps({"action":"pass"})}\''], capture_output=True, text=True, env={**os.environ, "TOK": token})
print("audit resp:", r.stdout[:300])

r = subprocess.run(["mysql","-h127.0.0.1","-P3307","-uyichun","-pyichun123456","--ssl-mode=DISABLED","yichun_db","-e","SELECT id, status, audit_status, audit_reason FROM posts WHERE id=18"], capture_output=True, text=True)
print("\nposts id=18:")
print(r.stdout)
r = subprocess.run(["mysql","-h127.0.0.1","-P3307","-uyichun","-pyichun123456","--ssl-mode=DISABLED","yichun_db","-e","SELECT id, admin_user_id, module, action, target_type, target_id, reason, created_at FROM audit_logs ORDER BY id DESC LIMIT 5"], capture_output=True, text=True)
print("audit_logs:")
print(r.stdout)
