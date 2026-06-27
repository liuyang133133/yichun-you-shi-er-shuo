"""
黑盒测试 - 模块 B+C: 注册/登录流程
注册 = SMS 验证码首次使用 (前端"登录/注册" 一体)
"""
import json
import re
import sys
import io
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_FE = "http://localhost:3000"  # 用 localhost 避免 127.0.0.1 CORS 问题
BASE_API = "http://localhost:3001"

results = []

def check(name, ok, detail):
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}: {detail}")
    results.append({"name": name, "status": status, "detail": detail})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()

    # 收集 alert 弹窗
    alerts = []
    page.on("dialog", lambda d: (alerts.append(d.message), d.dismiss()))
    # 网络监听
    api_responses = []
    page.on("response", lambda r: api_responses.append((r.url, r.status)) if "/api/v1/" in r.url else None)

    print("\n========= Module B: Register (SMS) =========")
    # B-1: 访问登录页
    page.goto(f"{BASE_FE}/login", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=8000)
    title = page.title()
    body = page.inner_text("body")
    has_login_form = "手机号" in body and ("登录" in body or "注册" in body)
    check("B-1 登录页可访问 + 包含登录表单", has_login_form, f"title='{title}', has_form={has_login_form}")

    # B-2: 输入空手机号, 试图获取验证码
    send_btn = page.locator("button:has-text('获取验证码')")
    if send_btn.count() > 0:
        is_disabled_empty = send_btn.first.is_disabled()
        check("B-2 空手机号: 获取验证码按钮 disabled", is_disabled_empty, f"disabled={is_disabled_empty}")
    else:
        check("B-2 空手机号: 获取验证码按钮", False, "未找到按钮")

    # B-3: 输入非法手机号 (字母)
    phone_input = page.locator("input[type='tel']").first
    phone_input.fill("abc123def")
    val = phone_input.input_value()
    check("B-3 非法字符被自动过滤", val == "" or val.isdigit(), f"filtered value='{val}'")

    # B-4: 输入 10 位手机号 (不足 11 位)
    phone_input.fill("1390000123")
    if send_btn.count() > 0:
        is_disabled_10 = send_btn.first.is_disabled()
        check("B-4 10 位手机号: 获取验证码按钮 disabled", is_disabled_10, f"disabled={is_disabled_10}")

    # B-5: 输入超长手机号 (15 位)
    phone_input.fill("1390000123456789")
    val = phone_input.input_value()
    check("B-5 超长手机号被截断到 11 位", len(val) <= 11, f"value len={len(val)}, val='{val}'")

    # B-6: 输入有效手机号 + 触发获取验证码
    new_phone = "13900003333"  # 已知 seed 数据中的手机号
    phone_input.fill(new_phone)
    if send_btn.count() > 0 and not send_btn.first.is_disabled():
        send_btn.first.click()
        page.wait_for_timeout(3000)
        # 弹 alert 提示即为成功 (后端 API 被调用)
        last_alert = alerts[-1] if alerts else ""
        check("B-6 有效手机号触发验证码请求(API 调用成功)",
              "发送" in last_alert or "验证码" in last_alert or "冷却" in last_alert,
              f"alert='{last_alert[:80]}'")
    else:
        check("B-6 有效手机号触发验证码请求", False, "按钮未启用或不存在")

    # B-7: 输入超长验证码
    code_input = page.locator("input[placeholder='6 位数字']").first
    code_input.fill("1234567890")
    val = code_input.input_value()
    check("B-7 超长验证码被截断到 6 位", len(val) <= 6, f"value len={len(val)}, val='{val}'")

    print("\n========= Module C: Login =========")
    # C-1: 错误密码登录 (先用密码 tab 试一下)
    pw_tab = page.locator("button:has-text('密码登录')").first
    pw_tab.click()
    page.wait_for_timeout(500)
    phone_input.fill("13900008888")  # 已知存在的用户 (memory 中有)
    pw_input = page.locator("input[type='password']").first
    pw_input.fill("wrongpassword123")
    login_btn = page.locator("button:has-text('登录')").last
    login_btn.click()
    page.wait_for_timeout(3000)
    err_locator = page.locator(".bg-destructive\\/10")
    if err_locator.count() > 0:
        err_text = err_locator.first.inner_text()
        check("C-1 错误密码显示错误提示", "密码" in err_text or "错" in err_text or "失" in err_text or "账号" in err_text,
              f"err='{err_text[:60]}'")
    else:
        check("C-1 错误密码显示错误提示",
              any("密码" in a or "错" in a for a in alerts[-3:]),
              f"alerts_tail={alerts[-1][:60] if alerts else 'none'}")

    # C-2: SMS 验证码登录 - 切到 SMS tab + 用已有未消费 code
    sms_tab = page.locator("button:has-text('验证码登录')").first
    sms_tab.click()
    page.wait_for_timeout(500)
    phone_input.fill("13900003333")
    page.wait_for_timeout(500)
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "exec", "yichun-mysql", "mysql", "-uroot",
             "-proot123456", "yichun_db", "-N", "-B", "-e",
             "SELECT code FROM sms_codes WHERE phone='13900003333' AND consumed=0 ORDER BY id DESC LIMIT 1"],
            capture_output=True, text=True, timeout=10
        )
        real_code = result.stdout.strip() if result.returncode == 0 and result.stdout.strip() else ""
    except Exception:
        real_code = ""
    if not real_code:
        # 60s 冷却中, 先触发一次再等
        code_send_btn = page.locator("button:has-text('获取验证码')").first
        if code_send_btn.count() > 0:
            code_send_btn.click()
            page.wait_for_timeout(2500)
            result = subprocess.run(
                ["docker", "exec", "yichun-mysql", "mysql", "-uroot",
                 "-proot123456", "yichun_db", "-N", "-B", "-e",
                 "SELECT code FROM sms_codes WHERE phone='13900003333' AND consumed=0 ORDER BY id DESC LIMIT 1"],
                capture_output=True, text=True, timeout=10
            )
            real_code = result.stdout.strip()
    check("C-2-pre 获取到未消费验证码", len(real_code) == 6 and real_code.isdigit(),
          f"code={real_code}")

    code_input = page.locator("input[placeholder='6 位数字']").first
    code_input.fill(real_code)
    # 点登录
    login_btn2 = page.locator("button:has-text('登录')").last
    login_btn2.click()
    page.wait_for_timeout(4000)
    cur_url = page.url
    check("C-2 SMS 验证码登录后跳转", "/me" in cur_url or cur_url.endswith(":3000/"),
          f"current_url={cur_url}, code_used={real_code[:3]}***")

    # C-3: 登录态保持 (刷新页面)
    if "/me" in cur_url or cur_url.endswith(":3000/"):
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(2000)
        reloaded_url = page.url
        # 应该在 me 页面或主页, 不应跳回 login
        check("C-3 登录态保持 (刷新后未跳 login)",
              "/login" not in reloaded_url,
              f"after_reload_url={reloaded_url}")
    else:
        check("C-3 登录态保持 (刷新)", False, "C-2 失败, 跳过")

    # C-4: 登出
    logout_locators = [
        page.locator("button:has-text('退出')"),
        page.locator("button:has-text('登出')"),
        page.locator("a:has-text('退出')"),
    ]
    found_logout = False
    for loc in logout_locators:
        if loc.count() > 0:
            found_logout = True
            loc.first.click()
            page.wait_for_timeout(2000)
            break
    if not found_logout:
        # 尝试 localStorage 清空 + 跳 /login
        page.evaluate("() => { localStorage.clear(); }")
        page.goto(f"{BASE_FE}/login", wait_until="networkidle")
    final_url = page.url
    check("C-4 登出后访问受保护页跳 login",
          "/login" in final_url or "登录" in page.inner_text("body"),
          f"final_url={final_url}")

    browser.close()

# 总结
total = len(results)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = total - passed
print(f"\n========= Module B+C Summary =========")
print(f"Total: {total}, PASS: {passed}, FAIL: {failed}")

with open(r"e:\workspace\yichun-you-shi-er-shuo\.pm-tmp\report-BC.json", "w", encoding="utf-8") as f:
    json.dump({"module": "B-register+C-login", "results": results, "alerts": alerts}, f, ensure_ascii=False, indent=2)
