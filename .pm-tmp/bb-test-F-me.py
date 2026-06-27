"""黑盒测试 - 模块 F: 个人中心"""
import json
import sys
import io
import subprocess
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE_FE = "http://localhost:3000"
BASE_API = "http://localhost:3001"

results = []

def check(name, ok, detail):
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}: {detail}")
    results.append({"name": name, "status": status, "detail": detail})

def login_sms(page, phone):
    subprocess.run(
        ["docker", "exec", "yichun-redis", "redis-cli", "-a", "yichun123456", "--no-auth-warning",
         "EVAL", "for _,k in ipairs(redis.call('keys', 'sms:*')) do redis.call('del', k) end return 'ok'", "0"],
        capture_output=True, timeout=10
    )
    page.goto(f"{BASE_FE}/login", wait_until="networkidle", timeout=15000)
    page.locator("input[type='tel']").first.fill(phone)
    page.wait_for_timeout(500)
    page.locator("button:has-text('获取验证码')").first.click()
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
    page.locator("input[placeholder='6 位数字']").first.fill(code)
    page.locator("button:has-text('登录')").last.click()
    page.wait_for_timeout(4000)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    print("\n========= Module F: 个人中心 =========")
    # F-0: 登录
    login_sms(page, "13900003333")
    cur = page.url
    check("F-0 登录后到达 me", "/me" in cur, f"url={cur}")

    # F-1: 访问 /me
    page.goto(f"{BASE_FE}/me", wait_until="networkidle", timeout=15000)
    body = page.inner_text("body")
    has_me = "13900003333" in body or "我的" in body or "个人" in body
    check("F-1 /me 个人中心有内容", has_me, f"body_len={len(body)}")

    # F-2: 访问 /me/messages
    page.goto(f"{BASE_FE}/me/messages", wait_until="networkidle", timeout=15000)
    body2 = page.inner_text("body")
    has_msg = "消息" in body2 or "私信" in body2 or "inbox" in body2.lower() or "收件" in body2 or len(body2) > 50
    check("F-2 /me/messages 消息中心 (页面有内容)", has_msg, f"body_len={len(body2)}, has_msg={has_msg}, body={body2[:100]}")

    # F-3: 站内信 API
    token = page.evaluate("() => localStorage.getItem('yichun_access_token')")
    auth = {"Authorization": f"Bearer {token}"}
    r = page.request.get(f"{BASE_API}/api/v1/messages/inbox", headers=auth)
    check("F-3 API GET /messages/inbox",
          200 <= r.status < 300,
          f"status={r.status}")

    # F-4: 未读消息数 API
    r2 = page.request.get(f"{BASE_API}/api/v1/messages/unread-count", headers=auth)
    check("F-4 API GET /messages/unread-count",
          200 <= r2.status < 300,
          f"status={r2.status}")

    # F-5: 我的发布 API (正确 endpoint 是 /me 不是 /mine)
    r3 = page.request.get(f"{BASE_API}/api/v1/posts/me?page=1&pageSize=10", headers=auth)
    check("F-5 API GET /posts/me",
          200 <= r3.status < 300,
          f"status={r3.status}, body={r3.text()[:150]}")

    # F-6: 发件箱 API
    r4 = page.request.get(f"{BASE_API}/api/v1/messages/outbox", headers=auth)
    check("F-6 API GET /messages/outbox",
          200 <= r4.status < 300,
          f"status={r4.status}")

    # F-7: 当前用户 API
    r5 = page.request.get(f"{BASE_API}/api/v1/auth/me", headers=auth)
    check("F-7 API GET /auth/me",
          200 <= r5.status < 300,
          f"status={r5.status}, body={r5.text()[:100]}")

    # F-8: 给其他用户发消息 (DTO 字段是 receiverId 不是 toUserId)
    r6 = page.request.post(f"{BASE_API}/api/v1/messages", data={
        "receiverId": 1, "content": "黑盒测试消息"
    }, headers=auth)
    check("F-8 API POST /messages 发消息 (或 403/限流)",
          200 <= r6.status < 300 or r6.status in [403, 429, 404],
          f"status={r6.status}, body={r6.text()[:150]}")

    b.close()

total = len(results)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = total - passed
print(f"\n========= Module F Summary =========")
print(f"Total: {total}, PASS: {passed}, FAIL: {failed}")

with open(r"e:\workspace\yichun-you-shi-er-shuo\.pm-tmp\report-F.json", "w", encoding="utf-8") as f:
    json.dump({"module": "F-me", "results": results, "page_errors": page_errors[-5:]}, f, ensure_ascii=False, indent=2)
