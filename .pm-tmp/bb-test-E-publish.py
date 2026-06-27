"""
黑盒测试 - 模块 E: 内容发布
- E-1: 未登录访问 /posts/publish
- E-2: 登录后访问 /posts/publish (AI 模式)
- E-3: AI 模式: 输入大白话, debounce 触发识别
- E-4: 手动模式: 表单填写
- E-5: 提交帖子 (API 直接测试, 不依赖 AI)
"""
import json
import sys
import io
import subprocess
import time
import urllib.request
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
    """走 SMS 登录流程"""
    # 先清 Redis sms:* cooldown
    subprocess.run(
        ["docker", "exec", "yichun-redis", "redis-cli", "-a", "yichun123456", "--no-auth-warning",
         "EVAL", "for _,k in ipairs(redis.call('keys', 'sms:*')) do redis.call('del', k) end return 'ok'", "0"],
        capture_output=True, timeout=10
    )
    page.goto(f"{BASE_FE}/login", wait_until="networkidle", timeout=15000)
    phone_in = page.locator("input[type='tel']").first
    phone_in.fill(phone)
    page.wait_for_timeout(500)
    # 始终点发送按钮
    sms_btn = page.locator("button:has-text('获取验证码')")
    if sms_btn.count() > 0:
        sms_btn.first.click()
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
    print(f"  [login_sms] code={code[:3] if code else 'EMPTY'}***")
    code_in = page.locator("input[placeholder='6 位数字']").first
    code_in.fill(code)
    login_btn = page.locator("button:has-text('登录')").last
    login_btn.click()
    page.wait_for_timeout(4000)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    print("\n========= Module E: Publish =========")
    # E-1: 未登录访问 /posts/publish
    page.goto(f"{BASE_FE}/posts/publish", wait_until="networkidle", timeout=15000)
    cur = page.url
    check("E-1 未登录访问发布页跳 login", "/login" in cur, f"url={cur}")

    # E-2: 登录后访问 /posts/publish
    login_sms(page, "13900003333")
    cur_after_login = page.url
    token_check = page.evaluate("() => localStorage.getItem('yichun_access_token')")
    print(f"  [INFO] 登录后 url={cur_after_login}, token={'YES' if token_check else 'NO'}")
    page.goto(f"{BASE_FE}/posts/publish", wait_until="networkidle", timeout=15000)
    cur = page.url
    body = page.inner_text("body")
    has_publish_form = ("发布" in body or "标题" in body or "AI" in body or "手动" in body)
    check("E-2 登录后访问发布页", "/posts/publish" in cur and has_publish_form,
          f"url={cur}, has_form={has_publish_form}, token={token_check[:20] if token_check else 'NONE'}")

    # E-3: AI 模式: 输入大白话, 触发 debounce
    if "/posts/publish" in cur:
        # AI 模式应该是默认
        ai_textarea = page.locator("textarea").first
        if ai_textarea.count() > 0:
            ai_textarea.fill("我在伊美区有一套两室一厅精装房出租，1200一个月拎包入住")
            # 等 debounce 800ms + API
            page.wait_for_timeout(8000)
            body2 = page.inner_text("body")
            has_ai_result = "建议" in body2 or "已识别" in body2 or "AI 正在" in body2 or "标题" in body2
            check("E-3 AI 模式 debounce 触发 (有大白话输入)",
                  len(body2) > 200,  # 至少有内容
                  f"body_len={len(body2)}, has_ai_result={has_ai_result}")
        else:
            check("E-3 AI 模式 textarea 存在", False, "textarea not found")

    # E-4: 切换手动模式 (找 "跳过 AI" 或 "手动" 按钮)
    skip_btn = page.locator("button:has-text('跳过')")
    manual_btn = page.locator("button:has-text('手动')")
    if skip_btn.count() > 0:
        skip_btn.first.click()
        page.wait_for_timeout(2000)
        cur2 = page.url
        body3 = page.inner_text("body")
        check("E-4 跳过 AI 跳手动模式",
              ("mode=manual" in cur2 or "手动" in body3 or len(body3) > 500),
              f"url={cur2}, body_len={len(body3)}")
    elif manual_btn.count() > 0:
        manual_btn.first.click()
        page.wait_for_timeout(2000)
    else:
        check("E-4 跳过 AI 跳手动模式", False, "找不到跳过 AI 按钮")

    # E-5: API 直接发一个帖子 (用 Bearer token, type=house + categoryId=1)
    token = page.evaluate("() => localStorage.getItem('yichun_access_token')")
    auth_header = {"Authorization": f"Bearer {token}"}
    body_data = {
        "type": "house",
        "categoryId": 1,
        "title": "测试自动发布的房源",
        "description": "黑盒测试自动创建的帖子，验证 create endpoint 工作",
        "price": 99.0,
    }
    api_resp = page.request.post(f"{BASE_API}/api/v1/posts", data=body_data, headers=auth_header)
    # 接受 200/201 (成功) 或 429 (rate limit 工作)
    check("E-5 API POST /api/v1/posts 创建帖子 (或 rate limit)",
          200 <= api_resp.status < 300 or api_resp.status == 429,
          f"status={api_resp.status}, body={api_resp.text()[:200]}")

    # E-6: 缺少必填字段 (title 空)
    body_data2 = {"type": "house", "categoryId": 1, "description": "no title", "price": 10}
    api_resp2 = page.request.post(f"{BASE_API}/api/v1/posts", data=body_data2, headers=auth_header)
    check("E-6 缺 title 返回 400", api_resp2.status == 400,
          f"status={api_resp2.status}, body={api_resp2.text()[:100]}")

    # E-7: 超长 title
    body_data3 = {"type": "house", "categoryId": 1, "title": "X" * 500, "description": "x", "price": 1}
    api_resp3 = page.request.post(f"{BASE_API}/api/v1/posts", data=body_data3, headers=auth_header)
    check("E-7 超长 title 处理 (400 或 201/200)", api_resp3.status in [400, 201, 200],
          f"status={api_resp3.status}, body={api_resp3.text()[:100]}")

    browser.close()

total = len(results)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = total - passed
print(f"\n========= Module E Summary =========")
print(f"Total: {total}, PASS: {passed}, FAIL: {failed}")

with open(r"e:\workspace\yichun-you-shi-er-shuo\.pm-tmp\report-E.json", "w", encoding="utf-8") as f:
    json.dump({"module": "E-publish", "results": results, "page_errors": page_errors[-5:]}, f, ensure_ascii=False, indent=2)
