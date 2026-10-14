import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

// `npm run test:e2e` 先 build，再用 astro preview 提供 dist/。
// `--ignore-lock`：Astro 7 检测到在 AI Agent 里运行时会把 preview 自动转入后台并立即退出，
// Playwright 会误判为启动失败；该标志强制前台运行，由 Playwright 负责启停。
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 } },
    },
    {
      name: 'desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/`,
    // 不复用已有服务：4321 上可能残留 astro dev，会让 e2e 测到开发服务而不是 dist/。
    reuseExistingServer: false,
  },
});
