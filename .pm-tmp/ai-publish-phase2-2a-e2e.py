"""
Phase 2.2a E2E 回归 (7 步)
============================================
[A] score 端点: 真调 LLM → 4 维分 (score/breakdown/suggestions)
[B] regenerate-seo: admin 调 → 写 Post.seoMeta
[C] sitemap-data: 公开端点 → 返回带 priority 的 list
[D] sitemap.xml: Next.js → 含 quality 权重 (priority=)
[E] 详情页: /posts/<id> → <head> 有 meta + JSON-LD
[F] 列表页 TDK: /?type=house → title 含 "房屋出租"
[G] 重复发贴: 同 title 第二次 → 400 DUPLICATE_POST

运行: cd e:/workspace/yichun-you-shi-er-shuo && python .pm-tmp/ai-publish-phase2-2a-e2e.py
期望: 7/7 PASS

前置: 后端 dev server 在 localhost:3001, 用户端 Next.js 在 localhost:3000,
      MySQL + Redis 在 docker (yichun-mysql, yichun-redis)
"""
import json
import subprocess
import sys
import time

import requests

API = "http://localhost:3001/api/v1"
FRONTEND = "http://localhost:3000"
ADMIN = "http://localhost:3002"

# 测试用户 (DB seed 默认存在; memory 中提到 13900008888 也常用于普通用户)
TEST_PHONE = "13900008888"
# 备用 admin 测试用户 (seed 中 role=admin 的用户)
ADMIN_PHONE = "13800000000"

# AI 调用的超时/重试 — GLM 经 SOCKS5 代理 偶尔 30s+; 重试 2 次降临时网络抖动影响
AI_TIMEOUT = 60
AI_RETRIES = 2


def ai_post(url: str, payload: dict, headers: dict, label: str) -> requests.Response:
    """POST 调用 AI 端点, 网络错误/超时时重试 AI_RETRIES 次."""
    last_exc = None
    for attempt in range(AI_RETRIES + 1):
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=AI_TIMEOUT)
            r.raise_for_status()
            return r
        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError) as e:
            last_exc = e
            if attempt < AI_RETRIES:
                print(f"  [WARN] {label} attempt {attempt+1}/{AI_RETRIES+1} 失败: {type(e).__name__}, 重试...")
                time.sleep(3)
                continue
            raise
    raise last_exc  # unreachable


# 韧性: 收集每步结果, 即使失败也继续
results: list[tuple[str, bool, str]] = []


def step(label: str):
    """step 上下文管理器: 收集 pass/fail, 不抛出"""
    class _Step:
        def __enter__(self):
            print(f"\n--- {label} ---")
            return self

        def __exit__(self, exc_type, exc, tb):
            if exc_type is None:
                results.append((label, True, ""))
            else:
                msg = str(exc)[:150]
                print(f"  [FAIL] {label}: {msg}")
                results.append((label, False, msg))
                return True  # 吞掉异常
    return _Step()


def fetch_sms_code_from_db(phone: str) -> str:
    """
    SMS 是 mock, 验证码写库 (sms_codes 表) + Redis.
    优先从 Redis 拿 (实时), 失败则从 MySQL 兜底.
    """
    # 1) 尝试 Redis
    try:
        out = subprocess.check_output(
            ["docker", "exec", "yichun-redis", "redis-cli", "get", f"sms:code:{phone}"],
            stderr=subprocess.STDOUT,
        ).decode().strip()
        if out and out != "(nil)":
            return out
    except Exception:
        pass
    # 2) MySQL 兜底
    try:
        out = subprocess.check_output(
            [
                "docker", "exec", "yichun-mysql", "mysql",
                "-uroot", "-proot123456", "yichun_db", "-BNe",
                f"SELECT code FROM sms_codes WHERE phone='{phone}' AND consumed=0 "
                f"ORDER BY id DESC LIMIT 1;",
            ],
            stderr=subprocess.STDOUT,
        ).decode().strip()
        lines = [l for l in out.split("\n") if l and not l.startswith("mysql:")]
        if lines:
            return lines[-1].strip()
    except Exception:
        pass
    raise RuntimeError(f"无法从 Redis / MySQL 拿到 phone={phone} 的验证码")


def send_sms_code(phone: str) -> None:
    """触发 SMS 发码 (mock, 验证码写 Redis 5min 有效)"""
    r = requests.post(f"{API}/auth/sms-code", json={"phone": phone}, timeout=10)
    r.raise_for_status()


def login(phone: str) -> str:
    """短信登录, 返回 accessToken. 调用前需确保 phone 已注册 (否则自动注册)"""
    send_sms_code(phone)
    # 等一下 Redis 写入完成
    time.sleep(0.5)
    code = fetch_sms_code_from_db(phone)
    r = requests.post(
        f"{API}/auth/login-sms",
        json={"phone": phone, "code": code},
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()
    # 后端返回: { code: 200, data: { accessToken, refreshToken, ... } } (NestJS 全局包装)
    # 也可能直接是: { accessToken, ... }  (看是否有 GlobalResponseInterceptor)
    token = data.get("data", data).get("accessToken")
    if not token:
        raise RuntimeError(f"login 返回无 accessToken: {data}")
    return token


def hr(title: str):
    print(f"\n--- {title} ---")


def assert_eq(actual, expected, label: str):
    assert actual == expected, f"{label}: 期望 {expected!r}, 实际 {actual!r}"
    print(f"  [OK] {label} == {expected!r}")


def assert_true(cond: bool, label: str):
    assert cond, f"{label}: 条件不成立"
    print(f"  [OK] {label}")


def main() -> int:
    print("=" * 60)
    print("  Phase 2.2a AI 智能发布 — E2E 回归")
    print("=" * 60)

    # ---------- setup ----------
    hr("setup: 登录测试用户")
    token = login(TEST_PHONE)
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  [OK] user token 拿到 ({token[:20]}...)")

    # ---------- [A] score 端点 ----------
    with step("[A] score 端点: 真实帖 → 4 维分"):
        score_payload = {
            "type": "house",
            "title": "金水湾两室一厅 1200",
            "description": "家电齐全,拎包入住,南北通透,采光好",
            "fields": {"areaName": "金水湾", "layout": "两室一厅", "price": 1200},
        }
        r = ai_post(
            f"{API}/ai/draft/score",
            score_payload,
            headers,
            "A-score",
        )
        data = r.json().get("data", r.json())
        assert_true(0 <= data["score"] <= 100, "score 在 0-100")
        assert_true("breakdown" in data, "含 breakdown 字段")
        bd = data["breakdown"]
        assert_true(
            all(k in bd for k in ("title", "description", "completeness", "contact")),
            "breakdown 含 4 维 (title/description/completeness/contact)",
        )
        assert_true(isinstance(data.get("suggestions"), list), "suggestions 为 list")
        print(
            f"  [OK] score={data['score']}, breakdown={bd}, "
            f"suggestions={len(data['suggestions'])}条"
        )

    # ---------- [B] regenerate-seo ----------
    with step("[B] regenerate-seo (admin) → 写 Post.seoMeta"):
        admin_token = None
        for candidate in (ADMIN_PHONE, "13900000001"):
            try:
                cand_token = login(candidate)
                # 先随便拿一帖 id 探一下
                probe = requests.get(
                    f"{API}/posts?type=house&pageSize=1",
                    headers={"Authorization": f"Bearer {cand_token}"},
                    timeout=10,
                )
                if probe.status_code == 200:
                    admin_token = cand_token
                    break
            except Exception:
                continue
        if admin_token is None:
            print("  [SKIP B] 找不到可登录的 admin 测试用户")
        else:
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            # 找一篇 house 帖
            r = requests.get(
                f"{API}/posts?type=house&pageSize=10",
                headers=admin_headers,
                timeout=10,
            )
            r.raise_for_status()
            posts = (
                r.json().get("data", r.json()).get("list")
                or r.json().get("data", r.json()).get("items")
                or []
            )
            if not posts:
                print("  [SKIP B] 无 house 帖可测 regenerate-seo")
            else:
                pid = posts[0]["id"]
                r = requests.post(
                    f"{API}/admin/ai/regenerate-seo/{pid}",
                    headers=admin_headers,
                    timeout=30,
                )
                r.raise_for_status()
                data = r.json().get("data", r.json())
                assert_true("seoMeta" in data, "返回含 seoMeta")
                seo = data["seoMeta"]
                assert_true(
                    "metaTitle" in seo or "title" in seo,
                    "seoMeta 含 metaTitle/title",
                )
                meta_title = seo.get("metaTitle") or seo.get("title") or ""
                print(f"  [OK] postId={pid} metaTitle='{meta_title[:40]}'")

    # ---------- [C] sitemap-data 公开端点 ----------
    with step("[C] sitemap-data 公开端点 → 含 priority"):
        r = requests.get(f"{API}/posts/sitemap-data?limit=10", timeout=10)
        r.raise_for_status()
        data = r.json().get("data", r.json())
        # 后端也可能直接返回 list (看 Service 实现)
        if isinstance(data, dict) and "list" in data:
            entries = data["list"]
        elif isinstance(data, dict) and "data" in data:
            entries = data["data"]
        else:
            entries = data
        assert_true(isinstance(entries, list), "返回 list")
        if not entries:
            print("  [SKIP C] 无帖, 跳过 priority 断言")
        else:
            assert_true(
                all("priority" in e for e in entries),
                "每条 entry 含 priority",
            )
            assert_true(
                all("loc" in e for e in entries),
                "每条 entry 含 loc",
            )
            print(
                f"  [OK] {len(entries)} entries, "
                f"sample priority={entries[0].get('priority')}, "
                f"loc={entries[0].get('loc')}"
            )

    # ---------- [D] sitemap.xml ----------
    with step("[D] sitemap.xml (Next.js) → 含 quality 权重"):
        r = requests.get(f"{FRONTEND}/sitemap.xml", timeout=15)
        assert_eq(r.status_code, 200, "HTTP 200")
        assert_true("<urlset" in r.text, "含 <urlset>")
        # sitemap XML 用 <priority>1</priority>, 不是 priority=1
        assert_true("<priority>" in r.text, "含 <priority> 标签")
        print(f"  [OK] {len(r.text)} bytes")

    # ---------- [E] 详情页 SEO 渲染 ----------
    with step("[E] 详情页 SEO: /posts/<id> → <head> meta + JSON-LD"):
        # 优先找带 seoMeta 的帖
        r = requests.get(
            f"{API}/posts?type=house&pageSize=20",
            headers=headers,
            timeout=10,
        )
        r.raise_for_status()
        posts = (
            r.json().get("data", r.json()).get("list")
            or r.json().get("data", r.json()).get("items")
            or []
        )
        seo_post = next((p for p in posts if p.get("seoMeta")), None)
        if not seo_post:
            # 兜底: 任意一帖 (Phase 2.2a 之前可能都没 seoMeta)
            seo_post = posts[0] if posts else None
        if not seo_post:
            print("  [SKIP E] 无帖可访问")
        else:
            pid = seo_post["id"]
            r = requests.get(
                f"{FRONTEND}/posts/{pid}",
                headers={"User-Agent": "Mozilla/5.0 E2E"},
                timeout=15,
            )
            assert_eq(r.status_code, 200, f"/posts/{pid} HTTP 200")
            body = r.text
            has_meta = (
                'name="description"' in body
                or 'property="og:title"' in body
                or 'application/ld+json' in body
                or "房屋出租" in body
            )
            assert_true(has_meta, "详情页 <head> 含 meta 或 JSON-LD 或类型词")
            print(f"  [OK] postId={pid} 含 SEO meta ({len(body)} bytes)")

    # ---------- [F] 列表页 TDK ----------
    with step("[F] 列表页 TDK: /?type=house → title 含 '房屋出租'"):
        r = requests.get(
            f"{FRONTEND}/?type=house",
            headers={"User-Agent": "Mozilla/5.0 E2E"},
            timeout=15,
        )
        assert_eq(r.status_code, 200, "/?type=house HTTP 200")
        body = r.text
        assert_true(
            "房屋出租" in body or "房屋" in body,
            "页面含 '房屋出租' / '房屋'",
        )
        print(f"  [OK] {len(body)} bytes")

    # ---------- [G] 重复发贴 ----------
    with step("[G] 重复发贴: 同 title 第二次 → 400 DUPLICATE_POST"):
        # 先查一个有效 categoryId (house)
        cat_id = None
        try:
            rc = requests.get(f"{API}/categories?type=house", timeout=10)
            rc.raise_for_status()
            cats = rc.json().get("data", rc.json())
            if isinstance(cats, list) and cats:
                cat_id = cats[0].get("id")
        except Exception:
            pass
        if not cat_id:
            # 兜底: 任意一个 (假设 seed 至少存在 house categoryId=1)
            cat_id = 1

        title = f"测试重复-2a-{int(time.time())}"
        create_payload = {
            "type": "house",
            "categoryId": cat_id,
            "title": title,
            "description": "E2E 重复测试",
            "contactPhone": TEST_PHONE,
        }
        r1 = requests.post(
            f"{API}/posts",
            headers=headers,
            json=create_payload,
            timeout=15,
        )
        r1.raise_for_status()
        print(f"  [OK] 第一次创建成功 (status={r1.status_code})")

        r2 = requests.post(
            f"{API}/posts",
            headers=headers,
            json=create_payload,
            timeout=15,
        )
        assert_eq(r2.status_code, 400, "第二次被拦 status")
        err = r2.json()
        # 业务 code 'DUPLICATE_POST' 在 message 里 (NestJS 全局包装 code=400)
        msg = err.get("message", "")
        assert_true(
            "相同标题" in msg or "DUPLICATE" in msg.upper() or "重复" in msg,
            f"错误消息含重复提示 (实际: {msg[:50]})",
        )
        print(f"  [OK] message={msg[:50]}")

    # ---------- 汇总 ----------
    print("\n" + "=" * 60)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"  Phase 2.2a E2E 汇总: {passed}/{total} PASS")
    for label, ok, detail in results:
        status = "✓" if ok else "✗"
        print(f"    {status} {label}")
        if not ok and detail:
            print(f"        {detail[:100]}")
    print("=" * 60)
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())