import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * 构建产物 dist/ 里的全部页面，按站内路径返回：dist/a/b/index.html → `a/b/`，dist/404.html → `404.html`，首页是 `''`。
 * 逐页检查的用例（AC-16、axe 扫描）用它，新增的步骤、选择页、参考页自动纳入。`npm run test:e2e` 先构建再测。
 */
export function builtPages(dist = 'dist'): string[] {
  if (!existsSync(dist)) throw new Error(`没有 ${dist}/：先运行 \`npm run test:e2e\`（会先构建；dist-sub/ 由 playwright.config.ts 构建）`);
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return walk(path);
      if (!entry.name.endsWith('.html')) return [];
      return [relative(dist, path).split(sep).join('/').replace(/(^|\/)index\.html$/, '$1')];
    });
  const pages = walk(dist).sort();
  // 防止拿到空的或残缺的产物，逐页用例悄悄变少
  for (const must of ['', '404.html', 'preface/', 'choose-plan/', 'google-appeal/', 'afterword/', 'appendix/', 'faq/', 'faq/split-routing/', 'ip-tests/', 'ip-tests/decodo/']) {
    if (!pages.includes(must)) throw new Error(`${dist}/ 里缺少 /${must}，产物不完整`);
  }
  return pages;
}
