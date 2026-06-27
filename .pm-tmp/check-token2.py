"""检查登录后 token + 用 Bearer 发 API"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright
import subprocess

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context()
    pg = ctx.new_page()
    # 登录
    pg.goto('http://localhost:3000/login', wait_until='networkidle', timeout=10000)
    pg.locator("input[type='tel']").first.fill("13900003333")
    pg.locator("button:has-text('获取验证码')").first.click()
    pg.wait_for_timeout(2500)
    r = subprocess.run(
        ["docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456",
         "yichun_db", "-N", "-B", "-e",
         "SELECT code FROM sms_codes WHERE phone='13900003333' AND consumed=0 ORDER BY id DESC LIMIT 1"],
        capture_output=True, text=True, timeout=10
    )
    code = r.stdout.strip()
    pg.locator("input[placeholder='6 位数字']").first.fill(code)
    pg.locator("button:has-text('登录')").last.click()
    pg.wait_for_timeout(4000)
    token = pg.evaluate("() => localStorage.getItem('yichun_access_token')")
    print(f"token: {token[:40] if token else 'NONE'}")
    if token:
        r2 = pg.request.post("http://localhost:3001/api/v1/posts",
                             data={"type": "secondhand", "title": "Bearer 测试", "description": "x", "price": 1},
                             headers={"Authorization": f"Bearer {token}"})
        print(f"with Bearer: status={r2.status}, body={r2.text()[:200]}")
    b.close()
