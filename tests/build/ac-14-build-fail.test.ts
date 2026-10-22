import { describe, expect, test } from 'vitest';
import { buildProject } from './build-project';

/**
 * AC-14 构建级用例（架构 §8）：把仓库的构建输入复制到临时目录，用 tests/fixtures/<用例>/ 覆盖 src/content/，
 * 再执行真实的 astro build，断言构建失败并报出具体文件。另有一个不加坏内容的对照构建，
 * 证明失败来自坏内容，而不是复制出来的工程本身就构建不了。
 */

describe('AC-14 坏内容让构建失败并报出文件', () => {
  test.concurrent('对照：不加坏内容时构建成功', async () => {
    const { code, output } = await buildProject();
    expect(code, output).toBe(0);
  });

  // 每个用例只覆盖一个现有文件（致谢页、选择页或 route.yaml），其余内容不变，所以只会因为这一处坏内容失败。
  // moved-* 的 route.yaml 是真实路线图的副本：真实路线图增删页面后这几份副本要跟着同步（missing-merge 同理）。
  test.concurrent.each([
    {
      fixture: 'missing-image',
      file: 'src/content/operation/thanks.md',
      messages: ['找不到图片“no-such-screenshot.png”'],
    },
    {
      fixture: 'missing-link',
      file: 'src/content/operation/thanks.md',
      messages: ['找不到标题为“没有这一页”的页面'],
    },
    {
      fixture: 'missing-anchor',
      file: 'src/content/operation/thanks.md',
      messages: ['“常见问题”里没有小标题“没有这一条”'],
    },
    {
      // V07：v3 一章一页，页内目录链到不存在的小节时构建失败
      fixture: 'missing-local-anchor',
      file: 'src/content/principle/thanks.md',
      messages: ['这一页里没有小标题“没有这个小节”'],
    },
    {
      fixture: 'missing-merge',
      file: 'route.yaml',
      // 路线图错误按“文件：说明”成行输出（src/lib/site.ts），连同文件名一起断言；
      // “2 处”保证只因挪走汇合点失败：真实路线图增删页面后这份副本会多报错误，要跟着同步
      messages: [
        '路线图校验失败（2 处）',
        'route.yaml：分叉点 phone 的分支段（章节 ending）之后没有汇合点',
        'route.yaml：路线的最后一项必须是普通页面',
      ],
    },
    {
      // 跳转表（FR-25、ADR-0006）：旧标识跳到不存在的页面
      fixture: 'moved-target-missing',
      file: 'route.yaml',
      messages: ['route.yaml：moved.plan1-free-isp 的 to（no-such-page）不是路线图里的页面'],
    },
    {
      // 跳转表写了目标页正文里没有的小节
      fixture: 'moved-section-missing',
      file: 'route.yaml',
      messages: ['route.yaml：moved.plan1-free-isp.section 写的“没有这个小节”在 choose-plan 的原理版正文里找不到唯一的小标题'],
    },
    {
      // 跳转表的目标是另一个旧标识：不串联
      fixture: 'moved-chain',
      file: 'route.yaml',
      messages: ['route.yaml：moved.old-page 的 to（plan1-free-isp）也是旧标识'],
    },
    {
      // 按选择分流的跳转缺 fallback：没有 JS 或没选过时没有去处
      fixture: 'moved-choice-fallback-missing',
      file: 'route.yaml',
      messages: ['route.yaml：moved.old-choice.choice.fallback 要写成 { to: <页面> }'],
    },
    {
      // 分叉点不在路线图里
      fixture: 'moved-choice-unknown-fork',
      file: 'route.yaml',
      messages: ['route.yaml：moved.old-choice.choice.fork（no-such-fork）不是路线图里的分叉点'],
    },
    {
      // 选项和分叉点的选项对不上
      fixture: 'moved-choice-options-mismatch',
      file: 'route.yaml',
      messages: ['route.yaml：moved.old-choice.choice.options 的键要和分叉点 phone 的选项一致（iphone、android）'],
    },
    {
      // 某个选项的去向不存在
      fixture: 'moved-choice-target-missing',
      file: 'route.yaml',
      messages: ['route.yaml：moved.old-choice.choice.options.android 的 to（no-such-page）不是路线图里的页面'],
    },
    {
      // 跳转表的键只能写成页面标识或以 faq/ 开头的参考页路径
      fixture: 'moved-ref-path-bad',
      file: 'route.yaml',
      messages: ['route.yaml：moved 的键 faq/Not-Kebab 只能是页面标识（英文 kebab-case）或以 faq/ 开头的参考页路径'],
    },
    {
      // 旧标识被现有页面占用（原理版文件里有这个标识）
      fixture: 'moved-id-reused',
      // 路线图校验按 src/content/ 内的相对路径报文件（src/lib/site.ts 的“文件：说明”）
      file: 'principle/preface.md',
      messages: ['页面标识 preface 是跳转表的旧标识（旧地址跳到 choose-plan），不能再分给新页面'],
    },
    {
      fixture: 'title-mismatch',
      file: 'src/content/operation/thanks.md',
      messages: ['操作版标题“感谢”与原理版“致谢”不同'],
    },
    {
      // 选项块（FR-12）：方案三的块里第一个链接改成方案二的页面，与路线图不一致
      fixture: 'option-first-step',
      file: 'src/content/operation/choose-plan.md',
      messages: ['选项块“方案三：直接买住宅节点”的第一个链接指向“方案二：住宅 IP 服务器”，但路线图里选项 plan-3 在操作视图下的第一步是“方案三：直接买住宅节点”'],
    },
    {
      // 常见问题一问一页（FR-20）：reference/faq/ 里多了一条，常见问题的目录里没有链到它
      fixture: 'faq-unlisted',
      file: 'src/content/reference/faq/unlisted-question.md',
      messages: ['常见问题（reference/faq.md）里没有链到“没列出来的问题？”'],
    },
    {
      // 拆页之后常见问题首页没有二级标题：旧的 [[常见问题#…]] 锚点写法要改成直接链单条问题
      fixture: 'faq-old-anchor',
      file: 'src/content/operation/thanks.md',
      messages: ['“常见问题”里没有小标题“SSH 提示 Permission denied？”'],
    },
    {
      // 常见问题双向核对（FR-20）：目录里列了一个标题，reference/faq/ 里没有它的条目文件（标题没有标识）
      fixture: 'faq-title-without-id',
      file: 'src/content/reference/faq.md',
      messages: ['常见问题里列了“还没有条目文件的问题？”，但 reference/faq/ 里没有标题是它的条目文件'],
    },
    {
      // 同一条问题在目录里列了两次
      fixture: 'faq-listed-twice',
      file: 'src/content/reference/faq.md',
      messages: ['“装过了，想重装？”在常见问题里列了两次（第 7 行已经列过）'],
    },
    {
      // 一个标题两个标识：两份条目文件同标题
      fixture: 'faq-two-ids',
      file: 'src/content/reference/faq/reinstall-again.md',
      messages: ['标题“装过了，想重装？”与 reference/faq/reinstall.md 重复'],
    },
    {
      // 条目文件没有标题（标识对不上任何问题）
      fixture: 'faq-item-untitled',
      file: 'src/content/reference/faq/no-title.md',
      messages: ['缺少第一行标题'],
    },
    {
      // 条目标识和已有页面（前言 preface）相同（ADR-0002：标识全站一张表）
      fixture: 'faq-id-clash',
      file: 'src/content/reference/faq/preface.md',
      messages: ['常见问题条目的标识“preface”和已有页面的标识相同'],
    },
    {
      fixture: 'bad-metadata',
      file: 'src/content/principle/thanks.md',
      messages: ['principle → thanks data does not match collection schema', 'Unrecognized key: "skipable"'],
    },
  ])('$fixture：报出 $file', async ({ fixture, file, messages }) => {
    const { code, output } = await buildProject({ fixture });
    expect(code, output).not.toBe(0);
    expect(output).toContain(file);
    for (const message of messages) expect(output).toContain(message);
  });
});
