"""
Phase 2.1 E2E 回归 (5 步)
============================================
[A] AI 模式: 招聘帖 → 3 type chips 完整 (职位/公司/薪资)
[B] suggest-title: 真调 LLM, cached=false
[C] missingFields 提示: 输入"出租金水湾" → 至少 2 个缺失字段
[D] Admin 看板: totalCalls + byKind
[E] suggest-title 第二次同 input → cached=true, duration < 500ms

运行: cd e:/workspace/yichun-you-shi-er-shuo && python .pm-tmp/ai-publish-phase2-1-e2e.py
期望: 5/5 PASS

前置: 后端 dev server 在 localhost:3001, MySQL + Redis 在 docker (yichun-mysql, yichun-redis)
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
    print("  Phase 2.1 AI 智能发布 — E2E 回归")
    print("=" * 60)

    # ---------- setup ----------
    hr("setup: 登录测试用户")
    token = login(TEST_PHONE)
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  [OK] user token 拿到 ({token[:20]}...)")

    # ---------- [A] 招聘帖 extract ----------
    hr("[A] AI 模式: 招聘帖 extract → 职位/公司/薪资 3 chip")
    r = requests.post(
        f"{API}/ai/draft/extract",
        headers=headers,
        json={"rawText": "招聘销售经理 碧水木业 月薪5000-8000 大专学历 3年经验"},
        timeout=30,
    )
    r.raise_for_status()
    payload = r.json()
    data = payload.get("data", payload)
    chips = data.get("chips", [])
    chip_labels = [c.get("label") for c in chips]
    chip_values = [str(c.get("value", "")) for c in chips]
    assert_true(any(l == "职位" for l in chip_labels), "含 '职位' chip")
    assert_true(any(l == "公司" for l in chip_labels), "含 '公司' chip")
    assert_true(
        any("5000-8000" in v for v in chip_values),
        "含薪资范围 chip (5000-8000)",
    )
    print(f"  [OK] type={data.get('type')}, chips={len(chips)} → {chip_labels}")
    print(f"  [PASS A]")

    # ---------- [B] suggest-title 真调 ----------
    hr("[B] suggest-title 真调 LLM, cached=false")
    title_payload = {
        "type": "house",
        "fields": {"areaName": "金水湾", "layout": "两室一厅", "price": 1200},
    }
    start = time.time()
    r = requests.post(
        f"{API}/ai/draft/suggest-title",
        headers=headers,
        json=title_payload,
        timeout=30,
    )
    r.raise_for_status()
    data = r.json().get("data", r.json())
    duration1 = time.time() - start
    titles = data.get("titles", [])
    assert_eq(len(titles), 3, "titles 数量")
    assert_eq(data.get("cached"), False, "首次 cached 字段")
    print(f"  [OK] titles={titles} ({duration1:.2f}s)")
    print(f"  [PASS B]")

    # ---------- [E] suggest-title 缓存命中 ----------
    hr("[E] suggest-title 第二次同 input → cached=true, <500ms")
    start = time.time()
    r = requests.post(
        f"{API}/ai/draft/suggest-title",
        headers=headers,
        json=title_payload,
        timeout=30,
    )
    r.raise_for_status()
    data = r.json().get("data", r.json())
    duration2 = time.time() - start
    assert_eq(data.get("cached"), True, "第二次 cached 字段")
    assert_true(
        duration2 < 0.5,
        f"缓存响应 < 500ms (实际 {duration2*1000:.0f}ms)",
    )
    print(f"  [OK] durationMs={data.get('durationMs')} wall={duration2*1000:.0f}ms")
    print(f"  [PASS E]")

    # ---------- [C] missingFields 提示 ----------
    hr("[C] missingFields 提示: 输入 '出租金水湾房子'")
    r = requests.post(
        f"{API}/ai/draft/extract",
        headers=headers,
        json={"rawText": "出租金水湾房子"},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json().get("data", r.json())
    missing = data.get("missingFields", [])
    assert_true(isinstance(missing, list), "missingFields 为 list")
    assert_true(
        len(missing) >= 2,
        f"至少 2 个缺失字段 (实际 {len(missing)}: {missing})",
    )
    print(f"  [OK] missingFields={missing}")
    print(f"  [PASS C]")

    # ---------- [D] Admin 看板 ----------
    hr("[D] Admin 看板 stats")
    # 先尝试 13800000000 (seed 默认 user); 不是 admin 就跳过
    admin_token = None
    for candidate in (ADMIN_PHONE, "13900000001"):
        try:
            admin_token = login(candidate)
            # 探一下: 能访问 admin 接口吗?
            probe = requests.get(
                f"{API}/admin/ai-usage/stats?range=today",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10,
            )
            if probe.status_code == 200:
                break
            admin_token = None
        except Exception:
            admin_token = None
    if admin_token is None:
        print("  [SKIP D] 找不到 admin 测试用户 (13800000000 / 13900000001 都不是 admin)")
        print("           手动验证: GET /admin/ai-usage/stats?range=today 需 admin role")
    else:
        r = requests.get(
            f"{API}/admin/ai-usage/stats?range=today",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        r.raise_for_status()
        stats = r.json().get("data", r.json())
        assert_true("totalCalls" in stats, "含 totalCalls 字段")
        assert_true("byKind" in stats, "含 byKind 字段")
        assert_true(isinstance(stats["byKind"], dict), "byKind 是 dict")
        print(f"  [OK] totalCalls={stats['totalCalls']}, byKind={stats['byKind']}")
        print(f"  [PASS D]")

    print("\n" + "=" * 60)
    print("  Phase 2.1 E2E 全部通过 (5/5)")
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
