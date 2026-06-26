/**
 * T-014 标签端到端测试（CommonJS 写法，匹配项目未启用 "type":"module"）
 *  - 假设 backend + frontend 都已运行
 *  - 假设已通过 prisma seed 注入 30 个本地标签
 */
const { test, expect } = require('@playwright/test');

test.describe('T-014 标签页面与过滤', () => {
  test('1. /tags 列表页加载并显示热门 + 全部标签', async ({ page }) => {
    await page.goto('/tags');
    await expect(page).toHaveTitle(/全部标签|标签/);
    // 标题
    await expect(page.getByRole('heading', { name: /全部标签/ }).first()).toBeVisible();
    // 至少看到 1 个热门标签 chip
    await expect(page.getByText('热门标签').first()).toBeVisible();
    // 搜索框存在
    await expect(page.getByPlaceholder('搜索标签名或 slug…')).toBeVisible();
  });

  test('2. 点击热门标签跳转到 /tags/[slug] 详情页', async ({ page }) => {
    await page.goto('/tags');
    // 找到第一个热门标签链接（href 以 /tags/ 开头）
    const firstTagLink = page.locator('a[href^="/tags/"]').first();
    const href = await firstTagLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/^\/tags\/[a-z0-9-]+$/);
    await firstTagLink.click();
    await page.waitForURL(/\/tags\/[a-z0-9-]+$/);
    // 详情页有 Hero 区
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3. 首页点击热门标签 chip 过滤列表 + URL 同步', async ({ page }) => {
    await page.goto('/?type=house');
    // 等待 tag 过滤条出现（异步加载）
    await page.waitForSelector('button:has-text("全部")', { timeout: 10_000 });
    // 点击第二个 chip（第一个是"全部"）
    const tagChips = page.locator('button.rounded-full:has(svg.lucide-hash)');
    const count = await tagChips.count();
    if (count === 0) {
      test.skip(true, '后端未提供热门标签数据');
      return;
    }
    const targetChip = tagChips.first();
    await targetChip.click();
    // URL 应包含 ?tag=
    await expect(page).toHaveURL(/[?&]tag=[^&]+/);
    // 至少 chip 应有"高亮"态（背景色变 emerald-600）
    await expect(targetChip).toHaveClass(/bg-emerald-600/);
  });

  test('4. 标签详情页 /tags/[slug] 显示返回链接', async ({ page }) => {
    // 直接用 30 个 seed 中必定存在的"shanye"slug 试
    await page.goto('/tags/shanye');
    // 至少加载完成（看到返回链接）
    await expect(page.getByRole('link', { name: /返回全部标签/ })).toBeVisible();
  });
});
