import { describe, expect, it } from 'vitest';
import { samplePages, sampleSpec } from './fixtures/sample-route';
import {
  buildRouteMap,
  pathOf,
  RESERVED_PAGE_IDS,
  REMOVED_PAGES,
  RouteValidationError,
  routeMapFromData,
  type Choices,
  type OutlineBranch,
  type OutlineStep,
  type PageMeta,
  type RouteError,
  type RouteMap,
  type RouteSpec,
  type Stop,
  type ViewMode,
} from './route-map';

const sample = (): RouteMap => buildRouteMap(sampleSpec(), samplePages());
/** Stop 的简写：页面写标识，首页写 home。 */
const short = (stop: Stop | null): string | null => (stop === null ? null : stop.kind === 'home' ? 'home' : stop.id);

/** 沿“下一步”从第一项走到首页，返回经过的每一项；遇到没有下一步的页面时停在那里。 */
function walk(map: RouteMap, stored: Choices, mode: ViewMode): string[] {
  const seen: string[] = [];
  let at: string | null = 'preface';
  while (at) {
    const v = map.view(at, stored, mode);
    seen.push(at);
    at = v.next === null || v.next.kind === 'home' ? null : v.next.id;
    if (seen.length > 100) throw new Error('走不完');
  }
  return seen;
}

/** 期望 build 失败，返回全部错误。 */
function errorsOf(spec: unknown, pages: PageMeta[] = samplePages()): RouteError[] {
  try {
    buildRouteMap(spec, pages);
  } catch (e) {
    expect(e).toBeInstanceOf(RouteValidationError);
    return (e as RouteValidationError).errors;
  }
  throw new Error('期望校验失败，但构建成功了');
}

function expectError(errors: RouteError[], file: string, pattern: RegExp): void {
  expect(errors, JSON.stringify(errors, null, 2)).toContainEqual({ file, message: expect.stringMatching(pattern) });
}

function chapter(spec: RouteSpec, id: string) {
  return spec.chapters.find((c) => c.id === id)!;
}

function page(pages: PageMeta[], id: string): PageMeta {
  return pages.find((p) => p.id === id)!;
}

// ================================================================ 导航

describe('没有默认路线：未选的分叉点指向选择页（FR-12、FR-13、AC-09 逻辑层）', () => {
  const map = sample();

  it('汇合点的上一步、分支前一页的下一步都是选择页', () => {
    expect(short(map.view('import-proxy', {}, 'operation').prev)).toBe('choose-plan');
    expect(short(map.view('clean-up', {}, 'operation').next)).toBe('choose-plan');
    expect(short(map.view('register-gmail', {}, 'operation').prev)).toBe('choose-phone');
  });

  it('同一分叉点没有选择页的第二段也折叠成选择页：订阅的下一步、订阅之后的上一步都是“选择手机系统”', () => {
    expect(map.view('subscribe', {}, 'operation').next).toEqual({ kind: 'choose', id: 'choose-phone', title: '选择手机系统' });
    expect(short(map.view('after-subscribe', {}, 'operation').prev)).toBe('choose-phone');
  });

  it('选择页未选时没有下一步，已选时是所选选项在当前视图下的第一页', () => {
    expect(map.view('choose-plan', {}, 'operation').next).toBeNull();
    expect(short(map.view('choose-plan', { 'node-plan': 'plan-3' }, 'operation').next)).toBe('plan3-node');
    expect(short(map.view('choose-phone', { phone: 'android' }, 'principle').next)).toBe('android-proxy');
  });

  it('未选时从前言只能走到第一个选择页', () => {
    expect(walk(map, {}, 'operation')).toEqual(['preface', 'clean-up', 'choose-plan']);
  });

  it('生效的选择不含没选的分叉点', () => {
    expect(map.view('preface', {}, 'operation').choices).toEqual({});
    expect(map.view('timezone', { phone: 'android' }, 'operation').choices).toEqual({ phone: 'android' });
  });
});

describe('分支与汇合（AC-03 逻辑层）', () => {
  const map = sample();

  it('选方案三：方案三的下一步是汇合点，汇合点的上一步回到方案三', () => {
    const stored = { 'node-plan': 'plan-3' };
    expect(short(map.view('plan3-node', stored, 'operation').next)).toBe('import-proxy');
    expect(short(map.view('import-proxy', stored, 'operation').prev)).toBe('plan3-node');
  });

  it('打开只属于一个分支的页面时按它所属的选项计算（FR-17、AC-08 逻辑层）', () => {
    const v = map.view('iphone-gmail', {}, 'operation');
    expect(v.choices).toEqual({ phone: 'iphone' });
    expect(short(v.prev)).toBe('iphone-proxy');
    expect(short(v.next)).toBe('register-gmail');
    // 本机选了安卓也一样：当前页所属选项优先
    expect(map.view('iphone-gmail', { phone: 'android' }, 'operation').choices).toEqual({ phone: 'iphone' });
  });

  it('分叉点的第二段沿用同一个选择', () => {
    expect(short(map.view('subscribe', { phone: 'android' }, 'operation').next)).toBe('android-subscribe');
    expect(short(map.view('after-subscribe', { phone: 'android' }, 'operation').prev)).toBe('android-subscribe');
  });

  it('stored 里不存在的分叉点或选项被忽略', () => {
    expect(map.view('import-proxy', { 'node-plan': 'plan-9', nope: 'x' }, 'operation').choices).toEqual({});
  });

  it('stored 形状不对（null、数组、原型链上的键）时当作没选，不抛错', () => {
    for (const stored of [null, [], Object.create({ 'node-plan': 'plan-3' })]) {
      expect(short(map.view('import-proxy', stored as Choices, 'operation').prev)).toBe('choose-plan');
    }
  });

  it('不在路线图里的页面抛错，原型链上的名字也一样', () => {
    expect(() => map.view('nope', {}, 'operation')).toThrow(/nope/);
    expect(() => map.view('__proto__', {}, 'operation')).toThrow();
    expect(() => map.view('constructor', {}, 'operation')).toThrow();
  });
});

describe('首页是首尾，后记之后是附录（FR-11）', () => {
  it('前言的上一步是首页；后记的下一步是附录，附录（路线最后一页）的下一步是首页（v2.2 D11、FR-11）', () => {
    const map = sample();
    expect(map.view('preface', {}, 'operation').prev).toEqual({ kind: 'home' });
    expect(map.view('afterword', {}, 'principle').next).toEqual({ kind: 'step', id: 'appendix', title: '附录' });
    expect(map.view('appendix', {}, 'operation').prev).toEqual({ kind: 'step', id: 'afterword', title: '后记' });
    expect(map.view('appendix', {}, 'principle').next).toEqual({ kind: 'home' });
  });
});

describe('两种视图（FR-11、FR-30、AC-02 逻辑层）', () => {
  const map = sample();
  const full = { 'node-plan': 'plan-1', phone: 'iphone' };

  it('操作视图绕过原理独有步骤，原理视图经过', () => {
    expect(short(map.view('check-ip', full, 'operation').next)).toBe('timezone');
    expect(short(map.view('check-ip', full, 'principle').next)).toBe('recap');
    expect(short(map.view('preface', full, 'operation').next)).toBe('clean-up');
    expect(short(map.view('preface', full, 'principle').next)).toBe('overview');
    expect(short(map.view('subscribe', full, 'operation').next)).toBe('iphone-apple-id');
    expect(short(map.view('subscribe', full, 'principle').next)).toBe('iphone-why');
  });

  it('操作视图直接打开原理独有步骤：按原理视图的序列计算它自己的导航，进度只有章节', () => {
    const v = map.view('overview', {}, 'operation');
    expect(short(v.prev)).toBe('preface');
    expect(short(v.next)).toBe('clean-up');
    expect(v.progress).toEqual({ chapterId: 'start', chapter: '开始', chapterNo: 0 });
    expect(short(map.view('iphone-why', {}, 'operation').prev)).toBe('subscribe');
  });

  it('两种视图下全程的页面顺序', () => {
    expect(walk(map, full, 'operation')).toEqual([
      'preface', 'clean-up',
      'choose-plan', 'plan1-buy-server', 'make-node', 'plan1-panel', 'import-proxy', 'check-ip', 'timezone',
      'choose-phone', 'iphone-proxy', 'iphone-gmail', 'register-gmail', 'use-two-days', 'google-region', 'subscribe',
      'iphone-apple-id', 'iphone-subscribe', 'after-subscribe',
      'thanks', 'afterword', 'appendix',
    ]);
    expect(walk(map, { 'node-plan': 'plan-3', phone: 'android' }, 'principle')).toEqual([
      'preface', 'overview', 'clean-up',
      'choose-plan', 'plan3-node', 'import-proxy', 'check-ip', 'recap', 'timezone',
      'choose-phone', 'android-proxy', 'android-gmail', 'register-gmail', 'use-two-days', 'google-region', 'subscribe',
      'android-subscribe', 'after-subscribe',
      'thanks', 'afterword', 'appendix',
    ]);
  });
});

describe('旁支页（FR-19、AC-19 逻辑层）', () => {
  const map = sample();

  it('没有上一步，“回到”挂靠的页面，“下一步”是那一页的下一步', () => {
    const v = map.view('google-appeal', {}, 'operation');
    expect(v.current).toEqual({ kind: 'side', id: 'google-appeal', title: '被封了：申诉解封' });
    expect(v.prev).toBeNull();
    expect(v.returnTo).toEqual({ kind: 'step', id: 'use-two-days', title: '先用两天' });
    expect(short(v.next)).toBe('google-region');
    expect(v.skipTo).toBeNull();
    expect(v.progress).toEqual({ chapterId: 'register-and-subscribe', chapter: '注册和订阅', chapterNo: 2 });
  });

  it('沿“先用两天”的下一步走不经过旁支页；目录里没有旁支页，也没有当前项', () => {
    expect(short(map.view('use-two-days', {}, 'operation').next)).toBe('google-region');
    const outline = map.view('google-appeal', {}, 'operation').outline;
    const all = JSON.stringify(outline);
    expect(all).not.toContain('google-appeal');
    expect(all).not.toContain('"current":true');
  });

  it('普通页没有 returnTo', () => {
    expect(map.view('use-two-days', {}, 'operation').returnTo).toBeNull();
  });
});

describe('共享步骤（AC-19 逻辑层）', () => {
  const map = sample();

  it('本机没选：取它所属的第一个选项', () => {
    const v = map.view('make-node', {}, 'operation');
    expect(v.choices).toEqual({ 'node-plan': 'plan-1' });
    expect(short(v.prev)).toBe('plan1-buy-server');
  });

  it('本机选了其中一个就沿用，选了不包含它的选项时取第一个', () => {
    expect(short(map.view('make-node', { 'node-plan': 'plan-2' }, 'operation').prev)).toBe('plan2-server');
    expect(short(map.view('make-node', { 'node-plan': 'plan-2' }, 'operation').next)).toBe('import-proxy');
    expect(map.view('make-node', { 'node-plan': 'plan-3' }, 'operation').choices).toEqual({ 'node-plan': 'plan-1' });
  });

  it('目录里共享步骤在每个选项下各列一份，只有生效选项下的标当前项', () => {
    const branch = map.view('make-node', { 'node-plan': 'plan-2' }, 'operation').outline[1]!.items[1] as OutlineBranch;
    const flags = branch.options.map((o) => o.steps.filter((s) => s.id === 'make-node').map((s) => [o.id, s.current, s.onRoute]));
    expect(flags.flat()).toEqual([
      ['plan-1', false, false],
      ['plan-2', true, true],
    ]);
  });
});

describe('可跳过步骤 skipTo（FR-15、AC-05 逻辑层）', () => {
  const map = sample();

  it('不可跳过的步骤没有 skipTo', () => {
    expect(map.view('plan1-buy-server', {}, 'operation').skipTo).toBeNull();
  });

  it('分支末尾的可跳过步骤跳到汇合点', () => {
    expect(short(map.view('plan1-panel', {}, 'operation').skipTo)).toBe('import-proxy');
  });

  it('连续的可跳过步骤一起跳过，可以跨越分支末尾', () => {
    expect(short(map.view('android-gmail', {}, 'operation').skipTo)).toBe('use-two-days');
    expect(short(map.view('register-gmail', {}, 'operation').skipTo)).toBe('use-two-days');
  });

  it('可以跨章节：章末的可跳过步骤跳到下一章的第一项', () => {
    expect(short(map.view('clean-up', {}, 'operation').skipTo)).toBe('choose-plan');
  });

  it('后面接着没选的分支段时跳到它的选择页', () => {
    expect(short(map.view('google-region', {}, 'operation').skipTo)).toBe('subscribe');
    const spec = sampleSpec();
    chapter(spec, 'register-and-subscribe').items.splice(5, 1); // 去掉“订阅”，google-region 后面紧跟第二段
    const pages = samplePages().filter((p) => p.id !== 'subscribe');
    expect(short(buildRouteMap(spec, pages).view('google-region', {}, 'operation').skipTo)).toBe('choose-phone');
  });

  it('skipLabel 原样进入 RouteData', () => {
    expect(map.data.pages['clean-up']).toEqual({ title: '清理旧账号和配置', principleOnly: false, skippable: true, skipLabel: '没用过，跳过' });
  });
});

describe('进度（FR-10）', () => {
  const map = sample();

  it('按当前路线和视图在本章内计数，选择页不计入；章节号从 0 开始', () => {
    const full = { 'node-plan': 'plan-1', phone: 'iphone' };
    expect(map.view('import-proxy', full, 'operation').progress).toEqual({
      chapterId: 'node-and-ip',
      chapter: '准备节点和住宅 IP',
      chapterNo: 1,
      index: 4,
      total: 6,
    });
    expect(map.view('timezone', full, 'principle').progress).toMatchObject({ index: 7, total: 7 });
    expect(map.view('preface', {}, 'operation').progress).toMatchObject({ chapterNo: 0, index: 1, total: 2 });
    expect(map.view('preface', {}, 'principle').progress).toMatchObject({ index: 1, total: 3 });
  });

  it('本章有没选的分支段时数不清，只有章节', () => {
    expect(map.view('import-proxy', {}, 'operation').progress).toEqual({ chapterId: 'node-and-ip', chapter: '准备节点和住宅 IP', chapterNo: 1 });
    // 打开分支页面时按它所属的选项算，数得清
    expect(map.view('iphone-gmail', {}, 'operation').progress).toMatchObject({ index: 2, total: 9 });
  });

  it('选择页只有章节', () => {
    expect(map.view('choose-plan', { 'node-plan': 'plan-1' }, 'operation').progress).toEqual({
      chapterId: 'node-and-ip',
      chapter: '准备节点和住宅 IP',
      chapterNo: 1,
    });
  });
});

describe('目录 outline（FR-14、FR-16）', () => {
  const map = sample();

  it('列出全部章节；选择页、“或”分组、原理独有标记；当前项只有一处', () => {
    const outline = map.view('choose-plan', {}, 'operation').outline;
    expect(outline.map((c) => c.id)).toEqual(['start', 'node-and-ip', 'register-and-subscribe', 'ending', 'appendix']);
    expect(outline[1]!.items[0]).toEqual({ kind: 'choose', fork: 'node-plan', id: 'choose-plan', title: '选择方案', current: true });
    expect(outline[0]!.items[1]).toMatchObject({ kind: 'step', id: 'overview', principleOnly: true, onRoute: false });
    expect(JSON.stringify(outline).match(/"current":true/g)).toHaveLength(1);
  });

  it('没选的分叉点各选项都算在路线上；选了以后其他选项不在路线上', () => {
    const none = map.outline({}, null, 'principle')[1]!.items[1] as OutlineBranch;
    expect(none.options.map((o) => [o.selected, o.steps.every((s) => s.onRoute)])).toEqual([
      [false, true],
      [false, true],
      [false, true],
    ]);
    const chosen = map.outline({ 'node-plan': 'plan-3' }, null, 'principle')[1]!.items[1] as OutlineBranch;
    expect(chosen.options.map((o) => [o.id, o.selected, o.steps.every((s) => s.onRoute)])).toEqual([
      ['plan-1', false, false],
      ['plan-2', false, false],
      ['plan-3', true, true],
    ]);
  });

  it('原理视图下原理独有步骤在路线上', () => {
    const step = map.outline({}, null, 'principle')[0]!.items[1] as OutlineStep;
    expect(step).toMatchObject({ id: 'overview', onRoute: true, current: false });
  });

  it('outline() 只按本机选择：改选后当前页可以落在其他路线上', () => {
    const branch = map.outline({ phone: 'android' }, 'iphone-gmail', 'operation')[2]!.items[1] as OutlineBranch;
    const iphone = branch.options.find((o) => o.id === 'iphone')!;
    expect(iphone.steps.find((s) => s.id === 'iphone-gmail')).toMatchObject({ current: true, onRoute: false });
  });
});

describe('RouteData 与 routeMapFromData', () => {
  it('RouteData 可序列化，含页面标题、分叉点的选择页和旁支页', () => {
    const { data } = sample();
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
    expect(data.forks['phone']).toEqual({ page: 'choose-phone', options: [{ id: 'iphone', title: 'iPhone' }, { id: 'android', title: '安卓' }] });
    expect(data.side).toEqual({ 'google-appeal': 'use-two-days' });
    expect(data.pages['recap']).toEqual({ title: '小结', principleOnly: true, skippable: false });
  });

  it('浏览器用 JSON 重建的 RouteMap 与构建时结果一致', () => {
    const map = sample();
    const rebuilt = routeMapFromData(JSON.parse(JSON.stringify(map.data)));
    for (const id of ['preface', 'choose-plan', 'make-node', 'google-appeal', 'overview']) {
      for (const mode of ['operation', 'principle'] as const) {
        expect(rebuilt.view(id, { phone: 'android' }, mode)).toEqual(map.view(id, { phone: 'android' }, mode));
      }
    }
  });
});

describe('章节的一句话 intro（design §4.1、架构 §11.4 W-3）', () => {
  it('写了 intro 的章节在 RouteData 里带上它，没写的没有这个字段', () => {
    const spec = sampleSpec();
    chapter(spec, 'start').intro = '这一章的一句话。';
    const { data } = buildRouteMap(spec, samplePages());
    expect(data.chapters.find((c) => c.id === 'start')!.intro).toBe('这一章的一句话。');
    expect(data.chapters.find((c) => c.id === 'ending')!).not.toHaveProperty('intro');
  });

  it('intro 不是非空字符串时报出 route.yaml', () => {
    for (const intro of ['', '  ', 42]) {
      const spec = sampleSpec();
      (chapter(spec, 'start') as { intro?: unknown }).intro = intro;
      expectError(errorsOf(spec), 'route.yaml', /第 1 个章节的 intro 必须是非空的一段文字/);
    }
  });
});

describe('pathOf', () => {
  it('页面都是 /<id>/，首页是 /（ADR-0002）', () => {
    expect(pathOf({ kind: 'step', id: 'preface', title: '前言' })).toBe('/preface/');
    expect(pathOf({ kind: 'choose', id: 'choose-plan', title: '选择方案' })).toBe('/choose-plan/');
    expect(pathOf({ kind: 'side', id: 'google-appeal', title: '申诉' })).toBe('/google-appeal/');
    expect(pathOf({ kind: 'home' })).toBe('/');
  });
});

describe('校验：夹具是合法的', () => {
  it('3 × 2 种选择 × 2 种视图共 12 条路线都从前言经后记走到附录，不重复经过同一页', () => {
    const map = sample();
    for (const mode of ['operation', 'principle'] as const) {
      for (const plan of ['plan-1', 'plan-2', 'plan-3']) {
        for (const phone of ['iphone', 'android']) {
          const seen = walk(map, { 'node-plan': plan, phone }, mode);
          expect(seen.slice(-2)).toEqual(['afterword', 'appendix']);
          expect(new Set(seen).size).toBe(seen.length);
        }
      }
    }
  });
});

// ================================================================ 校验错误

describe('校验错误（FR-61、AC-14 逻辑层）', () => {
  it('错误一次报全，并写进异常消息', () => {
    const spec = sampleSpec();
    chapter(spec, 'start').items.push('nope-1', 'nope-2');
    const errors = errorsOf(spec);
    expectError(errors, 'route.yaml', /nope-1 没有对应的文件 principle\/nope-1\.md/);
    expectError(errors, 'route.yaml', /nope-2/);
    expect(() => buildRouteMap(spec, samplePages())).toThrow(/路线图校验失败.*\n.*route\.yaml：/);
  });

  it('1.0.0 的写法（defaults、没有 page 的 choose）报错', () => {
    const errors = errorsOf({ ...sampleSpec(), defaults: { phone: 'iphone' } });
    expectError(errors, 'route.yaml', /未知字段 defaults/);
    const spec = sampleSpec();
    chapter(spec, 'node-and-ip').items[0] = { choose: 'node-plan' } as never;
    expectError(errorsOf(spec), 'route.yaml', /选择页写作 \{ choose: <分叉点>, page: <选择页标识> \}/);
  });

  it('一个标识空间：同一页面不能既是普通项又是选择页或旁支页', () => {
    const spec = sampleSpec();
    chapter(spec, 'ending').items.push('choose-plan', 'google-appeal');
    const errors = errorsOf(spec);
    expectError(errors, 'route.yaml', /页面 choose-plan 在路线图里出现了多次/);
    expectError(errors, 'route.yaml', /页面 google-appeal 在路线图里出现了多次/);
  });

  it('同一页面出现在两个不同的分支段里', () => {
    const spec = sampleSpec();
    (chapter(spec, 'register-and-subscribe').items[6] as { options: Record<string, string[]> }).options['android']!.push('android-proxy');
    expectError(errorsOf(spec), 'route.yaml', /页面 android-proxy 在路线图里出现了多次/);
  });

  it('同一选项里同一页面出现两次', () => {
    const spec = sampleSpec();
    (chapter(spec, 'node-and-ip').items[1] as { options: Record<string, string[]> }).options['plan-3']!.push('plan3-node');
    expectError(errorsOf(spec), 'route.yaml', /页面 plan3-node 在分叉点 node-plan 的选项 plan-3 里出现了多次/);
  });

  it('页面文件不在路线图里，报原理版文件', () => {
    const pages = [...samplePages(), { id: 'orphan', title: '孤儿', principleOnly: false, skippable: false }];
    expectError(errorsOf(sampleSpec(), pages), 'principle/orphan.md', /页面 orphan 不在路线图里/);
  });

  it('页面标识重复、用了保留字、不是 kebab-case', () => {
    const pages = samplePages();
    pages.push({ ...page(pages, 'preface') });
    for (const id of [...RESERVED_PAGE_IDS, 'Bad_Id']) pages.push({ id, title: id, principleOnly: false, skippable: false });
    const errors = errorsOf(sampleSpec(), pages);
    expectError(errors, 'principle/preface.md', /页面标识重复：preface/);
    expectError(errors, 'principle/faq.md', /保留路径/);
    expectError(errors, 'principle/ip-tests.md', /保留路径/);
    expectError(errors, 'principle/Bad_Id.md', /kebab-case/);
  });

  it('已删除页面的标识不能再用（旧地址是跳转页）', () => {
    const pages = samplePages();
    for (const id of Object.keys(REMOVED_PAGES)) pages.push({ id, title: id, principleOnly: false, skippable: false });
    const errors = errorsOf(sampleSpec(), pages);
    expectError(errors, 'principle/plan1-free-isp.md', /已删除的页面，旧地址跳到 choose-plan/);
  });

  it('选择页的文件要写 options；写了 options 的页面必须是选择页', () => {
    const pages = samplePages();
    delete page(pages, 'choose-plan').options;
    page(pages, 'subscribe').options = [{ id: 'a', title: '甲' }, { id: 'b', title: '乙' }];
    const errors = errorsOf(sampleSpec(), pages);
    expectError(errors, 'principle/choose-plan.md', /是分叉点 node-plan 的选择页，frontmatter 要写 options/);
    expectError(errors, 'principle/subscribe.md', /写了 options，但在路线图里不是选择页/);
  });

  it('branch 出现在 choose 之前，或分叉点没有选择页', () => {
    const spec = sampleSpec();
    const items = chapter(spec, 'node-and-ip').items;
    [items[0], items[1]] = [items[1]!, items[0]!];
    expectError(errorsOf(spec), 'route.yaml', /分叉点 node-plan 的分支段（章节 node-and-ip）出现在它的选择页/);
  });

  it('分支段的选项与选择页的 options 不一致（缺少、多出、顺序不同）', () => {
    const spec = sampleSpec();
    const options = (chapter(spec, 'node-and-ip').items[1] as { options: Record<string, string[]> }).options;
    delete options['plan-3'];
    options['plan-4'] = ['plan3-node'];
    expectError(errorsOf(spec), 'route.yaml', /选项与选择页的 options 不一致：缺少 plan-3，多出 plan-4/);

    const reordered = sampleSpec();
    const segment = chapter(reordered, 'register-and-subscribe').items[1] as { options: Record<string, string[]> };
    segment.options = { android: segment.options['android']!, iphone: segment.options['iphone']! };
    expectError(errorsOf(reordered), 'route.yaml', /选项顺序要与选择页的 options 一致：iphone、android/);
  });

  it('选项没有页面，或只有原理独有步骤', () => {
    const spec = sampleSpec();
    (chapter(spec, 'node-and-ip').items[1] as { options: Record<string, string[]> }).options['plan-3'] = [];
    expectError(errorsOf(spec, samplePages().filter((p) => p.id !== 'plan3-node')), 'route.yaml', /选项 plan-3（章节 node-and-ip）没有页面/);

    const pages = samplePages();
    page(pages, 'android-subscribe').principleOnly = true;
    expectError(errorsOf(sampleSpec(), pages), 'route.yaml', /选项 android（章节 register-and-subscribe）只有原理独有步骤/);
  });

  it('删掉分支的汇合：分支段是路线最后一项，或紧跟另一个分叉点的分支段', () => {
    const spec = sampleSpec();
    chapter(spec, 'register-and-subscribe').items.pop();
    spec.chapters.pop(); // 附录章
    spec.chapters.pop(); // 结尾章：分支段成了路线最后一项
    expectError(
      errorsOf(spec, samplePages().filter((p) => !['after-subscribe', 'thanks', 'afterword', 'appendix'].includes(p.id))),
      'route.yaml',
      /分叉点 phone 的分支段（章节 register-and-subscribe）之后没有汇合点/,
    );
  });

  it('汇合点可以是另一个分叉点的选择页，也可以在后面的章节', () => {
    const spec = sampleSpec();
    chapter(spec, 'node-and-ip').items.splice(2, 4); // 去掉 import-proxy、check-ip、recap、timezone
    const removed = ['import-proxy', 'check-ip', 'recap', 'timezone'];
    const map = buildRouteMap(spec, samplePages().filter((p) => !removed.includes(p.id)));
    expect(short(map.view('plan3-node', {}, 'operation').next)).toBe('choose-phone');
    expect(short(map.view('choose-phone', {}, 'operation').prev)).toBe('choose-plan');
  });

  it('路线的首尾必须是普通页面，且不能是原理独有步骤', () => {
    const pages = samplePages();
    page(pages, 'preface').principleOnly = true;
    page(pages, 'appendix').principleOnly = true;
    const errors = errorsOf(sampleSpec(), pages);
    expectError(errors, 'route.yaml', /路线的第一项 preface 不能是原理独有步骤/);
    expectError(errors, 'route.yaml', /路线的最后一项 appendix 不能是原理独有步骤/);
  });

  it('旁支页：returnTo 必须是普通页，页面要有文件', () => {
    const spec = sampleSpec();
    spec.side = { 'google-appeal': { returnTo: 'iphone-gmail' }, ghost: { returnTo: 'nope' } };
    const errors = errorsOf(spec);
    expectError(errors, 'route.yaml', /旁支页 google-appeal 的 returnTo（iphone-gmail）必须是路线图里的普通页/);
    expectError(errors, 'route.yaml', /页面 ghost 没有对应的文件 principle\/ghost\.md/);
    expectError(errors, 'route.yaml', /旁支页 ghost 的 returnTo（nope）/);
    expectError(errorsOf({ ...sampleSpec(), side: { 'google-appeal': 'use-two-days' } }), 'route.yaml', /side\.google-appeal 要写成 \{ returnTo: <页面> \}/);
  });

  it('选择页重复、没有分支段；章节标识重复', () => {
    const spec = sampleSpec();
    chapter(spec, 'ending').items.unshift({ choose: 'node-plan', page: 'thanks' });
    expectError(errorsOf(spec), 'route.yaml', /分叉点 node-plan 的选择页出现了多次/);

    const lonely = sampleSpec();
    chapter(lonely, 'register-and-subscribe').items.splice(1, 1);
    chapter(lonely, 'register-and-subscribe').items.splice(5, 1);
    chapter(lonely, 'register-and-subscribe').items = chapter(lonely, 'register-and-subscribe').items.filter(
      (item) => typeof item === 'string' || !('branch' in item),
    );
    const branchPages = ['iphone-proxy', 'iphone-gmail', 'android-proxy', 'android-gmail', 'iphone-why', 'iphone-apple-id', 'iphone-subscribe', 'android-subscribe', 'subscribe'];
    expectError(errorsOf(lonely, samplePages().filter((p) => !branchPages.includes(p.id))), 'route.yaml', /分叉点 phone 有选择页，但没有任何分支段/);

    const dup = sampleSpec();
    dup.chapters[3]!.id = 'start';
    expectError(errorsOf(dup), 'route.yaml', /章节标识重复：start/);
  });

  it('形状不对：不是对象、chapters 为空、未知字段、分叉点和选项不是 kebab-case', () => {
    expectError(errorsOf(null), 'route.yaml', /路线图必须是一个对象/);
    expectError(errorsOf({ chapters: [] }), 'route.yaml', /chapters 必须是非空列表/);
    const spec = sampleSpec();
    chapter(spec, 'node-and-ip').items[0] = { choose: 'Node_Plan', page: 'choose-plan' };
    (chapter(spec, 'register-and-subscribe').items[1] as { options: Record<string, string[]> }).options['Bad'] = ['x'];
    const errors = errorsOf(spec);
    expectError(errors, 'route.yaml', /分叉点标识 Node_Plan 必须是英文 kebab-case/);
    expectError(errors, 'route.yaml', /选项标识 Bad 必须是英文 kebab-case/);
  });
});
