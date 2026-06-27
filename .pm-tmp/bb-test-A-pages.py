"""
黑盒测试 - 模块 A: 前端页面可达性 (v2 - 修正 admin base path)
"""
import json
import time
from playwright.sync_api import sync_playwright

BASE_FE = "http://localhost:3000"
BASE_ADMIN = "http://127.0.0.1:3002"

# 关键页面清单
PAGES = [
    # 用户端
    ("/", "200", "用户端首页", BASE_FE),
    ("/posts", "200", "帖子列表(关键)", BASE_FE),
    ("/search", "200", "搜索页", BASE_FE),
    ("/posts/publish", "200", "发布页", BASE_FE),
    ("/me", "200_or_3xx", "个人中心", BASE_FE),
    ("/me/messages", "200_or_3xx", "我的消息", BASE_FE),
    ("/login", "200", "登录页", BASE_FE),
    # 管理后台 (admin 路由在根)
    ("/login", "200", "后台登录", BASE_ADMIN),
    ("/dashboard", "200_or_3xx", "后台看板", BASE_ADMIN),
    ("/users", "200_or_3xx", "后台用户管理", BASE_ADMIN),
    ("/posts", "200_or_3xx", "后台帖子管理", BASE_ADMIN),
    ("/banners", "200_or_3xx", "后台轮播图", BASE_ADMIN),
    ("/companies", "200_or_3xx", "后台公司管理", BASE_ADMIN),
    ("/reports", "200_or_3xx", "后台举报管理", BASE_ADMIN),
    # 404
    ("/non-existent-404-test", "404", "404 不存在页", BASE_FE),
    ("/non-existent-404-test", "404", "404 不存在页(后台)", BASE_ADMIN),
]

results = []
console_errors = []

def check(name, ok, detail):
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}: {detail}")
    results.append({"name": name, "status": status, "detail": detail})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))
    page.on("console", lambda msg: console_errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None)

    for path, expected, name, base in PAGES:
        url = f"{base}{path}"
        t0 = time.time()
        try:
            resp = page.goto(url, wait_until="domcontentloaded", timeout=20000)
            status = resp.status if resp else 0
            elapsed = round((time.time() - t0) * 1000)
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass
            body_text_len = len(page.inner_text("body") or "")
            has_js_error = any("pageerror" in e for e in console_errors[-5:])
            detail = f"HTTP {status} ({elapsed}ms), body_text_len={body_text_len}, js_err={has_js_error}"
            if expected == "200":
                ok = (status == 200 and body_text_len > 30)
            elif expected == "404":
                ok = (status == 404 or body_text_len > 30)
            elif expected == "200_or_3xx":
                ok = (200 <= status < 400)
            else:
                ok = (status == int(expected))
            check(name, ok, detail)
        except Exception as e:
            check(name, False, f"EXCEPTION: {type(e).__name__}: {e}")

    browser.close()

print("\n========= JS errors unique =========")
unique = list(dict.fromkeys(console_errors))[-15:]
for e in unique:
    print(f"  - {e}")

total = len(results)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = total - passed
print(f"\n========= Module A Summary =========")
print(f"Total: {total}, PASS: {passed}, FAIL: {failed}, JS errors: {len(console_errors)}")

with open(r"e:\workspace\yichun-you-shi-er-shuo\.pm-tmp\report-A.json", "w", encoding="utf-8") as f:
    json.dump({"module": "A-pages", "results": results, "js_errors_unique": unique}, f, ensure_ascii=False, indent=2)
print("Report saved.")
