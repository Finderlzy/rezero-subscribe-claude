import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
// AC-15：同一套产物再按子路径构建一份到 dist-sub/，用照 Nginx 写的静态服务器挂在 /sub/ 下（tests/e2e/static-server.mjs）
const SUB_PORT = 4322;
const SUB_BASE = '/sub/';
const SUB_DIST = 'dist-sub';

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
  // metadata.dist：该 project 测的构建产物目录，逐页用例（built-pages.ts）按它取页面清单
  projects: [
    {
      name: 'mobile-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 } },
      metadata: { dist: 'dist' },
    },
    {
      name: 'desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      metadata: { dist: 'dist' },
    },
    {
      name: 'sub-path',
      testMatch: 'ac-15-*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        baseURL: `http://localhost:${SUB_PORT}${SUB_BASE}`,
      },
      metadata: { dist: SUB_DIST },
    },
  ],
  webServer: [
    {
      command: `npx astro preview --port ${PORT} --ignore-lock`,
      url: `http://localhost:${PORT}/`,
      // 不复用已有服务：4321 上可能残留 astro dev，会让 e2e 测到开发服务而不是 dist/。
      reuseExistingServer: false,
    },
    {
      // 构建在 dist/ 的预览启动之后才开始（webServer 按顺序启动），两次构建不会同时写 Astro 缓存
      command: `npx astro build --outDir ${SUB_DIST} && node tests/e2e/static-server.mjs ${SUB_DIST} ${SUB_BASE} ${SUB_PORT}`,
      env: { BASE_PATH: SUB_BASE },
      url: `http://localhost:${SUB_PORT}${SUB_BASE}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
