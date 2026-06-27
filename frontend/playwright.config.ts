<<<<<<< HEAD
/**
 * T-014: Frontend Playwright E2E 配置（CommonJS 写法，跨 Node 版本兼容）
 *  - frontend 默认 dev 端口 3000
 *  - 依赖外部手动启动 dev 服务器（不自动启，避免与手动 npm run dev 冲突）
 */
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
=======
import { defineConfig, devices } from '@playwright/test';

/**
 * Frontend Playwright 配置 — T-018
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
>>>>>>> feature/T-018-agreements
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
