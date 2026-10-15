import { defineConfig } from 'vitest/config';

// 构建级用例（tests/build/）：每个用例在临时目录里真的跑一次 astro build，比单元测试慢，单独一个配置。
export default defineConfig({
  test: {
    include: ['tests/build/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
