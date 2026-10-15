import type { AstroIntegration } from 'astro';
import type { LinkIndex } from './link-index';
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
