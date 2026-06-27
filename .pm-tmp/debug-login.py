"""debug 登录: 看 click 后的网络请求"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright
import subprocess

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context()
    pg = ctx.new_page()
    pg.on("response", lambda r: print(f"  RESP {r.status} {r.url}") if "/api/v1/" in r.url else None)
    pg.on("dialog", lambda d: print(f"  DIALOG: {d.message[:60]}"))

    # 清理
    subprocess.run(["docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456",
                    "yichun_db", "-e", "DELETE FROM sms_codes WHERE phone='13900003333';"],
                   capture_output=True, timeout=10)

    pg.goto('http://localhost:3000/login', wait_until='networkidle', timeout=15000)
    print("--- step 1: 打开 /login ---")
    pg.locator("input[type='tel']").first.fill("13900003333")
    print("--- step 2: 填手机号 ---")
    pg.wait_for_timeout(500)
    sms_btn = pg.locator("button:has-text('获取验证码')")
    print(f"--- step 3: 找到 {sms_btn.count()} 个发送按钮 ---")
    if sms_btn.count() > 0:
        print(f"  disabled={sms_btn.first.is_disabled()}")
        sms_btn.first.click()
        print("--- step 4: 已 click ---")
    pg.wait_for_timeout(3000)

    # 直接查 DB
    r = subprocess.run(
        ["docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456",
         "yichun_db", "-N", "-B", "-e",
         "SELECT id, code, consumed, created_at FROM sms_codes WHERE phone='13900003333' ORDER BY id DESC LIMIT 3"],
        capture_output=True, text=True, timeout=10
    )
    print(f"--- DB: {r.stdout.strip()}")
    b.close()
