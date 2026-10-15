import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import type { AstroIntegration } from 'astro';
import { listMarkdown, type LinkIndex } from './link-index';
import { validateContent } from './markdown';
import { formatHints, formatProblem, type ContentHint } from './remark-obsidian';

export interface ContentValidationOptions {
  base: string;
  linkIndex: LinkIndex | (() => LinkIndex);
}

/**
 * M5 校验第二层（架构 §3 M5）：构建开始时用同一条 Markdown 管线检查全部内容，
 * 有任何双链、嵌入、Callout 或文件名问题就终止构建，并逐条列出“文件:行:列 说明”。
 * 只在 `astro build` 里生效；开发服务器里问题照样会在渲染时打印，但不会中断服务。
 */
export function contentValidation(options: ContentValidationOptions): AstroIntegration {
  let hints: ContentHint[] = [];
  return {
    name: 'rezero:content-validation',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        const report = await validateContent(options);
        hints = report.hints;
        const { problems } = report;
        if (problems.length === 0) return;
        for (const problem of problems) logger.error(formatProblem(problem));
        // 明细只在上面逐条打印一次：消息里再带“文件:行:列”会被 Astro 当成错误位置重新拼一遍，读起来更乱。
        throw new Error(`内容校验失败，共 ${problems.length} 处，见上方 [rezero:content-validation] 的逐条输出`);
      },
      // 内容提示：操作版缺失、作者待补、博客链接待填，只提示，不让构建失败（架构 §3 M5，FR-21、Q-11）
      'astro:build:done': ({ logger }) => {
        const lines = formatHints(hints);
        if (lines.length === 0) return;
        logger.warn(`内容提示 ${lines.length} 条：`);
        for (const line of lines) logger.warn(line);
      },
    },
  };
}

export interface PlaceholderStep {
  id: string;
  title: string;
}

/**
 * 仍是“内容待补”占位（frontmatter `placeholder: true`）的步骤，按标识排序（FR-21）。
 * 直接读源文件的 frontmatter：构建结束时内容集合已不可用；元数据写错由集合的 Zod 校验报错，这里不重复。
 */
export function listPlaceholderSteps(contentRoot: string): PlaceholderStep[] {
  const dir = join(contentRoot, 'steps');
  return listMarkdown(dir).flatMap((name) => {
    const { frontmatter } = parseFrontmatter(readFileSync(join(dir, name), 'utf8'));
    const { placeholder, title } = frontmatter as Record<string, unknown>;
    if (placeholder !== true) return [];
    const id = basename(name, '.md');
    return [{ id, title: typeof title === 'string' ? title.trim() : id }];
  });
}

/** 占位清单的输出格式：每行一个 `占位步骤：<step-id> <标题>`（架构 §3 M2）。 */
export function formatPlaceholders(steps: readonly PlaceholderStep[]): string[] {
  return steps.map(({ id, title }) => `占位步骤：${id} ${title}`);
}

/** 构建结束时在输出里列出占位步骤，只提示，不让构建失败（FR-21，架构评审 R9）。 */
export function placeholderReport(options: { contentRoot: string }): AstroIntegration {
  return {
    name: 'rezero:placeholder-report',
    hooks: {
      'astro:build:done': ({ logger }) => {
        const steps = listPlaceholderSteps(options.contentRoot);
        if (steps.length === 0) return;
        logger.warn(`还有 ${steps.length} 个步骤内容待补：`);
        for (const line of formatPlaceholders(steps)) logger.warn(line);
      },
    },
  };
}
