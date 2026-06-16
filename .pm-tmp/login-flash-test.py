"""
登录闪退专门测试 - 真实抓取 console / network / URL 跳转
跑 4 步:
  1. 打开 /login, console error + 截图
  2. 填手机号 + 发送验证码, console error + 截图
  3. 填 6 位真码 + 点登录, 等待跳转, 多次截图看是否回到 login
  4. 最终 URL + 是否还停留在 /me
"""
import re
import time
import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

SHOT_DIR = Path(".pm-ttmp-shots")
SHOT_DIR.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:3000"
API = "http://localhost:3001/api/v1"
TEST_PHONE = "13900008888"

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def main():
    # 0) 跳过 step0 预发码, 浏览器全程自主完成 (避免 throttler 跨 IP 误判)
    log("step0: 跳过预发码, 让浏览器自己发码")
    # 等 65s 让之前的 throttler 冷却 (60s cooldown) -- 跳过, 用全新手机号
    time.sleep(0)

    # 2) 启动浏览器跑登录流
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
        )
        page = ctx.new_page()

        console_errors = []
        page_errors = []
        nav_history = []
        network_responses = []  # [(url, status, method)]

        page.on("console", lambda m: console_errors.append(f"[{m.type}] {m.text[:300]}"))
        page.on("pageerror", lambda e: page_errors.append(str(e)[:300]))

        def on_response(response):
            url = response.url
            if "localhost:3001" in url:
                network_responses.append((response.request.method, url, response.status))
        page.on("response", on_response)

        def on_frame_navigated(frame):
            if frame == page.main_frame:
                nav_history.append((frame.url, time.time()))
        page.on("framenavigated", on_frame_navigated)

        # ============ Step 1: 打开 /login ============
        log("step1: 打开 /login")
        page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=20000)
        page.wait_for_selector("input[type=tel]", timeout=10000)
        page.screenshot(path=str(SHOT_DIR / "F1-login-page.png"), full_page=True)
        log(f"  step1 ok, url={page.url}")

        # ============ Step 2: 填手机号 + 发码 ============
        log("step2: 填手机号 + 发码")
        page.locator("input[type=tel]").first.fill(TEST_PHONE)
        send_btn = page.get_by_role("button", name=re.compile("获取验证码|发送"))
        send_btn.first.click()
        time.sleep(2)
        # 弹 alert (login page 第 41 行有 alert)
        # Playwright dialog 处理
        dialogs = []
        def on_dialog(d):
            dialogs.append(d.message)
            d.accept()
        page.on("dialog", on_dialog)
        time.sleep(1)
        page.screenshot(path=str(SHOT_DIR / "F2-after-send.png"), full_page=True)
        log(f"  step2 ok, dialogs={dialogs}")

        # ============ Step 3: 填真码 + 登录 ============
        log("step3: 填 6 位验证码 + 点登录")
        # 从 sms_codes 表拿最新 code (走 MySQL)
        import subprocess
        out = subprocess.check_output([
            "docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456", "yichun_db", "-BNe",
            f"SELECT code FROM sms_codes WHERE phone='{TEST_PHONE}' AND consumed=0 ORDER BY id DESC LIMIT 1;"
        ], stderr=subprocess.STDOUT).decode().strip()
        code = out.split('\n')[-1] if out else ""
        log(f"  step3 真码 = {code}")
        if not code or len(code) != 6:
            log(f"  step3 FAIL: 拿不到真码 (out={out!r})")
            return

        code_input = page.locator("input[inputmode='numeric']").first
        code_input.fill(code)
        time.sleep(0.5)
        page.screenshot(path=str(SHOT_DIR / "F3-code-filled.png"), full_page=True)

        log("step3: 点登录按钮 (排除 tab 按钮)")
        # 用更精确的 selector: button[type=button] 但有 ArrowRight icon
        # 最稳: 找 "登录 / 注册" 这个 button
        login_btn = page.locator("button").filter(has_text=re.compile("^登录 / 注册$|^登录中"))
        # 用 page.get_by_role 配合 exact text
        login_btn = page.get_by_role("button", name=re.compile("^登录"))
        if login_btn.count() > 1:
            # 取最后那个 (tab 在上, 提交在下)
            login_btn = login_btn.last
        login_btn.click()

        # 立即抓 localStorage (登录后第一刻)
        time.sleep(0.2)
        ls1 = page.evaluate("() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))")
        log(f"  step3 登录后+0.2s localStorage: {ls1}")
        time.sleep(0.5)
        ls2 = page.evaluate("() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))")
        log(f"  step3 登录后+0.7s localStorage: {ls2}")

        # 等跳转
        log("step3: 等 URL 变化")
        try:
            page.wait_for_url(re.compile(r"/me($|/)"), timeout=15000)
            log(f"  step3 跳到 /me, url={page.url}")
        except PWTimeout:
            log(f"  step3 等待 /me 超时, 当前 url={page.url}")

        # 多抓几次看是否反复
        for i, delay in enumerate([0.5, 1.5, 3.0, 5.0]):
            time.sleep(delay)
            page.screenshot(path=str(SHOT_DIR / f"F4-me-{i}-at+{sum([0,0.5,1.5,3.0,5.0][:i+1]):.1f}s.png"), full_page=True)
            log(f"  step3 截图 +{sum([0,0.5,1.5,3.0,5.0][:i+1]):.1f}s, url={page.url}")

        # ============ Step 4: 看结果 ============
        log("step4: 总结")
        log(f"  最终 url: {page.url}")
        log(f"  导航历史:")
        for u, t in nav_history[-10:]:
            log(f"    - {u}")

        log(f"  console error/warn ({len(console_errors)}):")
        for e in console_errors[:15]:
            log(f"    {e[:250]}")
        log(f"  page error ({len(page_errors)}):")
        for e in page_errors[:10]:
            log(f"    {e[:250]}")
        log(f"  network responses (backend only, last 20):")
        for m, u, s in network_responses[-20:]:
            log(f"    {m} {u.split('localhost:3001')[1] if 'localhost:3001' in u else u} -> {s}")

        # 看 localStorage
        ls = page.evaluate("() => ({token: !!localStorage.getItem('yichun_token') || !!localStorage.getItem('accessToken'), user: !!localStorage.getItem('yichun_user') || !!localStorage.getItem('user'), allKeys: Object.keys(localStorage)})")
        log(f"  localStorage: {ls}")

        browser.close()

if __name__ == "__main__":
    main()
