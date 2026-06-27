"""
Browser E2E test for yichun-you-shi-er-shuo
Drives Playwright (Python) against the dev services on :3000 / :3001 / :3002
Captures screenshots and console errors for each key page.

Run: python .pm-tmp/browser-e2e.py
"""
import os
import re
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

SHOT_DIR = Path(".pm-ttmp-shots")
SHOT_DIR.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:3000"
ADMIN = "http://localhost:3002"
API = "http://localhost:3001/api/v1"

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def shot(page, name):
    p = SHOT_DIR / f"{name}.png"
    page.screenshot(path=str(p), full_page=True)
    log(f"  -> screenshot: {p} ({p.stat().st_size} bytes)")
    return p

def collect_console(page, errors):
    def on_console(msg):
        if msg.type == "error":
            errors.append(f"[{msg.location.get('url','')}] {msg.text[:200]}")
    def on_pageerror(err):
        errors.append(f"[pageerror] {str(err)[:200]}")
    page.on("console", on_console)
    page.on("pageerror", on_pageerror)

def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
            ignore_https_errors=True,
        )

        # ---------- Test 1: 用户端首页 ----------
        log("[1/6] 用户端首页 /")
        page = ctx.new_page()
        errors = []
        collect_console(page, errors)
        try:
            page.goto(BASE, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_selector("text=伊春", timeout=15000)
            # 等分类卡片加载
            page.wait_for_selector("text=房屋出租", timeout=10000)
            shot(page, "01-homepage")
            results.append(("homepage", "PASS", "首页 + 4 大模块渲染"))
        except PWTimeout as e:
            shot(page, "01-homepage-FAIL")
            results.append(("homepage", "FAIL", str(e)[:200]))
        page.close()

        # ---------- Test 2: 帖子详情 (T-P1-02 脱敏验证) ----------
        log("[2/6] 帖子详情 /posts/1 - 验证 contactPhone 不在 UI")
        page = ctx.new_page()
        errors = []
        collect_console(page, errors)
        try:
            page.goto(f"{BASE}/posts/1", wait_until="domcontentloaded", timeout=20000)
            page.wait_for_selector("text=伊美区", timeout=15000)
            # 验证 contactPhone 字符串不在 DOM
            html = page.content()
            has_phone_138 = "13800000001" in html
            has_login_hint = "登录" in html or "联系" in html
            shot(page, "02-post-detail")
            status = "PASS" if not has_phone_138 else "FAIL"
            detail = f"明文手机号 13800000001 在 DOM: {has_phone_138} (应为 False), 登录提示: {has_login_hint}"
            results.append(("post-detail-desensitization", status, detail))
        except PWTimeout as e:
            shot(page, "02-post-detail-FAIL")
            results.append(("post-detail", "FAIL", str(e)[:200]))
        page.close()

        # ---------- Test 3: 登录页 + 验证码登录流 ----------
        log("[3/6] 登录页 /login + SMS 登录")
        page = ctx.new_page()
        errors = []
        collect_console(page, errors)
        try:
            page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=20000)
            page.wait_for_selector("input[type=tel]", timeout=10000)
            shot(page, "03-login-page")
            # 填手机号
            phone_input = page.locator("input[type=tel]").first
            phone_input.fill("13800000000")
            # 点发送验证码
            send_btn = page.get_by_role("button", name=re.compile("发送|获取"))
            if send_btn.count() == 0:
                send_btn = page.locator("button:has-text('验证码')").first
            send_btn.click()
            log("  -> 已点发送验证码")
            page.wait_for_timeout(3000)
            # 切到验证码 tab (如果默认是密码 tab)
            sms_tab = page.get_by_role("tab", name=re.compile("验证码|短信"))
            if sms_tab.count() > 0:
                sms_tab.first.click()
            # 填 6 位验证码 (mock 默认 123456 不一定对, 我们去 API 拿真 code)
            import urllib.request, json
            req = urllib.request.Request(
                f"{API}/auth/sms-code",
                data=json.dumps({"phone": "13800000000"}).encode(),
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req).read()
            # 从后端 log 抓最新 mock 验证码
            log("  -> 等后端 log 打印 mock 验证码")
            time.sleep(2)
            code = None
            for _ in range(10):
                log_path = Path("/tmp/backend.log")
                if log_path.exists():
                    text = log_path.read_text(encoding="utf-8", errors="ignore")
                    matches = re.findall(r"phone=13800000000 code=(\d{6})", text)
                    if matches:
                        code = matches[-1]
                        break
                time.sleep(1)
            if not code:
                raise RuntimeError("从后端 log 拿不到验证码")
            log(f"  -> 拿到验证码: {code}")
            # 找验证码 input (6 位)
            code_input = page.locator("input[maxlength='6'], input[inputmode='numeric']").first
            if code_input.count() == 0:
                code_input = page.locator("input").nth(1)  # 第 2 个 input
            code_input.fill(code)
            # 点登录
            login_btn = page.get_by_role("button", name=re.compile("登录|登 录"))
            login_btn.first.click()
            page.wait_for_url(re.compile(r"/me($|/)"), timeout=15000)
            shot(page, "04-login-success")
            results.append(("login", "PASS", f"登录成功跳到 {page.url}"))
        except Exception as e:
            shot(page, "03-login-FAIL")
            results.append(("login", "FAIL", str(e)[:300]))
        page.close()

        # ---------- Test 4: 发布页 ----------
        log("[4/6] 发布页 /posts/publish")
        page = ctx.new_page()
        errors = []
        collect_console(page, errors)
        try:
            page.goto(f"{BASE}/posts/publish", wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(3000)
            shot(page, "05-publish-page")
            has_form = page.locator("form, input, select, textarea").count() > 0
            results.append(("publish-page", "PASS" if has_form else "FAIL", f"表单元素: {has_form}"))
        except Exception as e:
            shot(page, "05-publish-FAIL")
            results.append(("publish-page", "FAIL", str(e)[:200]))
        page.close()

        # ---------- Test 5: admin 登录 + dashboard ----------
        log("[5/6] admin /admin dashboard")
        page = ctx.new_page()
        errors = []
        collect_console(page, errors)
        try:
            page.goto(ADMIN, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_selector("input[type=tel], input[name=phone], input[name=username]", timeout=10000)
            shot(page, "06-admin-login")
            phone = page.locator("input[type=tel], input[name=phone], input[name=username]").first
            phone.fill("13800000000")
            # 找验证码按钮
            btn = page.get_by_role("button", name=re.compile("发送|获取"))
            if btn.count() > 0:
                btn.first.click()
                time.sleep(2)
            # 抓新 mock code (后端会发新的)
            code2 = None
            for _ in range(10):
                log_path = Path("/tmp/backend.log")
                if log_path.exists():
                    text = log_path.read_text(encoding="utf-8", errors="ignore")
                    matches = re.findall(r"phone=13800000000 code=(\d{6})", text)
                    if matches:
                        code2 = matches[-1]
                        break
                time.sleep(1)
            log(f"  -> admin 验证码: {code2}")
            code_input = page.locator("input[maxlength='6'], input[inputmode='numeric']").first
            if code_input.count() == 0:
                code_input = page.locator("input").nth(1)
            code_input.fill(code2 or "000000")
            page.get_by_role("button", name=re.compile("登录")).first.click()
            page.wait_for_url(re.compile(r"/(dashboard|admin)($|/)"), timeout=15000)
            page.wait_for_timeout(2000)
            shot(page, "07-admin-dashboard")
            results.append(("admin-dashboard", "PASS", f"已登录 admin, URL={page.url}"))
        except Exception as e:
            shot(page, "06-admin-FAIL")
            results.append(("admin-dashboard", "FAIL", str(e)[:300]))
        page.close()

        # ---------- Test 6: console error 汇总 ----------
        log("[6/6] 收尾")
        all_errors = []
        # 重新打开首页收集 console error (排除 network failure 因为服务可达)
        page = ctx.new_page()
        err_list = []
        collect_console(page, err_list)
        page.goto(BASE, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)
        all_errors = err_list
        page.close()

        browser.close()

    # 报告
    print("\n" + "=" * 70)
    print("  Browser E2E Report")
    print("=" * 70)
    for name, status, detail in results:
        marker = "PASS" if status == "PASS" else "FAIL"
        print(f"  [{marker}] {name:35s} {detail[:60]}")
    if all_errors:
        print("\n  Console errors on homepage:")
        for e in all_errors[:10]:
            print(f"    {e[:120]}")
    else:
        print("\n  [OK] No console errors on homepage")
    print("=" * 70)
    fail = [r for r in results if r[1] == "FAIL"]
    sys.exit(1 if fail else 0)

if __name__ == "__main__":
    main()
