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

  // 每个用例只覆盖一个现有文件（日常维护页或 route.yaml），其余内容不变，所以只会因为这一处坏内容失败。
  // moved-* 的 route.yaml 是真实路线图的副本：真实路线图增删页面后这几份副本要跟着同步（missing-merge 同理）。
  // v3 只有一版正文（实施计划 §3.1）：原来的操作版坏内容夹具都改到 principle/maintenance.md；
  // “两版标题不同”“选项块第一个链接不对”“常见问题目录双向核对”这几类用例随功能删除（V10）。
  test.concurrent.each([
    {
      fixture: 'missing-image',
      file: 'src/content/principle/maintenance.md',
      messages: ['找不到图片“no-such-screenshot.png”'],
    },
    {
      fixture: 'missing-link',
      file: 'src/content/principle/maintenance.md',
      messages: ['找不到标题为“没有这一页”的页面'],
    },
    {
      // 测 IP 质量并进了电脑端，常见问题也并进各章；链到实测合集里不存在的小节仍然要失败
      fixture: 'missing-anchor',
      file: 'src/content/principle/maintenance.md',
      messages: ['“IP 质量实测合集”里没有小标题“没有这一条”'],
    },
    {
      // V07：一章一页，页内目录链到不存在的小节时构建失败
      fixture: 'missing-local-anchor',
      file: 'src/content/principle/maintenance.md',
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
      messages: ['route.yaml：moved.old-page 的 to（no-such-page）不是路线图里的页面'],
    },
    {
      // 跳转表写了目标页正文里没有的小节
      fixture: 'moved-section-missing',
      file: 'route.yaml',
      messages: ['route.yaml：moved.old-section.section 写的“没有这个小节”在 afterword 的原理版正文里找不到唯一的小标题（h2 或 h3）'],
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
      messages: ['页面标识 preface 是跳转表的旧标识（旧地址跳到 overview），不能再分给新页面'],
    },
    {
      // 更新日志（v0.13、FR-86）：类型不认识
      fixture: 'update-log-bad-type',
      file: 'src/content/update-log.yaml',
      messages: ['src/content/update-log.yaml 第 1 条：type 只能是 notice、content、site（现在是 "news"）'],
    },
    {
      // 更新日志不能写未来日期
      fixture: 'update-log-future-date',
      file: 'src/content/update-log.yaml',
      messages: ['第 1 条：date（9999-01-01）晚于构建当天'],
    },
    {
      // 更新日志挂到不存在的页面
      fixture: 'update-log-bad-page',
      file: 'src/content/update-log.yaml',
      messages: ['第 1 条：page 写的 no-such-page 不是路线图里的页面或参考页'],
    },
    {
      // SEO 摘要（2026-10-25）：seo.yaml 少写一页，构建失败并指出是哪一页
      fixture: 'seo-missing-page',
      file: 'src/content/seo.yaml',
      messages: ['页面摘要校验失败，共 1 处', 'src/content/seo.yaml 的 ip-tests/decodo：缺少这一页的摘要'],
    },
    {
      // SEO 摘要太长，搜索结果里会被截断
      fixture: 'seo-too-long',
      file: 'src/content/seo.yaml',
      messages: ['src/content/seo.yaml 的 preface：description 有 228 个字符，超过 118 个'],
    },
    {
      fixture: 'bad-metadata',
      file: 'src/content/principle/maintenance.md',
      messages: ['principle → maintenance data does not match collection schema', 'Unrecognized key: "skipable"'],
    },
  ])('$fixture：报出 $file', async ({ fixture, file, messages }) => {
    const { code, output } = await buildProject({ fixture });
    expect(code, output).not.toBe(0);
    expect(output).toContain(file);
    for (const message of messages) expect(output).toContain(message);
  });
});