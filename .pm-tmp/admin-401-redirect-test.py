"""
验证 admin 401 自动跳登录修复
- 步骤 A: 注入无效 token, 访问 /dashboard → 期望自动跳到 /login?expired=1&next=/dashboard
- 步骤 B: 看到 "登录已过期" 黄色 banner
- 步骤 C: 真登录 → 期望跳回 /dashboard → 看到真实数据 (不再 "暂无用户")
"""
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

SHOT_DIR = Path(".pm-ttmp-shots")
SHOT_DIR.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:3002"
TEST_PHONE = "13800000000"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")
        page = ctx.new_page()

        # ============ 步骤 A: 注入无效 token, 访问 /dashboard ============
        print("[A] 注入伪造 token + 访问 /dashboard")
        page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=15000)
        page.evaluate("""() => {
          localStorage.setItem('yichun_admin_token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicGhvbmUiOiIxMzgwMDAwMDAwMCIsInJvbGUiOiJ1c2VyIiwidHlwZSI6ImFjY2VzcyJ9.fake_invalid_signature');
          localStorage.setItem('yichun_admin_user', JSON.stringify({sub:'1', phone:'13800000000', role:'user'}));
        }""")
        page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded", timeout=15000)

        # 等跳转到 /login
        try:
            page.wait_for_url(re.compile(r"/login\?.*expired=1"), timeout=10000)
            print(f"  [A] ok: 自动跳到 {page.url}")
        except PWTimeout:
            print(f"  [A] FAIL: 没跳, 当前 url={page.url}")
            page.screenshot(path=str(SHOT_DIR / "FAIL-A-no-redirect.png"))
            browser.close()
            return

        # ============ 步骤 B: 看到 banner ============
        print("[B] 检查过期 banner")
        # banner 文案: "登录已过期，请重新登录"
        banner = page.get_by_text("登录已过期")
        if banner.count() > 0:
            print(f"  [B] ok: 看到过期 banner ({banner.count()} 个匹配)")
        else:
            print(f"  [B] FAIL: 没看到 banner")
            page.screenshot(path=str(SHOT_DIR / "FAIL-B-no-banner.png"))
        page.screenshot(path=str(SHOT_DIR / "B-login-with-banner.png"), full_page=True)

        # ============ 步骤 C: 真登录 ============
        print("[C] 真登录")
        # 输入手机号
        page.locator("input[type=tel]").first.fill(TEST_PHONE)
        # 发码
        send_btn = page.get_by_role("button", name=re.compile("获取验证码|发送"))
        send_btn.first.click()
        time.sleep(2)

        # 从 sms_codes 表拿真码
        import subprocess
        out = subprocess.check_output([
            "docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456", "yichun_db", "-BNe",
            f"SELECT code FROM sms_codes WHERE phone='{TEST_PHONE}' AND consumed=0 ORDER BY id DESC LIMIT 1;"
        ], stderr=subprocess.STDOUT).decode().strip()
        code = out.split('\n')[-1] if out else ""
        print(f"  [C] 真码 = {code}")
        if not code or len(code) != 6:
            print(f"  [C] FAIL: 拿不到真码")
            browser.close()
            return

        # 填码 + 登录
        page.locator("input[inputmode='numeric']").first.fill(code)
        login_btn = page.get_by_role("button", name=re.compile("登录后台|登录中"))
        if login_btn.count() > 1:
            login_btn = login_btn.last
        login_btn.click()

        # 期望跳回 /dashboard
        try:
            page.wait_for_url(re.compile(r"/dashboard($|/)"), timeout=15000)
            print(f"  [C] ok: 跳回 {page.url}")
        except PWTimeout:
            print(f"  [C] FAIL: 没跳到 /dashboard, 当前 url={page.url}")
            page.screenshot(path=str(SHOT_DIR / "FAIL-C-no-dashboard.png"))

        time.sleep(2)
        page.screenshot(path=str(SHOT_DIR / "C-dashboard-with-data.png"), full_page=True)

        # 看 localStorage 是否更新成新 token
        ls = page.evaluate("() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))")
        print(f"  [C] localStorage:")
        for k, v in ls.items():
            if 'admin' in k:
                print(f"    {k} = {v[:80] if v else v}{'...' if v and len(v) > 80 else ''}")

        # 验证 dashboard 真的有数据 (不再是 "加载失败")
        body = page.locator("body").inner_text()
        has_error = "加载失败" in body or "Unauthorized" in body
        has_data = "今日新帖" in body or "信息总数" in body or "数据看板" in body
        print(f"  [C] dashboard 包含 '加载失败': {has_error}")
        print(f"  [C] dashboard 包含数据看板文案: {has_data}")

        if not has_error and has_data:
            print("  [C] ✅ 全部 ok: token 已刷新 + 真实数据可见")
        else:
            print(f"  [C] ❌ 还有问题, 看截图: .pm-ttmp-shots/C-dashboard-with-data.png")

        # ============ 步骤 D: 跳到用户管理, 看是否有数据 ============
        print("[D] 跳到 /users 看是否有数据")
        page.goto(f"{BASE}/users", wait_until="domcontentloaded", timeout=15000)
        time.sleep(2)
        page.screenshot(path=str(SHOT_DIR / "D-users-page.png"), full_page=True)
        body = page.locator("body").inner_text()
        empty = "暂无用户" in body
        has_table = "13800000000" in body or "手机号" in body
        print(f"  [D] users 页面 '暂无用户': {empty}, 有表格: {has_table}")
        if not empty and has_table:
            print("  [D] ✅ 用户管理数据正常")

        browser.close()

if __name__ == "__main__":
    main()
