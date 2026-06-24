import { defineConfig, devices } from '@playwright/test';

/**
 * T-001: Playwright E2E 配置
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // 不自动启动 webServer：依赖外部运行 dev/start
  // 如需自启可加：webServer: { command: 'npm run dev', port: 3002, reuseExistingServer: true }
});
