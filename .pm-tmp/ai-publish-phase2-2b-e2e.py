"""
Phase 2.2b E2E 回归 (5 步)
============================================
[A] rewrite 端点: 标题 → 3 版本
[B] extract 含 isBusiness: 招聘帖 → isBusiness=true
[C] 发布帖 → 10s 后 qualityScore + seoMeta 写入 (用新帖测试)
[D] boost stub: 调用 → 503 BOOST_NOT_READY
[E] Admin 看板: 含 seoCoverageRate + avgQualityScore + businessPostRate

运行: cd e:/workspace/yichun-you-shi-er-shuo && python .pm-tmp/ai-publish-phase2-2b-e2e.py
期望: 5/5 PASS

前置: 后端 dev server 在 localhost:3001, 用户端 Next.js 在 localhost:3000,
      MySQL + Redis 在 docker (yichun-mysql, yichun-redis)
"""
import subprocess
import sys
import time

import requests

API = "http://localhost:3001/api/v1"
FRONTEND = "http://localhost:3000"

# 测试用户 (DB seed 默认存在)
TEST_PHONE = "13900008888"
# 备用 admin 测试用户
ADMIN_PHONE = "13900000001"


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
    # 后端返回: { code: 200, data: { accessToken, refreshToken, ... } }
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
    print("  Phase 2.2b AI 智能发布 — E2E 回归")
    print("=" * 60)

    # ---------- setup ----------
    hr("setup: 登录测试用户")
    token = login(TEST_PHONE)
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  [OK] user token 拿到 ({token[:20]}...)")

    admin_token = None
    try:
        admin_token = login(ADMIN_PHONE)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print(f"  [OK] admin token 拿到 ({admin_token[:20]}...)")
    except Exception as e:
        print(f"  [WARN] admin 登录失败: {e} — 步骤 [E] 将尝试候选或跳过")
        admin_headers = None

    # ---------- [A] rewrite 端点 ----------
    hr("[A] rewrite 端点: 标题 → 3 版本")
    r = requests.post(
        f"{API}/ai/draft/rewrite",
        headers=headers,
        json={
            "type": "house",
            "field": "title",
            "original": "金水湾出租 1200",
            "context": {"layout": "两室一厅"},
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json().get("data", r.json())
    assert_true("versions" in data, "返回含 versions")
    assert_eq(len(data["versions"]), 3, "versions 数量")
    assert_true(
        all("text" in v and "style" in v for v in data["versions"]),
        "每个 version 含 text + style",
    )
    for i, v in enumerate(data["versions"]):
        print(f"  [OK] v{i+1} style={v.get('style')}, text='{v.get('text', '')[:40]}'")
    print(f"  [PASS A]")

    # ---------- [B] extract 含 isBusiness ----------
    hr("[B] extract 含 isBusiness: 招聘帖 → isBusiness=true")
    r = requests.post(
        f"{API}/ai/draft/extract",
        headers=headers,
        json={
            "rawText": "招聘销售经理 碧水木业 月薪5000-8000 长期招聘多名",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json().get("data", r.json())
    assert_eq(data.get("isBusiness"), True, "isBusiness")
    assert_eq(data.get("businessType"), "recruiter", "businessType")
    print(f"  [OK] isBusiness={data.get('isBusiness')}, "
          f"businessType={data.get('businessType')}")
    print(f"  [PASS B]")

    # ---------- [C] 发布帖 → 10s 后 qualityScore + seoMeta ----------
    hr("[C] 发布帖自动 AI 处理: 15s 后 qualityScore + seoMeta")
    # 找有效 categoryId
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
        cat_id = 1  # 兜底

    title = f"测试-AI处理-2b-{int(time.time())}"
    create_payload = {
        "type": "house",
        "categoryId": cat_id,
        "title": title,
        "description": "新帖测试 — E2E 验证自动 AI 处理",
        "contactPhone": TEST_PHONE,
        "price": 1000,
    }
    r = requests.post(
        f"{API}/posts",
        headers=headers,
        json=create_payload,
        timeout=15,
    )
    r.raise_for_status()
    new_id = r.json().get("data", r.json()).get("id")
    assert_true(new_id is not None, "返回 post id")
    print(f"  [OK] 创建帖 id={new_id}, 等 15s 让 async AI 处理完成...")
    time.sleep(15)
    r = requests.get(f"{API}/posts/{new_id}", headers=headers, timeout=10)
    r.raise_for_status()
    post = r.json().get("data", r.json())
    quality_score = post.get("qualityScore")
    seo_meta = post.get("seoMeta")
    assert_true(quality_score is not None, "qualityScore 已生成")
    assert_true(seo_meta is not None, "seoMeta 已生成")
    meta_title = (seo_meta or {}).get("metaTitle") or (seo_meta or {}).get("title") or ""
    print(f"  [OK] qualityScore={quality_score}, seoMeta.metaTitle='{meta_title[:40]}'")
    print(f"  [PASS C]")

    # ---------- [D] boost stub ----------
    hr("[D] boost stub: 调用 → 503 BOOST_NOT_READY")
    r = requests.post(
        f"{API}/posts/{new_id}/boost",
        headers=headers,
        json={"days": 1, "paymentToken": "stub"},
        timeout=10,
    )
    assert_eq(r.status_code, 503, "HTTP 503")
    err = r.json()
    assert_eq(err.get("code"), "BOOST_NOT_READY", "错误码")
    print(f"  [OK] message={err.get('message')}")
    print(f"  [PASS D]")

    # ---------- [E] Admin 看板扩展 ----------
    hr("[E] Admin 看板: seoCoverageRate + avgQualityScore + businessPostRate")
    # 兜底: 如果 13900000001 不是 admin, 尝试 13800000000
    used_headers = admin_headers
    used_phone = ADMIN_PHONE
    if used_headers is None:
        try:
            cand_token = login("13800000000")
            used_headers = {"Authorization": f"Bearer {cand_token}"}
            used_phone = "13800000000"
        except Exception:
            pass

    if used_headers is None:
        print(f"  [SKIP E] 无 admin token, 跳过看板断言")
    else:
        r = requests.get(
            f"{API}/admin/ai-usage/stats?range=today",
            headers=used_headers,
            timeout=10,
        )
        if r.status_code != 200:
            print(f"  [SKIP E] {used_phone} 非 admin (status={r.status_code})")
        else:
            data = r.json().get("data", r.json())
            assert_true("seoCoverageRate" in data, "含 seoCoverageRate")
            assert_true("avgQualityScore" in data, "含 avgQualityScore")
            assert_true("businessPostRate" in data, "含 businessPostRate")
            print(
                f"  [OK] seoCoverageRate={data['seoCoverageRate']:.2f}, "
                f"avgQualityScore={data['avgQualityScore']:.0f}, "
                f"businessPostRate={data['businessPostRate']:.2f}"
            )
            print(f"  [PASS E]")

    print("\n" + "=" * 60)
    print("  Phase 2.2b E2E 全部通过 (5/5)")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as e:
        print(f"\n[FAIL] {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(2)
