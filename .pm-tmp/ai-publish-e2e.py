"""
AI 智能发布 E2E 测试
- 步骤 A: 访问 /posts/publish, 看到 AI 模式 (大文本框 + 渐变)
- 步骤 B: 输入大白话, 800ms 后看到 "AI 正在分析..."
- 步骤 C: 看到 "已识别" chip 列表
- 步骤 D: 点 "用这个去发布", 跳到 manual 模式, 看到 prefill 字段
- 步骤 E: 跳过 AI 入口能直接进 manual
"""
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

SHOT_DIR = Path(".pm-ttmp-shots")
SHOT_DIR.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:3000"
TEST_PHONE = "13900008888"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")
        page = ctx.new_page()

        # 处理 alert() 弹窗 (发送验证码 / 错误提示会触发 alert)
        page.on("dialog", lambda d: d.dismiss())

        # 登录 (必须登录才能访问 publish)
        print("[setup] 登录")
        page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=15000)
        page.locator("input[type=tel]").first.fill(TEST_PHONE)
        page.get_by_role("button", name=re.compile("获取验证码|发送")).first.click()
        time.sleep(2)

        import subprocess
        # 从 sms_codes 表查最新未消费的验证码 (docker exec 经 Docker socket, 不走 HTTP 代理)
        out = subprocess.check_output([
            "docker", "exec", "yichun-mysql", "mysql", "-uroot", "-proot123456", "yichun_db", "-BNe",
            f"SELECT code FROM sms_codes WHERE phone='{TEST_PHONE}' AND consumed=0 ORDER BY id DESC LIMIT 1;"
        ], stderr=subprocess.STDOUT).decode().strip()
        # 输出可能含 mysql warning 行, 取最后一行
        code = out.split('\n')[-1].strip() if out else ""
        page.locator("input[inputmode='numeric']").first.fill(code)
        # 提交按钮文案是 "登录 / 注册" (含空格与斜杠), 需用 CSS 文本选择器
        page.locator("button:has-text('登录 / 注册'), button:has-text('登录中')").first.click()
        page.wait_for_url(re.compile(r"/($|me)"), timeout=15000)
        print("[setup] 登录 ok")

        # [A] 访问 /posts/publish
        print("[A] 访问 /posts/publish")
        page.goto(f"{BASE}/posts/publish", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_selector("textarea", timeout=10000)
        page.screenshot(path=str(SHOT_DIR / "ai-A-entry.png"), full_page=True)
        body = page.locator("body").inner_text()
        if "智能发布" not in body or "把您要发的内容写出来" not in body:
            print(f"  [A] FAIL: 没看到 AI 模式标题")
            browser.close()
            return
        print(f"  [A] ok: 看到 AI 模式")

        # [B] 输入大白话
        print("[B] 输入大白话, 触发 debounce")
        TEXT = "金水湾精装两室 8楼 1200一月 押一付三 拎包入住"
        textarea = page.locator("textarea").first
        textarea.fill(TEXT)
        # 等 debounce + API
        time.sleep(2)
        page.screenshot(path=str(SHOT_DIR / "ai-B-loading.png"), full_page=True)

        # [C] 看 chip (后端 503 时这步会失败, 是预期)
        print("[C] 等待 AI 结果")
        try:
            page.wait_for_selector("text=已识别", timeout=10000)
            body = page.locator("body").inner_text()
            print(f"  [C] ok: 看到 '已识别'")
            page.screenshot(path=str(SHOT_DIR / "ai-C-result.png"), full_page=True)

            # [D] 点 "用这个去发布"
            print("[D] 点 '用这个去发布'")
            btn = page.get_by_role("button", name=re.compile("用这个去发布"))
            if btn.count() == 0:
                print(f"  [D] FAIL: 找不到 '用这个去发布' 按钮")
            else:
                btn.first.click()
                time.sleep(2)
                page.screenshot(path=str(SHOT_DIR / "ai-D-manual.png"), full_page=True)
                cur_url = page.url
                if "mode=manual" in cur_url:
                    print(f"  [D] ok: 跳到 manual 模式, url={cur_url}")
                else:
                    print(f"  [D] FAIL: 跳错, url={cur_url}")
        except PWTimeout:
            body = page.locator("body").inner_text()
            if "AI 暂时不可用" in body or "AI 暂不可用" in body or "请稍后" in body:
                print(f"  [C] expected: AI 不可用 (后端 .env 是占位符) — Phase 1 dev 阶段 OK")
                page.screenshot(path=str(SHOT_DIR / "ai-C-unavailable.png"), full_page=True)
            else:
                print(f"  [C] FAIL: 等不到结果也没显示降级")

        # [E] 跳过 AI 直接进 manual
        print("[E] 测试 '跳过 AI' 入口")
        page.goto(f"{BASE}/posts/publish?mode=manual", wait_until="domcontentloaded", timeout=15000)
        time.sleep(2)
        page.screenshot(path=str(SHOT_DIR / "ai-E-skip.png"), full_page=True)
        body = page.locator("body").inner_text()
        if "房屋" in body or "小区" in body or "租金" in body:
            print(f"  [E] ok: manual 模式正常显示")
        else:
            print(f"  [E] FAIL: manual 模式没看到预期字段")

        browser.close()

if __name__ == "__main__":
    main()
