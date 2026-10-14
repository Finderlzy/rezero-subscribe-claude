/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// 单元测试与被测模块放在一起（src/**/*.test.ts），e2e 归 Playwright。
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
