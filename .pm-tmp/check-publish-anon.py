"""未登录访问发布页检查"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context()
    pg = ctx.new_page()
    # 关键: 不带任何 cookie, 不带 localStorage
    pg.goto('http://localhost:3000/posts/publish', wait_until='networkidle', timeout=15000)
    print('url:', pg.url)
    print('title:', pg.title())
    body = pg.inner_text('body')
    print('body_len:', len(body))
    print('body 前 200:', body[:200])
    print('---')
    print('localStorage:')
    for k, v in pg.evaluate('() => Object.entries(localStorage)'):
        print(f'  {k}: {v[:50]}')
    b.close()
