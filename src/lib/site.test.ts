import { readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { describe, expect, it } from 'vitest';
import routeText from '../content/route.yaml?raw';
import { principleSchema } from './content/schemas';
import { RouteValidationError, type RouteMap, type Stop, type ViewMode } from './route/route-map';
import { assembleRoute, pageTitle, parseRouteYaml, startOf, type PrincipleEntry } from './site';

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
    const options = { 'plan-2': { title: '方案二', heading: '二' }, 'plan-1': { title: '方案一', heading: '一' } };
    const route = assembleRoute(spec, [entry('preface'), entry('choose-plan', { options }), entry('a'), entry('b'), entry('afterword')]);
    expect(route.data.forks['node-plan']).toEqual({
      page: 'choose-plan',
      options: [
        { id: 'plan-2', title: '方案二' },
        { id: 'plan-1', title: '方案一' },
      ],
    });
  });

  it('章节的 intro 在这一章第一页的原理版正文里原样出现时带进 RouteData', () => {
    const spec = parseRouteYaml(START_ONLY.replace('title: 开始', 'title: 开始\n    intro: 正文'));
    const route = assembleRoute(spec, [entry('preface'), entry('afterword')]);
    expect(route.data.chapters[0]!.intro).toBe('正文');
  });

  it('intro 不在这一章第一页的原理版正文里时报出 route.yaml（守住 ADR-0005）', () => {
    const spec = parseRouteYaml(START_ONLY.replace('title: 开始', 'title: 开始\n    intro: 另写的一句'));
    const run = () => assembleRoute(spec, [entry('preface'), entry('afterword')]);
    expect(run).toThrow(RouteValidationError);
    expect(run).toThrow(/route\.yaml：章节 start 的 intro“另写的一句”没有原样出现在这一章第一页 principle\/preface\.md 的正文里/);
  });

  it('intro 只在别的页面里出现也算错：只认这一章第一页', () => {
    const spec = parseRouteYaml(START_ONLY.replace('title: 开始', 'title: 开始\n    intro: 后记的话'));
    const afterword = { ...entry('afterword'), body: '# 后记\n\n后记的话' };
    expect(() => assembleRoute(spec, [entry('preface'), afterword])).toThrow(/章节 start 的 intro/);
  });

  it('第一项是分支段的章节不能写 intro', () => {
    const spec = parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items:
      - preface
      - { choose: node-plan, page: choose-plan }
  - id: node
    title: 方案
    intro: 正文
    items:
      - branch: node-plan
        options: { plan-1: [a] }
      - afterword
`);
    const options = { 'plan-1': { title: '方案一', heading: '一' } };
    const run = () => assembleRoute(spec, [entry('preface'), entry('choose-plan', { options }), entry('a'), entry('afterword')]);
    expect(run).toThrow(/route\.yaml：章节 node 的第一项是分支段/);
  });

  it('路线图有错时抛出 RouteValidationError，列出出错的文件', () => {
    const run = () => assembleRoute(parseRouteYaml(START_ONLY), [entry('preface'), entry('afterword'), entry('orphan')]);
    expect(run).toThrow(RouteValidationError);
    expect(run).toThrow(/principle\/orphan\.md/);
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
  const route: RouteMap = assembleRoute(parseRouteYaml(routeText), realEntries());
  const id = (stop: Stop | null) => (stop === null ? null : stop.kind === 'home' ? 'home' : stop.id);
  const nav = (at: string, mode: ViewMode = 'operation', stored = {}) => {
    const v = route.view(at, stored, mode);
    return { prev: id(v.prev), next: id(v.next), skipTo: id(v.skipTo), returnTo: id(v.returnTo) };
  };

  it('首页的“开始”进入前言', () => {
    expect(startOf(route)).toEqual({ kind: 'step', id: 'preface', title: '前言' });
  });

  it('无痕打开（没有本机选择）：导入代理软件 → 上一步选择方案；注册 Gmail → 上一步选择手机系统；订阅 → 下一步选择手机系统（AC-09）', () => {
    expect(nav('import-proxy').prev).toBe('choose-plan');
    expect(nav('register-gmail').prev).toBe('choose-phone');
    expect(nav('subscribe').next).toBe('choose-phone');
  });

  it('选择方案未选时没有下一步', () => {
    expect(nav('choose-plan').next).toBeNull();
  });

  it('iPhone：下载 Gmail → 上一步 iPhone：导入代理软件，下一步注册 Gmail（AC-08）', () => {
    expect(nav('iphone-gmail')).toMatchObject({ prev: 'iphone-proxy', next: 'register-gmail' });
  });

  it('测 IP 质量的下一步：操作视图是防泄漏，原理视图是小结', () => {
    expect(nav('check-ip', 'operation').next).toBe('leak-protection');
    expect(nav('check-ip', 'principle').next).toBe('recap');
  });

  it('操作视图直接打开整体思路：按原理序列计算', () => {
    expect(nav('overview', 'operation')).toMatchObject({ prev: 'disclaimer', next: 'clean-up' });
  });

  it('被封了：申诉解封 → 回到先用两天，下一步修改 Google 账号地区（FR-19）', () => {
    expect(nav('google-appeal')).toEqual({ prev: null, next: 'google-region', skipTo: null, returnTo: 'use-two-days' });
  });

  it('前言的上一步是首页；后记的下一步是附录，附录的下一步是首页（按钮写“回到首页”，v2.2 D11）', () => {
    expect(nav('preface').prev).toBe('home');
    expect(nav('afterword').next).toBe('appendix');
    expect(nav('appendix')).toMatchObject({ prev: 'afterword', next: 'home' });
  });

  it('四、打开面板可跳过，跳到导入代理软件；三、把服务器变成节点不可跳过（AC-05）', () => {
    expect(nav('plan1-panel', 'operation', { 'node-plan': 'plan-1' }).skipTo).toBe('import-proxy');
    expect(nav('plan1-make-node', 'operation', { 'node-plan': 'plan-1' })).toMatchObject({ next: 'plan1-panel', skipTo: null });
  });

  it('12 条序列都从前言经后记走到附录、没有环；操作视图不经过三个原理独有步骤，原理视图经过（AC-02 逻辑层）', () => {
    const principleOnly = ['overview', 'recap', 'iphone-why-us-apple-id'];
    for (const mode of ['operation', 'principle'] as const) {
      for (const plan of ['plan-1', 'plan-2', 'plan-3']) {
        for (const phone of ['iphone', 'android']) {
          const seen: string[] = [];
          for (let at: string | null = 'preface'; at !== null; ) {
            seen.push(at);
            const next: Stop | null = route.view(at, { 'node-plan': plan, phone }, mode).next;
            at = next === null || next.kind === 'home' ? null : next.id;
            if (seen.length > 60) throw new Error('走不完');
          }
          expect(seen.slice(-2)).toEqual(['afterword', 'appendix']);
          expect(new Set(seen).size).toBe(seen.length);
          const visited = principleOnly.filter((p) => seen.includes(p));
          expect(visited).toEqual(mode === 'operation' ? [] : phone === 'iphone' ? principleOnly : ['overview', 'recap']);
        }
      }
    }
  });

  it('五章都有标题卡的一句话（作者 2026-10-16 确认，实施计划 v2.1 §6；附录 2026-10-17 加入）', () => {
    expect(route.data.chapters.map((c) => c.intro)).toEqual([
      '每一步我都会努力去讲清楚为什么要这么做，这样就算哪天某个细节失效了，你也知道该往哪个方向去调，请多包涵。',
      '三个方案的目的都一样：让 claude 看到一个静态住宅 IP，而且只有你自己在用。',
      '所以手机也是 claude 会看到的一台设备。',
      '也感谢所有我没能记住名字、但确实帮到我的人。',
      '卡住了再来查，不看也能照着正文做完。',
    ]);
  });

  it('faq、ip-tests 是保留字，没有页面占用', () => {
    expect(Object.keys(route.data.pages)).not.toContain('faq');
    expect(Object.keys(route.data.pages)).not.toContain('ip-tests');
  });
});
