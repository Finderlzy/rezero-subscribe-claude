import { readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { describe, expect, it } from 'vitest';
import routeText from '../content/route.yaml?raw';
import { principleSchema } from './content/schemas';
import { movedEntries, RouteValidationError, type RouteMap, type Stop, type ViewMode } from './route/route-map';
import { parseRouteYaml } from './route/route-yaml';
import { assembleRoute, buildMovedPages, pageTitle, searchPageIds, searchReferences, startOf, type PrincipleEntry } from './site';

const START_ONLY = `
chapters:
  - id: start
    title: 开始
    items: [preface, afterword]
`;

const entry = (id: string, data: Partial<PrincipleEntry['data']> = {}): PrincipleEntry => ({
  id,
  body: `# 标题 ${id}\n\n正文`,
  data: { principleOnly: false, skippable: false, ...data },
});

describe('parseRouteYaml', () => {
  it('把 route.yaml 文本解析成普通对象', () => {
    expect(parseRouteYaml(START_ONLY)).toEqual({ chapters: [{ id: 'start', title: '开始', items: ['preface', 'afterword'] }] });
  });

  it('YAML 写坏时报出 route.yaml 和行号', () => {
    expect(() => parseRouteYaml('chapters:\n  - id: start\n   title: 开始\n')).toThrow(/route\.yaml.*第 3 行/);
  });
});

describe('pageTitle', () => {
  it('取正文第一个非空行的 # 标题', () => {
    expect(pageTitle('\n# 选择方案  \n\n正文', 'x.md')).toBe('选择方案');
  });

  it('没有时报出文件', () => {
    expect(() => pageTitle('正文', 'src/content/principle/x.md')).toThrow(/principle\/x\.md：缺少第一行标题/);
    expect(() => pageTitle(undefined, 'y.md')).toThrow(/y\.md/);
  });
});

describe('assembleRoute', () => {
  it('标题取正文第一行，带上 principleOnly、skippable、skipLabel', () => {
    const route = assembleRoute(parseRouteYaml(START_ONLY), [entry('afterword'), entry('preface', { skippable: true, skipLabel: '跳过吧' })]);
    expect(route.data.pages['preface']).toEqual({ title: '标题 preface', principleOnly: false, skippable: true, skipLabel: '跳过吧' });
    expect(route.view('preface', {}, 'operation').next).toEqual({ kind: 'step', id: 'afterword', title: '标题 afterword' });
  });

  it('选择页的选项按 frontmatter 里的书写顺序', () => {
    const spec = parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items:
      - preface
      - { choose: node-plan, page: choose-plan }
      - branch: node-plan
        options: { plan-2: [b], plan-1: [a] }
      - afterword
`);
    const options = { 'plan-2': { title: '方案二' }, 'plan-1': { title: '方案一' } };
    const route = assembleRoute(spec, [entry('preface'), entry('choose-plan', { options }), entry('a'), entry('b'), entry('afterword')]);
    expect(route.data.forks['node-plan']).toEqual({
      page: 'choose-plan',
      options: [
        { id: 'plan-2', title: '方案二' },
        { id: 'plan-1', title: '方案一' },
      ],
    });
  });

  it('路线图有错时抛出 RouteValidationError，列出出错的文件', () => {
    const run = () => assembleRoute(parseRouteYaml(START_ONLY), [entry('preface'), entry('afterword'), entry('orphan')]);
    expect(run).toThrow(RouteValidationError);
    expect(run).toThrow(/principle\/orphan\.md/);
  });
});

describe('searchPageIds：站内搜索的页面顺序', () => {
  const spec = parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items:
      - preface
      - { choose: node-plan, page: choose-plan }
      - branch: node-plan
        options:
          plan-1: [a, b]
          plan-2: [b, c]
      - afterword
side:
  extra: { returnTo: preface }
`);
  const entries = ['preface', 'a', 'b', 'c', 'afterword', 'extra'].map((id) => entry(id));
  entries.splice(1, 0, entry('choose-plan', { options: { 'plan-1': { title: '方案一' }, 'plan-2': { title: '方案二' } } }));

  it('按目录顺序列步骤、选择页和分支的各个选项，共享步骤只算第一次，旁支页排在最后', () => {
    const route = assembleRoute(spec, entries);

    expect(searchPageIds(route)).toEqual(['preface', 'choose-plan', 'a', 'b', 'c', 'afterword', 'extra']);
  });

  it('路线图里的每个页面都只出现一次', () => {
    const route = assembleRoute(spec, entries);
    const ids = searchPageIds(route);

    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(route.data.pages).sort());
  });
});

describe('searchReferences：站内搜索保留的参考页', () => {
  it('只留 IP 质量实测合集和它的各篇实测，合集在前、其余按标识排序，其他参考页不进索引', () => {
    const references = new Map(
      [
        { id: 'ip-tests/voyracloud', title: '实测：VoyraCloud 住宅服务器' },
        { id: 'ip-tests', title: 'IP 质量实测合集' },
        { id: 'ip-tests/decodo', title: '实测：Decodo ISP' },
        { id: 'ip-testsx', title: '不是实测页' },
      ].map((reference) => [reference.id, reference]),
    );

    const kept = searchReferences(references);
    expect(kept.map((reference) => reference.id)).toEqual(['ip-tests', 'ip-tests/decodo', 'ip-tests/voyracloud']);
    expect(kept.map((reference) => reference.title)).toEqual(['IP 质量实测合集', '实测：Decodo ISP', '实测：VoyraCloud 住宅服务器']);
  });
});

// ================================================================ 跳转表

describe('buildMovedPages：跳转页的目标页和小节锚点（FR-25、架构 §13.4）', () => {
  const spec = parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items: [preface, afterword]
moved:
  old-page: { to: afterword }
  old-section: { to: afterword, section: 小节一 }
`);
  const entries = [entry('preface'), entry('afterword')];
  const route = assembleRoute(spec, entries);
  const headings = new Map([
    [
      'afterword',
      [
        { slug: '小节一', text: '小节一', depth: 2 },
        { slug: '小节二', text: '小节二', depth: 2 },
        { slug: '小节三', text: '小节三', depth: 3 },
      ],
    ],
  ]);

  it('没有 section 时跳到页顶；有 section 时按标题文字找 slug，页面标题取自路线图', () => {
    expect(buildMovedPages(spec, route, (id) => headings.get(id))).toEqual([
      { from: 'old-page', to: 'afterword', toTitle: '标题 afterword' },
      { from: 'old-section', to: 'afterword', toTitle: '标题 afterword', section: '小节一', anchor: '小节一' },
    ]);
  });

  it('section 认 h2 和 h3（常见问题并进各章后是 h3），h4 以下不算', () => {
    const specFor = (section: string) =>
      parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items: [preface, afterword]
moved:
  old-section: { to: afterword, section: ${section} }
`);
    const deep = new Map([
      [
        'afterword',
        [
          { slug: '小节一', text: '小节一', depth: 2 },
          { slug: '小节三', text: '小节三', depth: 3 },
          { slug: '小节四', text: '小节四', depth: 4 },
        ],
      ],
    ]);
    const h3 = specFor('小节三');
    const h4 = specFor('小节四');

    expect(buildMovedPages(h3, assembleRoute(h3, entries), (id) => deep.get(id))).toEqual([
      { from: 'old-section', to: 'afterword', toTitle: '标题 afterword', section: '小节三', anchor: '小节三' },
    ]);
    expect(() => buildMovedPages(h4, assembleRoute(h4, entries), (id) => deep.get(id))).toThrow(
      /找不到唯一的小标题（h2 或 h3）/,
    );
  });

  it('小节不存在时报出 route.yaml，不生成跳转页', () => {
    const bad = parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items: [preface, afterword]
moved:
  old-section: { to: afterword, section: 没有这个小节 }
`);
    const badRoute = assembleRoute(bad, entries);

    expect(() => buildMovedPages(bad, badRoute, (id) => headings.get(id))).toThrow(
      /route\.yaml：moved\.old-section\.section 写的“没有这个小节”在 afterword 的原理版正文里找不到唯一的小标题/,
    );
    expect(() => buildMovedPages(bad, badRoute, () => undefined)).toThrow(/找不到唯一的小标题/);
  });

  it('目标页不在路线图里时失败（M2 校验之前的兜底）', () => {
    const ghost = parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items: [preface, afterword]
moved:
  old-page: { to: ghost }
`);
    const route = assembleRoute(parseRouteYaml(START_ONLY), entries);
    expect(() => buildMovedPages(ghost, route, () => undefined)).toThrow(/moved\.old-page 的 to（ghost）不是路线图里的页面/);
  });
});

describe('buildMovedPages：按分叉点选择分流和旧参考页路径（FR-25、实施计划 §3.1）', () => {
  const spec = parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items:
      - preface
      - { choose: phone, page: choose-phone }
      - { branch: phone, options: { iphone: [iphone-gmail], android: [android-gmail] } }
      - afterword
moved:
  old-register:
    choice:
      fork: phone
      options:
        iphone: { to: iphone-gmail, section: 第一步 }
        android: { to: android-gmail }
      fallback: { to: afterword }
  faq/old-question: { to: afterword }
`);
  const entries = [
    entry('preface'),
    entry('choose-phone', { options: { iphone: { title: 'iPhone / iPad' }, android: { title: '安卓' } } }),
    entry('iphone-gmail'),
    entry('android-gmail'),
    entry('afterword'),
  ];
  const route = assembleRoute(spec, entries);
  const headings = new Map([['iphone-gmail', [{ slug: '第一步', text: '第一步', depth: 2 }]]]);

  it('每个选项和兜底去向都算好目标页和锚点，旧参考页路径也生成一条', () => {
    expect(buildMovedPages(spec, route, (id) => headings.get(id))).toEqual([
      {
        from: 'old-register',
        to: 'afterword',
        toTitle: '标题 afterword',
        choice: {
          fork: 'phone',
          options: {
            iphone: { to: 'iphone-gmail', toTitle: '标题 iphone-gmail', section: '第一步', anchor: '第一步' },
            android: { to: 'android-gmail', toTitle: '标题 android-gmail' },
          },
        },
      },
      { from: 'faq/old-question', to: 'afterword', toTitle: '标题 afterword' },
    ]);
  });

  it('选项的去向找不到小节时报出具体选项', () => {
    expect(() => buildMovedPages(spec, route, () => undefined)).toThrow(
      /route\.yaml：moved\.old-register\.choice\.options\.iphone\.section 写的“第一步”在 iphone-gmail/,
    );
  });

  it('旧参考页路径和现有的参考页同址时失败', () => {
    expect(() => buildMovedPages(spec, route, (id) => headings.get(id), new Set(['faq/old-question']))).toThrow(
      /moved\.faq\/old-question 和现有的页面同址/,
    );
  });

  it('选择页末尾的选项卡片用“下一步”当锚点，其他页没有这个锚点', () => {
    const chapters = `
chapters:
  - id: start
    title: 开始
    items:
      - preface
      - { choose: phone, page: choose-phone }
      - { branch: phone, options: { iphone: [iphone-gmail], android: [android-gmail] } }
      - afterword
`;
    const chooseSpec = parseRouteYaml(`${chapters}
moved:
  old-choose: { to: choose-phone, section: 下一步 }
`);
    const otherSpec = parseRouteYaml(`${chapters}
moved:
  old-other: { to: afterword, section: 下一步 }
`);

    expect(buildMovedPages(chooseSpec, assembleRoute(chooseSpec, entries), () => undefined)).toContainEqual({
      from: 'old-choose',
      to: 'choose-phone',
      toTitle: '标题 choose-phone',
      section: '下一步',
      anchor: '下一步',
    });
    expect(() => buildMovedPages(otherSpec, assembleRoute(otherSpec, entries), () => undefined)).toThrow(
      /moved\.old-other\.section 写的“下一步”在 afterword/,
    );
  });
});

// ================================================================ 真实路线图（Issue #25 的 M2 边界用例）

const principleDir = fileURLToPath(new URL('../content/principle/', import.meta.url));

/** 按构建时同样的规则读真实的原理版文件 */
function realEntries(): PrincipleEntry[] {
  return readdirSync(principleDir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const { frontmatter, content } = parseFrontmatter(readFileSync(principleDir + name, 'utf8'));
      return { id: basename(name, '.md'), body: content, data: principleSchema.parse(frontmatter) };
    });
}

describe('真实 route.yaml', () => {
  const spec = parseRouteYaml(routeText);
  const route: RouteMap = assembleRoute(spec, realEntries());
  const id = (stop: Stop | null) => (stop === null ? null : stop.kind === 'home' ? 'home' : stop.id);
  const nav = (at: string, mode: ViewMode = 'operation', stored = {}) => {
    const v = route.view(at, stored, mode);
    return { prev: id(v.prev), next: id(v.next), skipTo: id(v.skipTo), returnTo: id(v.returnTo) };
  };
  /** 实施计划 §3.1 的 11 页，按目录顺序 */
  const PAGES = [
    'preface',
    'overview',
    'plan1',
    'plan2-residential-server',
    'client-desktop',
    'iphone-prepare',
    'iphone-subscription',
    'android-prepare',
    'android-subscription',
    'maintenance',
    'afterword',
  ];

  it('首页的“开始”进入前言', () => {
    expect(startOf(route)).toEqual({ kind: 'step', id: 'preface', title: '前言' });
  });

  it('11 页、5 章、2 个分叉点；站内搜索的页面顺序从前言开始，覆盖路线里的每一页且不重复', () => {
    expect(route.data.chapters.map((chapter) => chapter.id)).toEqual(['start', 'node-and-ip', 'client-and-subscribe', 'maintenance', 'ending']);
    expect(Object.keys(route.data.forks).sort()).toEqual(['node-plan', 'phone']);
    const ids = searchPageIds(route);
    expect(ids[0]).toBe('preface');
    expect(ids).toEqual(PAGES);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(route.data.pages).sort());
  });

  it('首页五章都有简介（FR-18、V05）', () => {
    for (const chapter of route.data.chapters) expect(chapter.summary).toBeTruthy();
  });

  it('无痕打开（没有本机选择）：节点方案默认方案二，方案页 → 下一步方案二；手机系统没有默认，电脑端 → 没有下一步（AC-09）', () => {
    expect(nav('overview').next).toBe('plan2-residential-server');
    expect(nav('plan2-residential-server').next).toBe('client-desktop');
    expect(nav('client-desktop').next).toBeNull();
    // 手机系统没选时，分叉段之后的页面指回选择页（FR-13）
    expect(nav('maintenance').prev).toBe('client-desktop');
  });

  it('选项里的页面按所属选项计算：方案一 → 下一步电脑端；iPhone 第一页 → 上一步电脑端、下一步订阅（AC-08、FR-17）', () => {
    expect(nav('plan1', 'principle', { 'node-plan': 'plan-1' })).toMatchObject({ prev: 'overview', next: 'client-desktop' });
    expect(nav('iphone-prepare')).toMatchObject({ prev: 'client-desktop', next: 'iphone-subscription' });
    expect(nav('iphone-subscription')).toMatchObject({ prev: 'iphone-prepare', next: 'maintenance' });
    expect(nav('android-prepare')).toMatchObject({ prev: 'client-desktop', next: 'android-subscription' });
  });

  it('前言的上一步是首页；最后一章的后记下一步回首页', () => {
    expect(nav('preface').prev).toBe('home');
    expect(nav('afterword').next).toBe('home');
    expect(nav('afterword').prev).toBe('maintenance');
  });

  it('v3 没有可跳过页面（“打开面板”并进了方案一的 h2，FR-05 的整页跳过不再适用）', () => {
    for (const [pageId, page] of Object.entries(route.data.pages)) expect(page.skippable, pageId).toBe(false);
    expect(nav('plan1', 'principle', { 'node-plan': 'plan-1' }).skipTo).toBeNull();
  });

  it('4 条序列（方案一/二 × iPhone/安卓）都从前言走到后记，没有环；两种视图口径相同（AC-02 逻辑层）', () => {
    for (const mode of ['operation', 'principle'] as const) {
      for (const plan of ['plan-1', 'plan-2']) {
        for (const phone of ['iphone', 'android']) {
          const seen: string[] = [];
          for (let at: string | null = 'preface'; at !== null; ) {
            seen.push(at);
            const next: Stop | null = route.view(at, { 'node-plan': plan, phone }, mode).next;
            at = next === null || next.kind === 'home' ? null : next.id;
            if (seen.length > 30) throw new Error('走不完');
          }
          expect(seen[0]).toBe('preface');
          expect(seen.at(-1)).toBe('afterword');
          expect(new Set(seen).size).toBe(seen.length);
          const nodePage = plan === 'plan-1' ? 'plan1' : 'plan2-residential-server';
          const phonePages = phone === 'iphone' ? ['iphone-prepare', 'iphone-subscription'] : ['android-prepare', 'android-subscription'];
          expect(seen).toEqual(['preface', 'overview', nodePage, 'client-desktop', ...phonePages, 'maintenance', 'afterword']);
        }
      }
    }
  });

  it('章节不再带标题卡的一句话 intro', () => {
    for (const chapter of route.data.chapters) expect(chapter).not.toHaveProperty('intro');
  });

  it('faq、ip-tests 是保留字，没有页面占用', () => {
    expect(Object.keys(route.data.pages)).not.toContain('faq');
    expect(Object.keys(route.data.pages)).not.toContain('ip-tests');
  });

  it('跳转表把 2026-10-19 删掉的 plan1-free-isp 迁过来，目标是整体思路的“方案一和方案二”小节（FR-25、ADR-0006）', () => {
    // 用 toContainEqual：V11 会加合并页的条目，这里只要求这条在
    expect(movedEntries(spec)).toContainEqual({ from: 'plan1-free-isp', to: 'overview', section: '方案一和方案二' });
    expect(Object.keys(route.data.pages)).not.toContain('plan1-free-isp');
  });
});
