import { z } from 'astro/zod';

/**
 * M1 内容元数据的 Zod schema（架构 §3 M1 内容文件表）。
 * 用 strictObject：写错的键（如 `skipable`）直接报错，而不是被悄悄忽略。
 */

/**
 * 标识（页面、选项）：英文 kebab-case，同时是文件名和 URL（ADR-0002）。
 * 必须以字母开头：纯数字的键在 JS 对象里会被排到前面，打乱选项顺序。
 */
export const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const text = z.string().trim().min(1);

/** 步骤视频（FR-40），两个平台算同一个视频的不同来源 */
const videoSchema = z
  .strictObject({
    bilibili: z.string().regex(/^BV[0-9A-Za-z]{10}$/, 'B 站视频要写 BV 号（BV 加 10 位字母数字）').optional(),
    youtube: z.string().regex(/^[\w-]{11}$/, 'YouTube 视频要写 11 位视频 ID').optional(),
  })
  .refine((v) => v.bilibili !== undefined || v.youtube !== undefined, '写了 video 就至少要有 bilibili 或 youtube');

const optionId = z.string().regex(ID_PATTERN, '选项标识要用英文 kebab-case');

/*
 * 内容集合（架构 §3 M1 内容文件表）。页面标题不写在 frontmatter 里，取正文第一行的 `# 标题`
 * （由链接索引读取并校验），所以三个 schema 都没有 title。
 */

/** 原理版 `principle/<id>.md`：一个页面（步骤、选择页、旁支页）的全部元数据都写在这里，frontmatter 可以整段省略 */
export const principleSchema = z
  .strictObject({
    /** 原理独有步骤：没有操作版，操作视图绕过（FR-21） */
    principleOnly: z.boolean().default(false),
    /** 可跳过步骤（FR-15） */
    skippable: z.boolean().default(false),
    /** 跳过按钮文案，缺省由页面决定（FR-15） */
    skipLabel: text.optional(),
    video: videoSchema.optional(),
    /**
     * 选择页的选项（FR-12）：`heading` 是正文里独占一段的加粗文字原文，选项块的包装和
     * “是不是选择页”的核对在路线图和选项块任务里做，这里只校验形状。
     */
    options: z
      .record(optionId, z.strictObject({ title: text, heading: text }))
      .refine((options) => Object.keys(options).length >= 2, '选择页至少要有两个选项')
      .optional(),
  })
  .superRefine((page, ctx) => {
    if (page.skipLabel !== undefined && !page.skippable) {
      ctx.addIssue({ code: 'custom', path: ['skipLabel'], message: '只有 skippable: true 的页面才能写 skipLabel' });
    }
    if (page.principleOnly && page.options !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: '选择页两种视图都要有，不能写 principleOnly: true' });
    }
  });

/** 操作版 `operation/<id>.md`：不写 frontmatter，元数据跟随同名原理版 */
export const operationSchema = z.strictObject({});

/** 参考页 `reference/**`：不写 frontmatter */
export const referenceSchema = z.strictObject({});
