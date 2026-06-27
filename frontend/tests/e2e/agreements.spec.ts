/**
 * T-018: 协议页 E2E 测试
 *
 * 测试用户流程:
 *   1. 访问 /terms /privacy /about 3 个页面均可正常渲染
 *   2. 页面有正确的标题和正文
 *   3. /login 页面底部"用户协议"和"隐私政策"链接可点击跳转
 *
 * 前置条件:
 *   - backend 已在 :3001 运行
 *   - 已运行 seed: agreements 表有 terms / privacy / about 3 条 isCurrent=true
 */

import { test, expect } from '@playwright/test';

test.describe('T-018: 协议页面', () => {
  test('1) /terms 页面正常渲染并显示内容', async ({ page }) => {
    const res = await page.goto('/terms');
    expect(res?.status()).toBe(200);
    await expect(page.locator('[data-testid="agreement-content"]')).toBeVisible();
    // 标题含"用户服务协议"
    await expect(page.locator('h1').first()).toContainText('用户服务协议');
    // 包含正文内容（关键字"服务说明"或"信息审核"）
    const body = await page.content();
    expect(body).toMatch(/服务说明|信息审核|用户行为规范/);
  });

  test('2) /privacy 页面正常渲染并显示内容', async ({ page }) => {
    const res = await page.goto('/privacy');
    expect(res?.status()).toBe(200);
    await expect(page.locator('[data-testid="agreement-content"]')).toBeVisible();
    await expect(page.locator('h1').first()).toContainText('隐私政策');
    const body = await page.content();
    expect(body).toMatch(/个人信息|手机号码|收集/);
  });

  test('3) /about 页面正常渲染并显示内容', async ({ page }) => {
    const res = await page.goto('/about');
    expect(res?.status()).toBe(200);
    await expect(page.locator('[data-testid="agreement-content"]')).toBeVisible();
    // about 页第一行是 markdown h1 "关于 伊春有事儿说"
    const body = await page.content();
    expect(body).toMatch(/关于|伊春|本地生活|使命/);
  });

  test('4) /login 页面底部"用户协议"链接点击跳转到 /terms', async ({ page }) => {
    await page.goto('/login');
    // 链接文字可能是"《用户协议》"或"用户协议"
    const link = page.locator('a[href="/terms"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL('**/terms');
    expect(page.url()).toMatch(/\/terms$/);
    await expect(page.locator('[data-testid="agreement-content"]')).toBeVisible();
  });

  test('5) /login 页面底部"隐私政策"链接点击跳转到 /privacy', async ({ page }) => {
    await page.goto('/login');
    const link = page.locator('a[href="/privacy"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL('**/privacy');
    expect(page.url()).toMatch(/\/privacy$/);
    await expect(page.locator('[data-testid="agreement-content"]')).toBeVisible();
  });

  test('6) 不存在的协议 key 显示降级 UI（不抛 500）', async ({ page }) => {
    // 直接 fetch API（页面层 /agreements/:key 无前端路由）
    const res = await page.request.get(
      `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/v1/agreements/non_existent_key`,
    );
    // 后端应返回 4xx
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
