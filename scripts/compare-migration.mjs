#!/usr/bin/env node
// 一次性核对脚本（#16，FR-03、AC-13）：比对两篇原文章和 src/content/ 里的命令、链接和截图。
//
// 用法：node scripts/compare-migration.mjs [原文章目录]
//   原文章目录默认是 ../Writing/docs/04技术（博客仓库和本仓库放在同一级）。
//
// 比对规则：
// - 命令：围栏代码块（连同语言标记，去掉 Callout 的 `>` 前缀和公共缩进后逐字比较）和行内代码，两边的集合必须相同。
// - 链接：原文的外链（Markdown 链接、裸地址、iframe 地址）必须原样出现在站内；站内的外链必须来自原文，
//   或者是下面登记的双链转换结果。Markdown 链接还要连同链接文字和前后几个字一起对上（VERSION_CHOICES 除外）。
// - 双链：原文的每条双链都要在 WIKILINKS 里登记去向；站内的每条双链都要能追溯到原文的双链或文字指引。
// - 截图：原文的 `![[09附件/文件名|宽度]]` 在站内应写成 `![[文件名|宽度]]`，且文件已入库。
// 允许的改动只有架构 §3 M1 规定的双链转换，逐条打印；还没迁入的内容登记在 PENDING，核对表里对应的行没有勾选。
// 都按集合比较：同一条命令或链接原文出现多次、站内只剩一处时查不出来，这部分靠核对表逐节核对。
//
// 退出码：0 = 没有差异，也没有待补项；1 = 有未登记的差异；2 = 只剩登记过的待补项。

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const sourceDir = resolve(process.argv[2] ?? join(repoRoot, '..', 'Writing', 'docs', '04技术'));
const SOURCES = {
  原理版: join(sourceDir, '如何订阅claude.md'),
  纯操作版: join(sourceDir, '如何订阅claude（纯操作版）.md'),
};
const contentRoot = join(repoRoot, 'src', 'content');
const screenshotDir = join(repoRoot, 'src', 'assets', 'screenshots');
const BLOG = 'https://finderlzy.github.io/Writing/tech';

// 原文的双链（不含截图嵌入）。同一来源、同一写法出现多次时，按文中出现的顺序逐条对应。
// to 是站内的去向：{ file, link } 是步骤或常见问题的双链，{ file, url } 是博客外链；
// drop 是随原文句子一起不迁移的双链，写明理由（见核对表对应小节）。
const WIKILINKS = [
  // 原理版
  { source: '原理版', raw: '04技术/如何订阅claude（纯操作版）|如何订阅claude（纯操作版）', drop: '文章开头介绍两篇文章的句子不迁移（迁移规则 7）' },
  { source: '原理版', raw: '04技术/自建梯子：VPS + 3x-ui + VLESS Reality#六、导入代理软件|自建梯子', to: { file: 'steps/before-you-start.md', url: `${BLOG}/vless-reality/#_5` } },
  { source: '原理版', raw: '04技术/读者实测：方案一和方案三的住宅 IP 对比|方案一和方案三的住宅 IP 对比', to: { file: 'choices/node-plan.md', url: `${BLOG}/residential-ip-test/` } },
  { source: '原理版', raw: '04技术/自建梯子：VPS + 3x-ui + VLESS Reality|自建梯子：VPS + 3x-ui + VLESS Reality', to: { file: 'steps/run-script.md', url: `${BLOG}/vless-reality/` } },
  { source: '原理版', raw: '04技术/给 VPS 节点套上住宅 IP|给 VPS 节点套上住宅 IP', to: { file: 'steps/run-script.md', url: `${BLOG}/vps-residential-ip/` } },
  { source: '原理版', raw: '04技术/读者实测：方案一和方案三的住宅 IP 对比#怎么看 IP 质量|怎么看 IP 质量', to: { file: 'steps/check-ip-quality.md', url: `${BLOG}/residential-ip-test/#ip_1` } },
  // 纯操作版
  { source: '纯操作版', raw: '04技术/如何订阅claude|如何订阅claude', drop: '文章开头介绍两篇文章的句子不迁移（迁移规则 7）' },
  { source: '纯操作版', raw: '04技术/如何订阅claude#开始之前|开始之前', drop: '“开始之前”的提示框正文改用原理版，不再指回原理版（核对表“开始之前”）' },
  { source: '纯操作版', raw: '04技术/如何订阅claude#方案二：住宅 IP 服务器|方案二', drop: '“这里只写视频里的方案……”说的是纯操作版这篇文章，不迁移（迁移规则 7）' },
  { source: '纯操作版', raw: '04技术/如何订阅claude#方案三：直接买住宅节点|方案三', drop: '同上一条（迁移规则 7）' },
  { source: '纯操作版', raw: '04技术/读者实测：方案一和方案三的住宅 IP 对比|读者实测', drop: '同上一条（迁移规则 7）；读者实测的外链已由原理版同一双链迁进选择页' },
  { source: '纯操作版', raw: '04技术/如何订阅claude#方案二：住宅 IP 服务器|方案二', to: { file: 'steps/plan1-buy-vps.md', link: 'plan2-buy-residential-vps|方案二' } },
  { source: '纯操作版', raw: '04技术/如何订阅claude#用 Clash Verge 怎么导入？|用 Clash Verge 怎么导入？', to: { file: 'steps/run-script.md', link: 'clash-verge-import' } },
  { source: '纯操作版', raw: '04技术/如何订阅claude#装过了，想重装？|装过了，想重装？', to: { file: 'steps/run-script.md', link: 'faq/reinstall|装过了，想重装？' } },
  { source: '纯操作版', raw: '04技术/如何订阅claude#方案一：普通服务器 + 白嫖住宅 IP|方案一', drop: '“报错或连不上：看原理版……”不迁移，它指向的内容已放进“运行脚本”正文（核对表“方案一”）' },
  { source: '纯操作版', raw: '04技术/如何订阅claude#附：打开面板排查|附：打开面板排查', drop: '同上一条；“运行脚本”里的面板排查链接来自原理版同一句的改写' },
  { source: '纯操作版', raw: '04技术/如何订阅claude#五、注册 claude|五、注册 claude', drop: '“还没有 Gmail……看原理版”不迁移，这两件事已经是第七、八章的步骤（迁移规则 7）' },
  { source: '纯操作版', raw: '04技术/如何订阅claude#六、订阅（iPhone）|六、订阅（iPhone）', drop: '“安卓用户看原理版……”不迁移，安卓读者在第六章选了安卓（迁移规则 7）' },
  { source: '纯操作版', raw: '04技术/如何订阅claude#附：购买未完成|附：购买未完成', to: { file: 'steps/iphone-subscribe.md', link: 'purchase-failed' } },
];

// 站内由原文的文字指引（“见文末「……」”“第 2 步”等）改写成的双链，quote 是原文里被改写的字句。
const REWRITES = [
  { file: 'steps/plan1-free-residential-ip.md', link: 'plan2-buy-residential-vps|方案二', source: '原理版', quote: '主站卖的是方案二' },
  { file: 'steps/plan1-free-residential-ip.md', link: 'check-ip-quality|检查 IP 质量', source: '原理版', quote: '在「确认出口 IP」里统一测' },
  { file: 'steps/run-script.md', link: 'plan1-free-residential-ip|白嫖住宅 IP', source: '纯操作版', quote: '第 2 步记下的' },
  { file: 'steps/run-script.md', link: 'faq/open-panel|打开面板排查', source: '原理版', quote: '看文末「附：打开面板排查」' },
  { file: 'steps/plan2-buy-residential-vps.md', link: 'plan1-free-residential-ip|白嫖住宅 IP', source: '原理版', quote: '去掉第 2 步' },
  { file: 'steps/plan2-buy-residential-vps.md', link: 'plan1-buy-vps|方案一', source: '原理版', quote: '系统选择同方案一' },
  { file: 'steps/plan2-buy-residential-vps.md', link: 'ssh-connect', source: '原理版', quote: '做方案一的第 3 步' },
  { file: 'steps/plan2-buy-residential-vps.md', link: 'run-script', source: '原理版', quote: '做方案一的第 3 步' },
  { file: 'steps/plan3-buy-node.md', link: 'faq/split-routing|分流规则具体怎么写？', source: '原理版', quote: '见文末「分流规则具体怎么写？」' },
  { file: 'steps/plan3-buy-node.md', link: 'faq/dedicated-ip-check|“1 人独享”怎么确认真的只有我在用？', source: '原理版', quote: '见文末「“1 人独享”怎么确认真的只有我在用？」' },
  { file: 'steps/check-ip-quality.md', link: 'faq/open-panel|打开面板排查', source: '原理版', quote: '看「附：打开面板排查」' },
  { file: 'steps/v2rayn-dns.md', link: 'v2rayn-tun|上一章', source: '原理版', quote: '上一节已经做了' },
  { file: 'steps/v2rayn-import.md', link: 'run-script|运行脚本', source: null, quote: null, note: '新加的一句，告诉方案一、二的读者节点从哪来（核对表“二、配置代理软件”改动）' },
  { file: 'pages/faq.md', link: 'faq/open-panel', source: '原理版', quote: '## 附：打开面板排查', note: '常见问题列表页的条目' },
  { file: 'pages/faq.md', link: 'faq/reinstall', source: '原理版', quote: '### 装过了，想重装？', note: '常见问题列表页的条目' },
  { file: 'pages/faq.md', link: 'faq/dedicated-ip-check', source: '原理版', quote: '### “1 人独享”怎么确认真的只有我在用？', note: '常见问题列表页的条目' },
  { file: 'pages/faq.md', link: 'faq/split-routing', source: '原理版', quote: '### 分流规则具体怎么写？', note: '常见问题列表页的条目' },
];

// Markdown 链接连同前后各 LINK_CONTEXT 个字一起比较。两版写法不同、站内只用了其中一版的，登记在这里（地址都没变）。
const LINK_CONTEXT = 4;
const VERSION_CHOICES = {
  '，搜索 ⟦[pockyt shop](https://shop.pockyt.io)⟧，认准网': '原理版写法；正文用纯操作版的链接，原理版的“认准网址是 shop.pockyt.io”补在后面的括号里（核对表“六、订阅（iPhone）”改动）',
  '，打开 ⟦[shop.pockyt.io](https://shop.pockyt.io)⟧，点左上': '纯操作版写法；站内在链接后补了原理版的“（认准网址是 shop.pockyt.io）”，见下一条',
  '，打开 ⟦[shop.pockyt.io](https://shop.pockyt.io)⟧（认准网': '站内写法，同上一条',
  '在 ⟦[proxy.qsu.hk](https://proxy.qsu.hk/)⟧ 注册（': '纯操作版写法；“白嫖住宅 IP”第 1 条用原理版文字（核对表“一、准备住宅 IP”改动）',
  '理打开 ⟦[ipinfo.io](https://ipinfo.io/what-is-my-ip)⟧，最上面': '纯操作版写法；“检查 IP 质量”用原理版文字（核对表“一、准备住宅 IP”改动）',
  '粘贴到 ⟦[scamalytics.com](https://scamalytics.com/)⟧ 查，风': '纯操作版写法，同上一条',
};

// 还没迁入的内容：核对表里对应的行没有勾选，补上后从这里删掉。
const PENDING = {
  links: {
    'https://youtu.be/BcTUtYYheyA': '配套视频，放在哪些步骤由视频门面任务（#17）决定（核对表“文章开头”）',
    'https://www.youtube-nocookie.com/embed/BcTUtYYheyA': '同上，视频门面点击后才插入 iframe',
  },
  screenshots: Object.fromEntries(
    [
      '订阅claude-脚本-1-ssh.jpg',
      'Pasted image 20261012190537.png',
      'Pasted image 20261012190559.png',
      '订阅claude-脚本-4-连上.jpg|640',
      '订阅claude-脚本-5-粘贴命令.jpg|640',
      '订阅claude-脚本-6-回答问题.jpg|640',
      '订阅claude-脚本-7-安装中.jpg|640',
      '订阅claude-脚本-8-自测成功.jpg|640',
    ].map((name) => [name, '未打码，作者打码后入库（核对表“一、准备住宅 IP · 截图”）']),
  ),
};

// ---- 抽取 ----

const unescapePipe = (s) => s.replace(/\\\|/g, '|');

function stripFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  return m ? { frontmatter: m[1], body: text.slice(m[0].length) } : { frontmatter: '', body: text };
}

// 去掉 Callout 前缀后抽出围栏代码块（连同语言标记），并去掉公共缩进；prose 是代码块以外的行。
function splitCode(text) {
  const lines = text.split('\n').map((l) => l.replace(/^(\s*>\s?)+/, ''));
  const blocks = [];
  const prose = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^\s*(`{3,})(.*)$/.exec(lines[i]);
    if (!open) {
      prose.push(lines[i]);
      continue;
    }
    const close = new RegExp(`^\\s*${open[1]}\`*\\s*$`);
    const body = [];
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j])) body.push(lines[j++]);
    const indent = Math.min(...body.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)[0].length));
    const code = body.map((l) => l.slice(indent).trimEnd()).join('\n');
    blocks.push({ line: i + 1, code: `${open[2].trim()}\n${code}` });
    i = j;
  }
  return { blocks, prose: prose.join('\n') };
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function extract(text) {
  const { blocks, prose } = splitCode(text);
  const inline = [...prose.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
  const urls = [...text.matchAll(/https?:\/\/[^\s<>()\[\]"'`，。）|]+/g)].map((m) => ({ url: m[0], line: lineOf(text, m.index) }));
  const mdLinks = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/^(\s*>\s?)+/, '').replace(/^\s*([-*]|\d+\.)\s+/, '');
    for (const m of line.matchAll(/(?<!!)\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
      const end = m.index + m[0].length;
      const before = line.slice(Math.max(0, m.index - LINK_CONTEXT), m.index);
      mdLinks.push({ key: `${before}⟦${m[0]}⟧${line.slice(end, end + LINK_CONTEXT)}`, url: m[2], line: i + 1 });
    }
  });
  const wikilinks = [];
  const embeds = [];
  for (const m of text.matchAll(/(!?)\[\[([^\]]+)\]\]/g)) {
    const raw = unescapePipe(m[2]);
    const item = { raw, line: lineOf(text, m.index) };
    if (m[1] || raw.startsWith('09附件/')) embeds.push({ ...item, name: raw.replace(/^09附件\//, '') });
    else wikilinks.push(item);
  }
  return { blocks, inline, urls, mdLinks, wikilinks, embeds };
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : [],
  );
}

// ---- 读取 ----

for (const [name, path] of Object.entries(SOURCES)) {
  if (!existsSync(path)) {
    console.error(`找不到原文章（${name}）：${path}\n用法：node scripts/compare-migration.mjs [原文章目录]`);
    process.exit(1);
  }
}

const sources = Object.fromEntries(
  Object.entries(SOURCES).map(([name, path]) => {
    const text = readFileSync(path, 'utf8');
    return [name, { path, text, ...extract(text) }];
  }),
);
const site = walk(contentRoot).map((path) => {
  const text = readFileSync(path, 'utf8');
  const { frontmatter } = stripFrontmatter(text);
  const youtube = /^\s*youtube:\s*["']?([\w-]+)/m.exec(frontmatter)?.[1];
  return { path, rel: relative(contentRoot, path), text, youtube, ...extract(text) };
});
const siteFile = (rel) => site.find((f) => f.rel === rel);

const problems = { 命令: [], 链接: [], 截图: [] };
const pending = [];
const conversions = [];
const drops = [];
const choices = [];

// ---- 命令 ----

const origBlocks = Object.entries(sources).flatMap(([name, s]) => s.blocks.map((b) => ({ ...b, where: `${name}:${b.line}` })));
const siteBlocks = site.flatMap((f) => f.blocks.map((b) => ({ ...b, where: `${f.rel}:${b.line}` })));
const siteCode = new Set(siteBlocks.map((b) => b.code));
const origCode = new Set(origBlocks.map((b) => b.code));
for (const b of origBlocks) if (!siteCode.has(b.code)) problems.命令.push(`站内缺少代码块（${b.where}）：\n${b.code}`);
for (const b of siteBlocks) if (!origCode.has(b.code)) problems.命令.push(`站内多出原文没有的代码块（${b.where}）：\n${b.code}`);

const origInline = new Set(Object.values(sources).flatMap((s) => s.inline));
const siteInline = new Set(site.flatMap((f) => f.inline));
for (const c of origInline) if (!siteInline.has(c)) problems.命令.push(`站内缺少行内代码：\`${c}\``);
for (const c of siteInline) if (!origInline.has(c)) problems.命令.push(`站内多出原文没有的行内代码：\`${c}\``);

// ---- 双链 ----

const queue = new Map();
for (const entry of WIKILINKS) {
  const key = `${entry.source}\0${entry.raw}`;
  queue.set(key, [...(queue.get(key) ?? []), entry]);
}
const converted = []; // 原文双链转换出的站内双链和外链
for (const [name, s] of Object.entries(sources)) {
  for (const w of s.wikilinks) {
    const entry = queue.get(`${name}\0${w.raw}`)?.shift();
    if (!entry) {
      problems.链接.push(`原文双链没有登记去向（${name}:${w.line}）：[[${w.raw}]]`);
      continue;
    }
    if (entry.drop) {
      drops.push(`${name}:${w.line} [[${w.raw}]]\n    不迁移：${entry.drop}`);
      continue;
    }
    const f = siteFile(entry.to.file);
    const target = entry.to.url ?? `[[${entry.to.link}]]`;
    const found = f && (entry.to.url ? f.urls.some((u) => u.url === entry.to.url) : f.wikilinks.some((x) => x.raw === entry.to.link));
    if (!found) problems.链接.push(`转换后的链接不在 ${entry.to.file}（${name}:${w.line} [[${w.raw}]]）：${target}`);
    else conversions.push(`${name}:${w.line} [[${w.raw}]]\n    → ${entry.to.file} ${target}`);
    converted.push(entry.to);
  }
}
for (const [key, rest] of queue) {
  for (const entry of rest) problems.链接.push(`登记的双链在原文里找不到：${key.replace('\0', ' ')}`);
}

const rewrites = [];
for (const r of REWRITES) {
  if (r.source && !sources[r.source].text.includes(r.quote)) {
    problems.链接.push(`改写前的原文字句在${r.source}里找不到（${r.file} [[${r.link}]]）：${r.quote}`);
  }
}
const accounted = [
  ...converted.filter((t) => t.link).map((t) => ({ file: t.file, link: t.link })),
  ...REWRITES.map((r) => ({ file: r.file, link: r.link, rewrite: r })),
];
for (const f of site) {
  for (const w of f.wikilinks) {
    const slot = accounted.find((a) => !a.used && a.file === f.rel && a.link === w.raw);
    if (slot) {
      slot.used = true;
      const r = slot.rewrite;
      if (r) {
        rewrites.push(`${f.rel}:${w.line} [[${w.raw}]]\n    ← ${r.source ? `${r.source}“${r.quote}”` : '（原文没有）'}${r.note ? `；${r.note}` : ''}`);
      }
    } else {
      problems.链接.push(`站内双链追溯不到原文（${f.rel}:${w.line}）：[[${w.raw}]]`);
    }
  }
}
for (const a of accounted) if (!a.used) problems.链接.push(`登记的站内双链不在 ${a.file}：[[${a.link}]]`);

// ---- 外链 ----

const origUrls = new Map();
for (const [name, s] of Object.entries(sources)) for (const u of s.urls) if (!origUrls.has(u.url)) origUrls.set(u.url, `${name}:${u.line}`);
const siteUrls = new Map();
for (const f of site) for (const u of f.urls) if (!siteUrls.has(u.url)) siteUrls.set(u.url, `${f.rel}:${u.line}`);
const videoIds = new Set(site.map((f) => f.youtube).filter(Boolean));
const convertedUrls = new Set(converted.map((t) => t.url).filter(Boolean));

for (const [url, where] of origUrls) {
  if (siteUrls.has(url)) continue;
  const id = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/embed\/)([\w-]+)/.exec(url)?.[1];
  if (id && videoIds.has(id)) continue; // 视频写进了步骤 frontmatter 的 video 字段（M1）
  if (PENDING.links[url]) pending.push(`链接 ${url}（${where}）：${PENDING.links[url]}`);
  else problems.链接.push(`站内缺少原文的外链（${where}）：${url}`);
}
for (const [url, where] of siteUrls) {
  if (!origUrls.has(url) && !convertedUrls.has(url)) problems.链接.push(`站内多出原文没有的外链（${where}）：${url}`);
}

// 互换地址、改链接文字、把链接挪到别的句子里，都会让上下文对不上。
const origLinks = new Map();
for (const [name, s] of Object.entries(sources)) for (const l of s.mdLinks) if (!origLinks.has(l.key)) origLinks.set(l.key, { ...l, where: `${name}:${l.line}` });
const siteLinks = new Map();
for (const f of site) for (const l of f.mdLinks) if (!siteLinks.has(l.key)) siteLinks.set(l.key, { ...l, where: `${f.rel}:${l.line}` });
for (const [key, l] of origLinks) {
  if (siteLinks.has(key) || PENDING.links[l.url]) continue;
  if (VERSION_CHOICES[key]) choices.push(`${l.where} ${key}\n    ${VERSION_CHOICES[key]}`);
  else problems.链接.push(`站内缺少原文的链接（${l.where}）：${key}`);
}
for (const [key, l] of siteLinks) {
  if (origLinks.has(key) || convertedUrls.has(l.url)) continue;
  if (VERSION_CHOICES[key]) choices.push(`${l.where} ${key}\n    ${VERSION_CHOICES[key]}`);
  else problems.链接.push(`站内的链接和原文写法不一致（${l.where}）：${key}`);
}
for (const key of Object.keys(VERSION_CHOICES)) {
  if (!origLinks.has(key) && !siteLinks.has(key)) problems.链接.push(`登记的链接写法两边都找不到：${key}`);
}

// ---- 截图 ----

const origEmbeds = new Map();
for (const [name, s] of Object.entries(sources)) for (const e of s.embeds) if (!origEmbeds.has(e.name)) origEmbeds.set(e.name, `${name}:${e.line}`);
const siteEmbeds = new Map();
for (const f of site) for (const e of f.embeds) if (!siteEmbeds.has(e.name)) siteEmbeds.set(e.name, `${f.rel}:${e.line}`);
for (const [name, where] of origEmbeds) {
  if (siteEmbeds.has(name)) continue;
  if (PENDING.screenshots[name]) pending.push(`截图 ${name}（${where}）：${PENDING.screenshots[name]}`);
  else problems.截图.push(`站内缺少截图（${where}）：![[${name}]]`);
}
for (const [name, where] of siteEmbeds) {
  if (!origEmbeds.has(name)) problems.截图.push(`站内多出原文没有的截图（${where}）：![[${name}]]`);
  if (!existsSync(join(screenshotDir, name.split('|')[0]))) problems.截图.push(`截图文件没有入库（${where}）：${name.split('|')[0]}`);
}

// ---- 报告 ----

const sha = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);
console.log('原文章：');
for (const [name, s] of Object.entries(sources)) console.log(`  ${name} ${s.path}（sha256 ${sha(s.text)}）`);
console.log(`站内：src/content/ 下 ${site.length} 个 Markdown 文件\n`);
console.log(
  `比对范围：代码块 原文 ${origBlocks.length} 个、站内 ${siteBlocks.length} 个；行内代码 ${origInline.size} 种；` +
    `外链 原文 ${origUrls.size} 个、站内 ${siteUrls.size} 个；截图 原文 ${origEmbeds.size} 张、站内 ${siteEmbeds.size} 张\n`,
);

const section = (title, items) => {
  console.log(`## ${title}（${items.length}）`);
  for (const item of items) console.log(`- ${item}`);
  console.log();
};
section('双链转换（架构 §3 M1）', conversions);
section('文字指引改写成的站内双链', rewrites);
section('随原文句子一起不迁移的双链', drops);
section('两版写法不同、站内只用一版的链接', choices);
section('待补（核对表未勾选）', pending);
for (const [kind, items] of Object.entries(problems)) if (items.length) section(`${kind}差异`, items);

const pendingLinks = pending.filter((p) => p.startsWith('链接')).length;
console.log(
  `命令差异 ${problems.命令.length}、链接差异 ${problems.链接.length}、截图差异 ${problems.截图.length}` +
    `（不含已登记的待补：链接 ${pendingLinks} 个、截图 ${pending.length - pendingLinks} 张，原文有、站内还没有）`,
);
const differences = problems.命令.length + problems.链接.length + problems.截图.length;
process.exit(differences ? 1 : pending.length ? 2 : 0);
