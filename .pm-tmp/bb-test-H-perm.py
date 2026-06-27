"""黑盒测试 - 模块 H: 权限与安全"""
import json
import sys
import io
import subprocess
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE_FE = "http://localhost:3000"
BASE_ADMIN = "http://localhost:3002"
BASE_API = "http://localhost:3001"

results = []

def check(name, ok, detail):
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}: {detail}")
    results.append({"name": name, "status": status, "detail": detail})

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # 用全新 ctx 测试未登录
    print("\n========= Module H: 权限 =========")
    ctx_anon = b.new_context()
    pg_anon = ctx_anon.new_page()
    # H-1: 未登录访问 /me 应跳 login
    pg_anon.goto(f"{BASE_FE}/me", wait_until="networkidle", timeout=15000)
    cur = pg_anon.url
    check("H-1 未登录 /me 跳 login", "/login" in cur, f"url={cur}")
    # H-2: 未登录访问 /admin 应跳 login (前端/后端)
    pg_anon.goto(f"{BASE_ADMIN}/dashboard", wait_until="networkidle", timeout=15000)
    cur2 = pg_anon.url
    check("H-2 未登录 /admin/dashboard 跳 login", "/login" in cur2, f"url={cur2}")

    # H-3: 未登录调 /api/v1/posts/me 应 401
    r = pg_anon.request.get(f"{BASE_API}/api/v1/posts/me")
    check("H-3 未登录 API /posts/me 返回 401", r.status == 401, f"status={r.status}")

    # H-4: 未登录调 /api/v1/admin/users 应 401
    r2 = pg_anon.request.get(f"{BASE_API}/api/v1/admin/users")
    check("H-4 未登录 API /admin/users 返回 401", r2.status == 401, f"status={r2.status}")

    # H-5: 普通用户 token 调 admin API 应 403
    ctx_user = b.new_context()
    pg_user = ctx_user.new_page()
    # 清 Redis cooldown
    subprocess.run(
        ["docker", "exec", "yichun-redis", "redis-cli", "-a", "yichun123456", "--no-auth-warning",
         "EVAL", "for _,k in ipairs(redis.call('keys', 'sms:*')) do redis.call('del', k) end return 'ok'", "0"],
        capture_output=True, timeout=10
    )
    pg_user.goto(f"{BASE_FE}/login", wait_until="networkidle", timeout=15000)
    pg_user.locator("input[type='tel']").first.fill("13900003333")
    pg_user.wait_for_timeout(500)
    pg_user.locator("button:has-text('获取验证码')").first.click()
    pg_user.wait_for_timeout(3000)
    r = subprocess.run(
        ["docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456",
         "yichun_db", "-N", "-B", "-e",
         "SELECT code FROM sms_codes WHERE phone='13900003333' AND consumed=0 ORDER BY id DESC LIMIT 1"],
        capture_output=True, text=True, timeout=10
    )
    code = r.stdout.strip()
    pg_user.locator("input[placeholder='6 位数字']").first.fill(code)
    pg_user.locator("button:has-text('登录')").last.click()
    pg_user.wait_for_timeout(4000)
    user_token = pg_user.evaluate("() => localStorage.getItem('yichun_access_token')")
    check("H-5-pre 普通用户登录成功", bool(user_token), f"token={'YES' if user_token else 'NO'}")

    if user_token:
        auth = {"Authorization": f"Bearer {user_token}"}
        # 普通用户调 admin API
        r3 = pg_user.request.get(f"{BASE_API}/api/v1/admin/users", headers=auth)
        check("H-5 普通用户调 /admin/users 应 403 (或 401)",
              r3.status in [401, 403],
              f"status={r3.status}")

        r4 = pg_user.request.get(f"{BASE_API}/api/v1/admin/dashboard", headers=auth)
        check("H-6 普通用户调 /admin/dashboard 应 403",
              r4.status in [401, 403],
              f"status={r4.status}")

        r5 = pg_user.request.post(f"{BASE_API}/api/v1/admin/users/1/ban",
                                    data={"reason": "权限测试"}, headers=auth)
        check("H-7 普通用户调 ban 应 403",
              r5.status in [401, 403],
              f"status={r5.status}")

        # H-8: 普通用户访问 /admin (前端)
        pg_user.goto(f"{BASE_ADMIN}/dashboard", wait_until="networkidle", timeout=15000)
        cur3 = pg_user.url
        check("H-8 普通用户访问 /admin/dashboard 跳 login",
              "/login" in cur3, f"url={cur3}")

    # H-9: 失效 token 应 401
    fake_auth = {"Authorization": "Bearer fake.invalid.token"}
    r6 = pg_anon.request.get(f"{BASE_API}/api/v1/auth/me", headers=fake_auth)
    check("H-9 假 token 应 401", r6.status == 401, f"status={r6.status}")

    # H-10: 越权 - 普通用户改别人帖子
    if user_token:
        r7 = pg_user.request.post(f"{BASE_API}/api/v1/posts/1",
                                    data={"title": "被改"},
                                    headers=auth, )
        # 实际看是否可改, 大概率 401/403/404
        check("H-10 普通用户改别人帖子应被拒",
              r7.status in [401, 403, 404, 405],
              f"status={r7.status}")

    b.close()

total = len(results)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = total - passed
print(f"\n========= Module H Summary =========")
print(f"Total: {total}, PASS: {passed}, FAIL: {failed}")

with open(r"e:\workspace\yichun-you-shi-er-shuo\.pm-tmp\report-H.json", "w", encoding="utf-8") as f:
    json.dump({"module": "H-perm", "results": results}, f, ensure_ascii=False, indent=2)
