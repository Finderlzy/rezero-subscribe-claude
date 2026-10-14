import { readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor, parseFrontmatter, type UnifiedProcessorOptions } from '@astrojs/markdown-remark';
import rehypeCallouts from 'rehype-callouts';
import { listMarkdown, resolveLinkIndex, type LinkIndex } from './link-index';
import { ID_PATTERN } from './schemas';
import remarkObsidian, { type ContentProblem } from './remark-obsidian';

/** 需要经过 Obsidian 写法插件的内容目录（相对内容根目录） */
export const CONTENT_DIRS = ['steps', 'choices', 'faq', 'pages'] as const;

export interface MarkdownPipelineOptions {
  /** 部署根路径，与 astro.config.mjs 的 `base` 相同 */
  base: string;
  linkIndex: LinkIndex | (() => LinkIndex);
  /** 见 RemarkObsidianOptions.onProblems */
  onProblems?: (problems: ContentProblem[]) => void;
}

/**
 * Markdown 管线的唯一配置：astro.config.mjs 用它构造 unified 处理器，校验和单元测试也用它，
 * 保证三处看到的是同一条管线。
 */
export function markdownPipeline({ base, linkIndex, onProblems }: MarkdownPipelineOptions): UnifiedProcessorOptions {
  return {
    // 关掉 SmartyPants：它在用户插件之前改写正文里的引号、`--`、`...`，
    // 会改坏 [[…]] 里的文件名，也会改动正文里的命令和参数（FR-03 要求原样迁移）。
    smartypants: false,
    remarkPlugins: [[remarkObsidian, { base, linkIndex, onProblems }]],
    rehypePlugins: [
      [
        rehypeCallouts,
        {
          // 不用库自带的 Lucide 标题图标（design §3.3：图标全部自画，不引入图标库）。
          // 可折叠写法 [!type]- / [!type]+ 会带出库自带的折叠箭头，已由 remark-obsidian 判为错误。
          showIndicator: false,
          // 原理块 > [!why]（ADR-0003）：输出 data-callout="why"，由 CSS 按视图展开或收起。
          // note / caution 的默认标题换成中文（内容里写了标题时以内容为准）。
          callouts: { why: { title: '为什么' }, note: { title: '提示' }, caution: { title: '注意' } },
        },
      ],
    ],
  };
}

/**
 * 用同一条管线逐个处理全部内容文件，收集 Obsidian 写法的问题（FR-61）。
 *
 * 为什么不靠内容集合渲染时报错：Astro 的 glob loader 会捕获渲染异常、只打一条日志并继续构建，
 * 渲染结果还会按文件摘要缓存（下次构建不再渲染未改动的文件）；它传给插件的正文也去掉了 frontmatter
 * 后再 trim，行号会偏。这里直接读源文件、保留 frontmatter 占位，每次构建都完整检查，行号与源文件一致。
 */
export async function validateContent(options: MarkdownPipelineOptions): Promise<ContentProblem[]> {
  const index = resolveLinkIndex(options.linkIndex);
  const problems: ContentProblem[] = [];
  const pipeline = markdownPipeline({
    base: options.base,
    linkIndex: index,
    onProblems: (found) => problems.push(...found),
  });
  const processor = await createMarkdownProcessor({ ...pipeline, syntaxHighlight: false });
  for (const dir of CONTENT_DIRS) {
    const abs = join(index.contentRoot, dir);
    for (const file of listMarkdown(abs).map((name) => join(abs, name))) {
      const id = basename(file, '.md');
      if (!ID_PATTERN.test(id)) {
        problems.push({
          file: relative(process.cwd(), file).split(sep).join('/'),
          message: `文件名“${id}”不是英文 kebab-case：标识同时是 URL，只能用小写字母、数字和连字符（ADR-0002）`,
        });
      }
      const source = readFileSync(file, 'utf8');
      let body: string;
      try {
        // 'empty-with-spaces'：frontmatter 换成等长空白，正文行号与源文件一致。
        body = parseFrontmatter(source, { frontmatter: 'empty-with-spaces' }).content;
      } catch {
        continue; // frontmatter 写坏由内容集合的 schema 报错
      }
      await processor.render(body, { fileURL: pathToFileURL(file) });
    }
  }
  return problems;
}

