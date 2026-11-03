# 项目事实

`AGENTS.md` 的参考文件：改代码、目录、页面、样式、内容、命令时按需读。这里放 Claude 不能从代码自行推出的事实，结构长请看 [architecture.md](../architecture.md)。

## 命令

以 `package.json` 为准（Node ≥ 22.12，npm）。不看配置看不出来的几条：

- `npm run build` 结束时列出的作者待补、博客链接待填不影响构建。`BASE_PATH=/sub/ npm run build` 生成子路径版本。
- `npm run test:e2e` 的第二次构建（`BASE_PATH=/sub/` → `dist-sub/`）必须排在 `dist/` 之后，两次构建不能并行——它们共用 Astro 内容缓存。
- `npm run skill` 重新生成订阅 Skill。**改了重写稿、`agent-skill/source/`、`src/lib/group.ts` 或升了版本号之后都要运行并一起提交**，否则 `npm run check` 报生成物对不上。

Astro 会把 `astro dev`/`astro preview` 转入后台（Windows 除外），用 `npx astro dev stop`/`npx astro preview stop` 停止；`--ignore-lock` 强制前台，和 `--background`/`--force` 互斥。

## 目录

- `src/content/`（集合定义在 `src/content.config.ts`）：`route.yaml` 是路线图（章节、分叉点、页面顺序、旧网址跳转表 `moved:`）；`principle/<标识>.md` 是 11 页单版本正文，元数据在 frontmatter（选择页写 `options`）；`reference/` 只留 IP 质量实测合集和 5 篇实测共 6 页；`blog-links.yaml` 是博客外链映射。
- `src/lib/`：纯逻辑模块，单元测试放旁边（`*.test.ts`；组件渲染测试用 Astro Container API）。按能力地图分：`content/`（M1）、`route/`（M2）、`reader-state/`（M4）、`search/`（M6）、`update-log/`（M7）、`agent-skill/`（M8）、`feedback/`（M9）；`seo/`、`sitemap/`、`video/`、`code-zoom/` 是各模块用的小块。
- `src/pages/`、`src/layouts/`、`src/components/`、`src/styles/`：页面（M3）。`src/scripts/` 是打包进页面的浏览器脚本；根目录 `scripts/` 是一次性开发脚本。
- `agent-skill/`：读者装进自己 AI Agent 的**订阅 Skill**（不是 `.claude/skills/` 里开发用的 Skill）。`source/` 是手写模板，`rezero-subscribe-claude/` 是生成物，入库不手改，构建时逐字核对。见 [ADR-0007](../adr/0007-agent-skill-generated-and-committed.md)。
- `tests/`：`e2e/` 是 Playwright，按验收编号命名（如 `ac-09-unchosen.spec.ts`）；`build/` 是构建级用例（AC-14）；`fixtures/` 是坏内容，每个目录按 `src/content/` 的相对路径覆盖（`@root/` 按仓库相对路径覆盖，`@delete` 逐行列出要删的路径）。
- `docs/`：文档；`docs/v3-rewrite/` 是作者维护的重写稿，站点内容的唯一素材来源。
- `deploy.yml` 见 [deploy.md](deploy.md)；文章同步见 [sync.md](sync.md)；视频见 [video.md](video.md)。

## 内容与素材

正文由 `scripts/import-rewrite.mjs` 从重写稿原样导入，不手改（[ADR-0005](../adr/0005-import-rewrite-verbatim.md)）。重写稿用相对 Markdown 链接（如 `[文字](02-方案一…md)`），导入时转成站内链接；不改命令、链接、优惠码、商家。`[!why]` 块不再使用（[ADR-0004](../adr/0004-whole-page-view-switch.md) 取代 ADR-0003）。

`src/content/` 里作者手写、写错构建失败的三个登记表：`update-log.yaml`（更新日志，字段规则在文件开头注释里）、`seo.yaml`（每页搜索摘要，40–118 字；**改完正文顺手改对应的那一条**）、`feedback.yaml`（读者反馈截图，登记 `image`、`alt`，上首页的写 `featured: true`，最多 6 张）。漏写、写错、引用不存在的项都让构建失败。

素材归属，放错或手改会坏构建：

| 素材 | 位置 | 规矩 |
| --- | --- | --- |
| 正文截图 | `src/assets/screenshots/` | 正文写裸文件名 `![[文件名\|宽度]]` |
| 说明图 | `src/assets/diagrams/` | 由导入脚本从重写稿的 `附件/` 复制；改图改原稿再导入 |
| 读者反馈截图 | `src/assets/feedback/` | 在 `feedback.yaml` 登记 |
| 正文视频 | `public/videos/` | 正文写裸文件名 `![[名字.mp4]]`，导入脚本不复制视频；转码命令见 [v3-rewrite-video-list.md](../v3-rewrite-video-list.md) |
| logo、编号字形、favicon、README 横幅 | `src/assets/logo/`、`src/assets/numerals/`、`public/favicon.svg`、`docs/assets/` | 都由 `node scripts/build-logo.mjs` 生成，不手改；`scripts/build-logo.test.ts` 核对生成物和脚本输出一致 |
| Claude Code 像素小形象 | `src/assets/mascot/` | 只由 `Mascot.astro` 引用；不改色、不放大、不改画 |

站内链接一律经 `src/lib/with-base.ts` 的 `withBase()` 生成。

## 标识与命名

- TypeScript（固定 6.x）、原生 CSS，不引入 UI 框架和 CSS 框架。颜色、间距只用 `src/styles/tokens.css` 里的令牌。
- 页面（步骤、选择页）和分叉点的标识用英文 kebab-case，同时也是文件名和 URL。**v2.0 发布后标识不能改**（[ADR-0002](../adr/0002-url-scheme.md)）；删掉或合并掉的旧标识登记在 `route.yaml` 的 `moved:` 段，旧网址仍然生成跳转页，不能再分给新页面（[ADR-0006](../adr/0006-merged-pages-and-moved-urls.md)）。
- 页面标识、旧网址去向和迁移口径的清单在 [migration-checklist.md](../migration-checklist.md)。
