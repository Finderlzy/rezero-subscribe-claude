import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLinkIndex } from './link-index';
import { markdownPipeline } from './markdown';
import { formatHints, type ContentHint, type ContentProblem } from './remark-obsidian';
import { createFixture, type Fixture } from './test-fixture';

/** v2.0 内容（principle/、operation/、reference/）的写法转换（架构 §3 M1、ADR-0005） */

let fx: Fixture;

beforeEach(() => {
  fx = createFixture();
  fx.write('principle/preface.md', '# 前言\n\n## 成本\n');
  fx.write('principle/choose-plan.md', '# 选择方案\n');
  fx.write('principle/plan3-residential-node.md', '# 方案三：直接买住宅节点\n');
  fx.write('reference/faq.md', '# 常见问题\n\n## 装过了，想重装？\n\n## “1 人独享”怎么确认真的只有我在用？\n\n## 分流规则具体怎么写？\n');
  fx.write('reference/ip-tests.md', '# IP 质量实测合集\n');
  fx.write('reference/ip-tests/qsu-residential.md', '# 实测：QSU 住宅服务器\n');
  fx.write('blog-links.yaml', '"04技术/给 VPS 节点套上住宅 IP": null\n"04技术/自建梯子：VPS + 3x-ui + VLESS Reality": https://blog.example/vps/\n');
  fx.shot('截图 2026-10-15 13-43-53 1.png');
  fx.shot('IP实测-丽萨-套餐.png');
});
afterEach(() => fx.cleanup());

interface Rendered {
  html: string;
  problems: ContentProblem[];
  hints: ContentHint[];
  headings: { depth: number; slug: string; text: string }[];
}

/** 用生产同款管线渲染一个 v2 内容文件，路径相对内容根目录 */
async function render(path: string, source: string, base = '/'): Promise<Rendered> {
  const file = fx.write(path, source);
  const problems: ContentProblem[] = [];
  const hints: ContentHint[] = [];
  const processor = await createMarkdownProcessor({
    ...markdownPipeline({
      base,
      linkIndex: () => createLinkIndex(fx.contentRoot),
      onProblems: (found) => problems.push(...found),
      onHints: (found) => hints.push(...found),
    }),
    syntaxHighlight: false,
  });
  const content = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' }).content;
  const out = await processor.render(content, { fileURL: pathToFileURL(file) });
  return { html: out.code, problems, hints, headings: out.metadata.headings };
}

const messages = (r: Rendered) => r.problems.map((p) => `${p.line}:${p.column} ${p.message}`);

describe('标题', () => {
  it('第一行的 # 标题从正文里去掉（由布局输出 h1），其余标题照常', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n正文\n\n## 第一步\n');
    expect(r.problems).toEqual([]);
    expect(r.html).not.toContain('<h1');
    expect(r.html).toContain('<h2 id="第一步">第一步</h2>');
  });

  it('frontmatter 之后的标题同样去掉，行号按源文件算', async () => {
    const r = await render('principle/subscribe.md', '---\nskippable: true\n---\n# 订阅\n\n[[没有这页]]\n');
    expect(r.html).not.toContain('<h1');
    expect(messages(r)).toEqual([expect.stringMatching(/^6:1 找不到标题为“没有这页”的页面/)]);
  });

  it('操作版正文的标题 id 加 op- 前缀，避免与同页的原理版重复', async () => {
    fx.write('principle/subscribe.md', '# 订阅\n');
    const r = await render('operation/subscribe.md', '# 订阅\n\n## 第一步\n\n## 第一步\n');
    expect(r.html).toContain('<h2 id="op-第一步">');
    expect(r.html).toContain('<h2 id="op-第一步-1">');
    expect(r.headings.map((h) => h.slug)).toEqual(['op-第一步', 'op-第一步-1']);
  });
});

describe('双链按中文标题解析', () => {
  it('[[标题]] 和 [[标题|文字]] 链到 /<id>/，不写文字时原样用标题', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n先看 [[选择方案]]，再看 [[方案三：直接买住宅节点|方案三]]。\n');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<a href="/choose-plan/">选择方案</a>');
    expect(r.html).toContain('<a href="/plan3-residential-node/">方案三</a>');
  });

  it('部署在子路径下时 href 带上 base', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n[[选择方案]]\n', '/sub/');
    expect(r.html).toContain('href="/sub/choose-plan/"');
  });

  it('找不到标题时报出文件、行号和目标', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n第一行\n见 [[选择方案二]]。\n');
    expect(messages(r)).toEqual(['4:3 找不到标题为“选择方案二”的页面：双链按页面标题（正文第一行的 # 标题）解析：[[选择方案二]]']);
    expect(r.problems[0].file).toMatch(/principle\/subscribe\.md$/);
  });

  it('不能链到操作版独有的标题：操作版不进标题表', async () => {
    fx.write('principle/x.md', '# 甲\n');
    fx.write('operation/x.md', '# 乙\n');
    const r = await render('principle/subscribe.md', '# 订阅\n\n[[乙]]\n');
    expect(messages(r)).toEqual([expect.stringMatching(/找不到标题为“乙”的页面/)]);
  });
});

describe('锚点', () => {
  it('三个真实锚点都能解析成 github-slugger 的 slug', async () => {
    const r = await render(
      'principle/plan3-residential-node.md',
      [
        '# 方案三：直接买住宅节点',
        '',
        '[[常见问题#“1 人独享”怎么确认真的只有我在用？|常见问题]]',
        '[[常见问题#分流规则具体怎么写？|分流规则具体怎么写？]]',
        '[[常见问题#装过了，想重装？|装过了，想重装？]]',
        '[[前言#成本]]',
      ].join('\n'),
    );
    expect(r.problems).toEqual([]);
    // 输出 HTML 时锚点按 URL 规则百分号编码，浏览器解码后与标题 id 相同
    const href = (path: string) => `href="${encodeURI(path)}"`;
    expect(r.html).toContain(`<a ${href('/faq/?from=plan3-residential-node#1-人独享怎么确认真的只有我在用')}>常见问题</a>`);
    expect(r.html).toContain(`<a ${href('/faq/?from=plan3-residential-node#分流规则具体怎么写')}>分流规则具体怎么写？</a>`);
    expect(r.html).toContain(`<a ${href('/faq/?from=plan3-residential-node#装过了想重装')}>`);
    // 不写文字时仿照 Obsidian 显示“页面 > 小标题”
    expect(r.html).toContain(`<a ${href('/preface/#成本')}>前言 > 成本</a>`);
  });

  it('目标页没有这个小标题时报错', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n[[常见问题#没有这一条|看这里]]\n');
    expect(messages(r)).toEqual(['3:1 “常见问题”里没有小标题“没有这一条”：[[常见问题#没有这一条|看这里]]']);
  });

  it('第一行标题不算小标题', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n[[前言#前言]]\n');
    expect(messages(r)).toEqual([expect.stringMatching(/“前言”里没有小标题“前言”/)]);
  });
});

describe('参考页链接带 ?from=', () => {
  it('从步骤（两版都算）链到参考页时带当前页标识，锚点放在查询串之后', async () => {
    fx.write('principle/subscribe.md', '# 订阅\n');
    const op = await render('operation/subscribe.md', '# 订阅\n\n[[IP 质量实测合集]]、[[实测：QSU 住宅服务器|它的实测]]\n');
    expect(op.html).toContain('<a href="/ip-tests/?from=subscribe">IP 质量实测合集</a>');
    expect(op.html).toContain('<a href="/ip-tests/qsu-residential/?from=subscribe">它的实测</a>');
  });

  it('参考页之间、步骤之间不带', async () => {
    const ref = await render('reference/ip-tests/lisahost.md', '# 实测：丽萨住宅服务器\n\n[[IP 质量实测合集]]、[[选择方案]]\n');
    expect(ref.html).toContain('<a href="/ip-tests/">IP 质量实测合集</a>');
    expect(ref.html).toContain('<a href="/choose-plan/">选择方案</a>');
  });
});

describe('重写稿的目录页和博客文章', () => {
  it('三种目录页写法都指向首页', async () => {
    const r = await render(
      'principle/subscribe.md',
      '# 订阅\n\n[[如何订阅claude|目录]]、[[如何订阅claude（纯操作版）]]、[[04技术/如何订阅claude（纯操作版）|纯操作版]]、[[如何订阅claude]]\n',
    );
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<a href="/">目录</a>');
    expect(r.html).toContain('<a href="/">如何订阅claude（纯操作版）</a>');
    expect(r.html).toContain('<a href="/">纯操作版</a>');
    expect(r.html).toContain('<a href="/">如何订阅claude</a>');
  });

  it('[[04技术/…]] 查 blog-links.yaml：有地址时是外链', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n看 [[04技术/自建梯子：VPS + 3x-ui + VLESS Reality|自建梯子]]。\n');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<a href="https://blog.example/vps/">自建梯子</a>');
    expect(r.hints).toEqual([]);
  });

  it('地址为 null 时只输出文字，并进内容提示', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n看 [[04技术/给 VPS 节点套上住宅 IP|给 VPS 节点套上住宅 IP]] 和 [[04技术/给 VPS 节点套上住宅 IP]]。\n');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<p>看 给 VPS 节点套上住宅 IP 和 给 VPS 节点套上住宅 IP。</p>');
    const hint = { kind: 'blog-link', target: '04技术/给 VPS 节点套上住宅 IP', line: 3, page: { id: 'subscribe', title: '订阅' } };
    expect(r.hints).toEqual([expect.objectContaining(hint), expect.objectContaining(hint)]);
  });

  it('表里没有这一项时报错', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n[[04技术/没登记的文章]]\n');
    expect(messages(r)).toEqual(['3:1 blog-links.yaml 里没有“04技术/没登记的文章”：先在表里加上这一项（地址待定写 null）：[[04技术/没登记的文章]]']);
  });

  it('其他带 / 的目标无法识别', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n[[steps/preface]]\n');
    expect(messages(r)).toEqual([expect.stringMatching(/^3:1 无法识别的链接目标“steps\/preface”/)]);
  });
});

describe('手写页脚', () => {
  it('末尾“分隔线 + 上一步/下一步/回到”的一段去掉，其中的双链不再解析', async () => {
    for (const footer of ['上一步：[[选择方案]] ｜ 下一步：[[不存在]]', '回到：[[如何订阅claude|目录]]', '下一步：[[前言]]']) {
      const r = await render('principle/subscribe.md', `# 订阅\n\n正文\n\n---\n\n${footer}\n`);
      expect(r.problems).toEqual([]);
      expect(r.html.trim()).toBe('<p>正文</p>');
    }
  });

  it('不在末尾、前面没有分隔线、或不是这三种开头时保留', async () => {
    const middle = await render('principle/subscribe.md', '# 订阅\n\n---\n\n下一步：[[前言]]\n\n正文\n');
    expect(middle.html).toContain('<hr>');
    expect(middle.html).toContain('下一步：<a href="/preface/">前言</a>');

    const noRule = await render('principle/subscribe.md', '# 订阅\n\n正文\n\n下一步：[[前言]]\n');
    expect(noRule.html).toContain('下一步：<a href="/preface/">前言</a>');

    const other = await render('principle/subscribe.md', '# 订阅\n\n正文\n\n---\n\n参考：[[前言]]\n');
    expect(other.html).toContain('<hr>');
    expect(other.html).toContain('参考：<a href="/preface/">前言</a>');
  });
});

describe('TODO 段落', () => {
  it('以 TODO： 开头的段落变成“作者待补”提示，原文保留，并进内容提示', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\nTODO：补上申诉页面的截图和 [[前言]]。\n\n普通段落里的 TODO：不算\n');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain(
      '<aside class="author-todo"><strong class="author-todo-label">作者待补</strong> TODO：补上申诉页面的截图和 <a href="/preface/">前言</a>。</aside>',
    );
    expect(r.html).toContain('<p>普通段落里的 TODO：不算</p>');
    expect(r.hints).toEqual([
      expect.objectContaining({ kind: 'author-todo', text: 'TODO：补上申诉页面的截图和 [[前言]]。', line: 3, page: { id: 'subscribe', title: '订阅' } }),
    ]);
  });
});

describe('嵌入与 Callout', () => {
  it('无宽度的嵌入（文件名带空格）能解析', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n![[截图 2026-10-15 13-43-53 1.png]]\n\n![[IP实测-丽萨-套餐.png|300]]\n');
    expect(r.problems).toEqual([]);
    // 图片交给 Astro 的图片服务，这里输出的是占位属性里的 JSON
    expect(r.html).toContain('screenshots/截图 2026-10-15 13-43-53 1.png&#x22;');
    expect(r.html).toContain('screenshots/IP实测-丽萨-套餐.png&#x22;');
  });

  it('缺图片时报错', async () => {
    const r = await render('principle/subscribe.md', '# 订阅\n\n![[截图 2026-10-15 13-43-53 2.png]]\n');
    expect(messages(r)).toEqual([expect.stringMatching(/^3:1 找不到图片“截图 2026-10-15 13-43-53 2.png”/)]);
  });

  it('v2 内容不再接受 [!why]，note 和 caution 照常', async () => {
    const why = await render('principle/subscribe.md', '# 订阅\n\n> [!why] 为什么\n> 原因\n');
    expect(messages(why)).toEqual(['3:3 不支持的 Callout 类型“[!why]”，只能用 [!note]、[!caution]（小写）']);
    const note = await render('principle/subscribe.md', '# 订阅\n\n> [!note]\n> 提示\n');
    expect(note.problems).toEqual([]);
  });
});

describe('formatHints', () => {
  it('按架构 §3 M5 的格式输出：同类排在一起，作者待补按页面合计，博客链接按目标去重', () => {
    const page = { id: 'plan1-buy-isp', title: '四、购买 ISP 代理' };
    const hints: ContentHint[] = [
      { kind: 'blog-link', file: 'p', page, target: '04技术/乙' },
      { kind: 'author-todo', file: 'p', page, text: 'TODO：甲' },
      { kind: 'missing-operation', file: 'a', page: { id: 'android-subscribe', title: '安卓：订阅' } },
      { kind: 'blog-link', file: 'p', page, target: '04技术/甲' },
      { kind: 'author-todo', file: 'o', page, text: 'TODO：乙' },
      { kind: 'blog-link', file: 'o', page, target: '04技术/甲' },
    ];
    expect(formatHints(hints)).toEqual([
      '操作版缺失：android-subscribe 安卓：订阅',
      '作者待补：plan1-buy-isp 四、购买 ISP 代理（2 处）',
      '博客链接待填：04技术/乙',
      '博客链接待填：04技术/甲',
    ]);
  });
});
