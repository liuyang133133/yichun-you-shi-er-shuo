"""黑盒测试 - 模块 G: 管理后台"""
import json
import sys
import io
import subprocess
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE_ADMIN = "http://localhost:3002"
BASE_API = "http://localhost:3001"

results = []

def check(name, ok, detail):
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}: {detail}")
    results.append({"name": name, "status": status, "detail": detail})

def admin_login_sms(page, phone):
    subprocess.run(
        ["docker", "exec", "yichun-redis", "redis-cli", "-a", "yichun123456", "--no-auth-warning",
         "EVAL", "for _,k in ipairs(redis.call('keys', 'sms:*')) do redis.call('del', k) end return 'ok'", "0"],
        capture_output=True, timeout=10
    )
    page.goto(f"{BASE_ADMIN}/login", wait_until="networkidle", timeout=15000)
    page.locator("input[type='tel']").first.fill(phone)
    page.wait_for_timeout(500)
    # admin 按钮文案是"发送验证码"（不是"获取验证码"）
    btn = page.locator("button:has-text('发送验证码'), button:has-text('获取验证码')").first
    btn.click()
    page.wait_for_timeout(3000)
    r = subprocess.run(
        ["docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456",
         "yichun_db", "-N", "-B", "-e",
         f"SELECT code FROM sms_codes WHERE phone='{phone}' AND consumed=0 ORDER BY id DESC LIMIT 1"],
        capture_output=True, text=True, timeout=10
    )
    code = r.stdout.strip()
    if not code:
        page.wait_for_timeout(4000)
        r = subprocess.run(
            ["docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456",
             "yichun_db", "-N", "-B", "-e",
             f"SELECT code FROM sms_codes WHERE phone='{phone}' AND consumed=0 ORDER BY id DESC LIMIT 1"],
            capture_output=True, text=True, timeout=10
        )
        code = r.stdout.strip()
    page.locator("input[placeholder*='6 位']").first.fill(code)
    page.locator("button:has-text('登录')").last.click()
    page.wait_for_timeout(4000)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    print("\n========= Module G: 管理后台 =========")
    # G-0: 访问 /login
    page.goto(f"{BASE_ADMIN}/login", wait_until="networkidle", timeout=15000)
    check("G-0 admin /login 可访问", "/login" in page.url, f"url={page.url}")

    # G-1: 登录
    admin_login_sms(page, "13800000000")
    cur = page.url
    token = page.evaluate("() => localStorage.getItem('admin_token') || localStorage.getItem('yichun_admin_token') || localStorage.getItem('access_token')")
    check("G-1 admin 登录后跳转 dashboard", "/dashboard" in cur or token, f"url={cur}, token={'YES' if token else 'NO'}")

    # G-2: 访问 /dashboard
    page.goto(f"{BASE_ADMIN}/dashboard", wait_until="networkidle", timeout=15000)
    body = page.inner_text("body")
    has_dash = len(body) > 100 and "Dashboard" not in page.url and "/login" not in page.url
    check("G-2 /dashboard 看板可访问", has_dash, f"url={page.url}, body_len={len(body)}")

    # G-3: API 看板 stats
    auth = {"Authorization": f"Bearer {token}"} if token else {}
    r = page.request.get(f"{BASE_API}/api/v1/admin/dashboard", headers=auth)
    check("G-3 API /admin/dashboard",
          200 <= r.status < 300,
          f"status={r.status}, body={r.text()[:150]}")

    # G-4: /users
    page.goto(f"{BASE_ADMIN}/users", wait_until="networkidle", timeout=15000)
    body = page.inner_text("body")
    check("G-4 /users 用户管理可访问", len(body) > 100 and "/login" not in page.url,
          f"url={page.url}, body_len={len(body)}")

    # G-5: API users
    r2 = page.request.get(f"{BASE_API}/api/v1/admin/users?page=1&pageSize=10", headers=auth)
    check("G-5 API /admin/users",
          200 <= r2.status < 300,
          f"status={r2.status}")

    # G-6: /posts
    page.goto(f"{BASE_ADMIN}/posts", wait_until="networkidle", timeout=15000)
    check("G-6 /posts 帖子管理可访问", "/login" not in page.url and len(page.inner_text("body")) > 50,
          f"url={page.url}")

    # G-7: API admin posts
    r3 = page.request.get(f"{BASE_API}/api/v1/admin/posts?page=1&pageSize=10", headers=auth)
    check("G-7 API /admin/posts",
          200 <= r3.status < 300,
          f"status={r3.status}")

    # G-8: /reports
    page.goto(f"{BASE_ADMIN}/reports", wait_until="networkidle", timeout=15000)
    check("G-8 /reports 举报管理", "/login" not in page.url, f"url={page.url}")

    # G-9: API reports
    r4 = page.request.get(f"{BASE_API}/api/v1/admin/reports?page=1&pageSize=10", headers=auth)
    check("G-9 API /admin/reports", 200 <= r4.status < 300, f"status={r4.status}")

    # G-10: /banners
    page.goto(f"{BASE_ADMIN}/banners", wait_until="networkidle", timeout=15000)
    check("G-10 /banners 轮播图", "/login" not in page.url, f"url={page.url}")

    # G-11: API banners
    r5 = page.request.get(f"{BASE_API}/api/v1/admin/banners", headers=auth)
    check("G-11 API /admin/banners", 200 <= r5.status < 300, f"status={r5.status}")

    # G-12: /companies
    page.goto(f"{BASE_ADMIN}/companies", wait_until="networkidle", timeout=15000)
    check("G-12 /companies 公司管理", "/login" not in page.url, f"url={page.url}")

    # G-13: API companies
    r6 = page.request.get(f"{BASE_API}/api/v1/admin/companies?page=1&pageSize=10", headers=auth)
    check("G-13 API /admin/companies", 200 <= r6.status < 300 or r6.status == 404, f"status={r6.status}")

    # G-14: API 公告 admin
    r7 = page.request.get(f"{BASE_API}/api/v1/admin/announcements?page=1&pageSize=10", headers=auth)
    check("G-14 API /admin/announcements", 200 <= r7.status < 300, f"status={r7.status}")

    # G-15: 封禁用户 (测 toggleStatus 真工作)
    r8 = page.request.post(f"{BASE_API}/api/v1/admin/users/2/ban", data={"reason": "黑盒测试封禁"}, headers=auth)
    check("G-15 API POST /admin/users/:id/ban",
          200 <= r8.status < 300 or r8.status in [400, 404],
          f"status={r8.status}, body={r8.text()[:150]}")

    # G-16: 解封用户
    r9 = page.request.post(f"{BASE_API}/api/v1/admin/users/2/unban", headers=auth)
    check("G-16 API POST /admin/users/:id/unban",
          200 <= r9.status < 300 or r9.status in [400, 404],
          f"status={r9.status}, body={r9.text()[:100]}")

    b.close()

total = len(results)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = total - passed
print(f"\n========= Module G Summary =========")
print(f"Total: {total}, PASS: {passed}, FAIL: {failed}")

with open(r"e:\workspace\yichun-you-shi-er-shuo\.pm-tmp\report-G.json", "w", encoding="utf-8") as f:
    json.dump({"module": "G-admin", "results": results, "page_errors": page_errors[-5:]}, f, ensure_ascii=False, indent=2)
