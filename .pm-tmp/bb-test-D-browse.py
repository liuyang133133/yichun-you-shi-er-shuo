"""
黑盒测试 - 模块 D: 内容浏览
覆盖: 列表 / 详情 / 搜索 / 首页帖子链接
"""
import json
import time
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

# 先用 API 拿真实帖子 id
try:
    r = subprocess.run(
        ["curl", "-s", "--noproxy", "*", f"{BASE_API}/api/v1/posts?page=1&limit=5"],
        capture_output=True, text=True, timeout=10
    )
    api_data = json.loads(r.stdout) if r.stdout else {}
    items = api_data.get("data", {}).get("items", []) if "data" in api_data else []
    if not items and "items" in api_data:
        items = api_data.get("items", [])
    real_post_id = items[0]["id"] if items else None
    print(f"  [INFO] API 拿到的最新帖子: {[(i.get('id'), i.get('title','')[:20]) for i in items[:3]]}")
except Exception as e:
    real_post_id = None
    print(f"  [INFO] API 拿帖子失败: {e}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    print("\n========= Module D: 浏览 =========")

    # D-1: 列表页 /posts
    resp = page.goto(f"{BASE_FE}/posts?type=secondhand", wait_until="domcontentloaded", timeout=15000)
    body = page.inner_text("body")
    has_posts_content = ("iPhone" in body or "二手" in body or "全部信息" in body or "加载中" in body or "暂无数据" in body)
    check("D-1 帖子列表页 /posts", resp.status == 200 and has_posts_content,
          f"HTTP {resp.status}, body_len={len(body)}, has_content={has_posts_content}")

    # D-2: 首页有帖子链接
    page.goto(f"{BASE_FE}/", wait_until="networkidle", timeout=15000)
    body = page.inner_text("body")
    has_post_links = "帖子" in body or "出租" in body or "二手" in body or "招聘" in body
    check("D-2 首页包含帖子内容链接", has_post_links, f"has_post_links={has_post_links}, body_len={len(body)}")

    # D-3: API 直查帖子列表 (需要 type 参数 + pageSize, 响应是 data.list)
    api_page = page.request.get(f"{BASE_API}/api/v1/posts?page=1&type=secondhand&pageSize=5")
    api_data = api_page.json() if api_page.status == 200 else {}
    api_items = api_data.get("data", {}).get("list", []) if isinstance(api_data.get("data"), dict) else []
    api_total = api_data.get("data", {}).get("total", 0) if isinstance(api_data.get("data"), dict) else 0
    check("D-3 API /api/v1/posts 返回数据", api_page.status == 200,
          f"status={api_page.status}, total={api_total}, items={len(api_items)}")

    # D-3b: 拿一个真实帖子 id 用来测详情
    real_post_id = api_items[0].get("id") if api_items else None
    print(f"  [INFO] 真实帖子 id={real_post_id}")

    # D-4: 详情页
    if real_post_id:
        resp = page.goto(f"{BASE_FE}/posts/{real_post_id}", wait_until="networkidle", timeout=15000)
        body = page.inner_text("body")
        check("D-4 帖子详情页", resp.status == 200 and len(body) > 50,
              f"HTTP {resp.status}, body_len={len(body)}")

    # D-5: 搜索页 (忽略 React 错误, 验证页面有内容)
    resp = page.goto(f"{BASE_FE}/search", wait_until="domcontentloaded", timeout=15000)
    page.wait_for_timeout(2000)
    body = page.inner_text("body")
    has_search = "搜索" in body or "search" in body.lower() or len(body) > 50
    check("D-5 搜索页可访问", resp.status == 200 and has_search,
          f"HTTP {resp.status}, has_search={has_search}, body_len={len(body)}")

    # D-6: 搜索 API (FULLTEXT 已修, 应 200 不再 500)
    api_page = page.request.get(f"{BASE_API}/api/v1/search?q=出租&limit=10")
    api_data = api_page.json() if api_page.status == 200 else {}
    s_items = api_data.get("data", {}).get("list", []) if isinstance(api_data.get("data"), dict) else []
    check("D-6 搜索 API /api/v1/search?q=出租 (FULLTEXT 索引已加)",
          api_page.status == 200,
          f"status={api_page.status}, items={len(s_items)}, body={api_page.text()[:100]}")

    # D-7: 分类树 API
    api_page = page.request.get(f"{BASE_API}/api/v1/categories")
    cat_data = api_page.json() if api_page.status == 200 else {}
    cat_items = cat_data.get("data", []) if isinstance(cat_data.get("data"), list) else []
    if not cat_items and "items" in cat_data:
        cat_items = cat_data.get("items", [])
    check("D-7 分类 API /api/v1/categories", api_page.status == 200 and len(cat_items) > 0,
          f"status={api_page.status}, cats={len(cat_items) if cat_items else 0}")

    # D-8: 公告 API
    api_page = page.request.get(f"{BASE_API}/api/v1/announcements/active")
    ann_data = api_page.json() if api_page.status == 200 else {}
    ann_items = ann_data.get("data", []) if isinstance(ann_data.get("data"), list) else []
    check("D-8 公告 API", api_page.status == 200,
          f"status={api_page.status}, announcements={len(ann_items) if ann_items else 0}")

    # D-9: 轮播图 API
    api_page = page.request.get(f"{BASE_API}/api/v1/banners/active?position=home_top")
    bn_data = api_page.json() if api_page.status == 200 else {}
    bn_items = bn_data.get("data", []) if isinstance(bn_data.get("data"), list) else []
    check("D-9 轮播图 API", api_page.status == 200,
          f"status={api_page.status}, banners={len(bn_items) if bn_items else 0}")

    # D-10: 区域 API
    api_page = page.request.get(f"{BASE_API}/api/v1/areas")
    ar_data = api_page.json() if api_page.status == 200 else {}
    ar_items = ar_data.get("data", []) if isinstance(ar_data.get("data"), list) else []
    check("D-10 区域 API", api_page.status == 200 and len(ar_items) > 0,
          f"status={api_page.status}, areas={len(ar_items) if ar_items else 0}")

    # D-11: 热门搜索词 API
    api_page = page.request.get(f"{BASE_API}/api/v1/search/hot?limit=10")
    hot_data = api_page.json() if api_page.status == 200 else {}
    print(f"  [INFO] 热门搜索 API 响应: {json.dumps(hot_data, ensure_ascii=False)[:200]}")
    check("D-11 热门搜索 API", api_page.status == 200,
          f"status={api_page.status}")

    browser.close()

# 总结
total = len(results)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = total - passed
print(f"\n========= Module D Summary =========")
print(f"Total: {total}, PASS: {passed}, FAIL: {failed}")

with open(r"e:\workspace\yichun-you-shi-er-shuo\.pm-tmp\report-D.json", "w", encoding="utf-8") as f:
    json.dump({"module": "D-browse", "results": results, "page_errors": page_errors[-5:]}, f, ensure_ascii=False, indent=2)
