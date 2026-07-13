import { defineConfig, devices } from '@playwright/test';

/**
 * Frontend Playwright 配置 — T-018 (T-023 顺手 resolve T-018 merge 遗留的 conflict)
 *
 * 覆盖范围:
 *   - /terms  /privacy  /about 三个协议页面
 *   - /login 页面跳转链接
 *
 * 启动要求:
 *   1. backend 已运行 (localhost:3001)
 *   2. 已 seed 协议数据 (npx prisma db seed)
 *   3. frontend dev server 已运行 (localhost:3000)
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // 协议 seed 共享，避免并发改 DB
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
