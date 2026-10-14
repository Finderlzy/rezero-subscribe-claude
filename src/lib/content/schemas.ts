import { z } from 'astro/zod';

/**
 * M1 内容元数据的 Zod schema（架构 §3 M1 内容文件表）。
 * 用 strictObject：写错的键（如 `skipable`）直接报错，而不是被悄悄忽略。
 */

/**
 * 标识（步骤、分叉点、选项、常见问题）：英文 kebab-case，同时是文件名和 URL（ADR-0002）。
 * 必须以字母开头：纯数字的键在 JS 对象里会被排到前面，打乱选项顺序。
 */
export const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const text = z.string().trim().min(1);

export const stepSchema = z
  .strictObject({
    title: text,
    /** 可跳过步骤（FR-15） */
    skippable: z.boolean().default(false),
    /** 内容待补占位（FR-21） */
    placeholder: z.boolean().default(false),
    /** 步骤视频（FR-40），两个平台算同一个视频的不同来源 */
    video: z
      .strictObject({
        bilibili: z.string().regex(/^BV[0-9A-Za-z]{10}$/, 'B 站视频要写 BV 号（BV 加 10 位字母数字）').optional(),
        youtube: z.string().regex(/^[\w-]{11}$/, 'YouTube 视频要写 11 位视频 ID').optional(),
      })
      .refine((v) => v.bilibili !== undefined || v.youtube !== undefined, '写了 video 就至少要有 bilibili 或 youtube')
      .optional(),
    /** 占位步骤里给出的原文提示（FR-21） */
    placeholderHint: text.optional(),
    /** 跳过按钮文案，默认“已有，跳过”（FR-15） */
    skipLabel: text.optional(),
  })
  .superRefine((step, ctx) => {
    if (step.skipLabel !== undefined && !step.skippable) {
      ctx.addIssue({ code: 'custom', path: ['skipLabel'], message: '只有 skippable: true 的步骤才能写 skipLabel' });
    }
    if (step.placeholderHint !== undefined && !step.placeholder) {
      ctx.addIssue({ code: 'custom', path: ['placeholderHint'], message: '只有 placeholder: true 的步骤才能写 placeholderHint' });
    }
  });

export const choiceSchema = z.strictObject({
  question: text,
  options: z
    .record(
      z.string().regex(ID_PATTERN, '选项标识要用英文 kebab-case'),
      z.strictObject({
        title: text,
        path: text.optional(),
        effort: text.optional(),
        audience: text.optional(),
      }),
    )
    .refine((options) => Object.keys(options).length >= 2, '分叉点至少要有两个选项'),
});

export const faqSchema = z.strictObject({ title: text });

export const pageSchema = z.strictObject({ title: text });
