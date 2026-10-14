import { describe, expect, it } from 'vitest';
import { sampleChoices, sampleSpec, sampleSteps } from './fixtures/sample-route';
import {
  buildRouteMap,
  pathOf,
  RESERVED_STEP_IDS,
  RouteValidationError,
  routeMapFromData,
  type At,
  type ChoiceMeta,
  type Choices,
  type RouteError,
  type RouteMap,
  type RouteSpec,
  type StepMeta,
  type Stop,
} from './route-map';

const sample = (): RouteMap => buildRouteMap(sampleSpec(), sampleSteps(), sampleChoices());
const step = (id: string): At => ({ kind: 'step', id });
const choose = (fork: string): At => ({ kind: 'choose', fork });
/** Stop 的简写：步骤写 id，选择页写 choose/<fork>，完成页写 done。 */
const short = (stop: Stop | null): string | null =>
  stop === null ? null : stop.kind === 'step' ? stop.id : stop.kind === 'choose' ? `choose/${stop.fork}` : 'done';

/** 沿“下一步”从第一项走到完成页，返回经过的每一项。 */
function walk(map: RouteMap, stored: Choices): string[] {
  const seen: string[] = [];
  let at: At | null = step('before-you-start');
  while (at) {
    const v = map.view(at, stored);
    seen.push(short(v.current)!);
    at = v.next.kind === 'done' ? null : v.next.kind === 'step' ? step(v.next.id) : choose(v.next.fork);
    if (seen.length > 100) throw new Error('走不完');
  }
  return seen;
}

/** 期望 build 失败，返回全部错误。 */
function errorsOf(spec: unknown, steps: StepMeta[] = sampleSteps(), choices: ChoiceMeta[] = sampleChoices()): RouteError[] {
  try {
    buildRouteMap(spec, steps, choices);
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

// ================================================================ 导航

describe('默认路线（AC-02 逻辑层）', () => {
  it('从“开始之前”沿下一步依次经过方案一、v2rayN、检查 IP 质量、iPhone，最后到完成页', () => {
    expect(walk(sample(), {})).toEqual([
      'before-you-start', 'overview', 'clean-claude-code',
      'choose/node-plan', 'plan1-buy-vps', 'plan1-free-residential-ip', 'ssh-connect', 'run-script',
      'choose/desktop-proxy', 'v2rayn-import', 'v2rayn-tun',
      'v2rayn-dns', 'webrtc', 'ipv6',
      'check-ip-quality', 'ip-failed',
      'choose/phone', 'iphone-app-store-region', 'iphone-v2box', 'iphone-timezone',
      'iphone-gmail', 'create-google-account',
      'use-google-few-days',
      'iphone-subscribe', 'purchase-failed',
      'after-subscribe', 'about-kyc',
    ]);
  });

  it('路线第一项的 prev 为 null，最后一项的 next 是完成页', () => {
    const map = sample();
    expect(map.view(step('before-you-start'), {}).prev).toBeNull();
    expect(map.view(step('about-kyc'), {}).next).toEqual({ kind: 'done' });
  });

  it('上一步/下一步带目标标题；选择页用选择页标题', () => {
    const v = sample().view(step('clean-claude-code'), {});
    expect(v.prev).toEqual({ kind: 'step', id: 'overview', title: '整体思路' });
    expect(v.next).toEqual({ kind: 'choose', fork: 'node-plan', title: '选择节点方案' });
    expect(v.current).toEqual({ kind: 'step', id: 'clean-claude-code', title: '清理本机的 Claude Code 配置' });
  });

  it('空的 stored 时 choices 等于默认路线，且总是覆盖全部分叉点', () => {
    expect(sample().view(step('overview'), {}).choices).toEqual({
      'node-plan': 'plan-1',
      'desktop-proxy': 'v2rayn',
      phone: 'iphone',
    });
  });
});

describe('分支与汇合（AC-03 逻辑层）', () => {
  it('选方案三：选择页的下一步是方案三第一步，方案三最后一步的下一步是汇合点（另一个分叉点的选择页）', () => {
    const map = sample();
    const stored = { 'node-plan': 'plan-3' };
    expect(short(map.view(choose('node-plan'), stored).next)).toBe('plan3-buy-node');
    expect(short(map.view(step('plan3-buy-node'), stored).next)).toBe('choose/desktop-proxy');
  });

  it('手工验证：view(choose desktop-proxy, {node-plan: plan-3}) 的 prev 是方案三最后一步', () => {
    const v = sample().view(choose('desktop-proxy'), { 'node-plan': 'plan-3' });
    expect(v.prev).toEqual({ kind: 'step', id: 'plan3-buy-node', title: '购买住宅节点' });
  });

  it('汇合点的上一步按所选分支：方案二是“运行脚本”，默认（方案一）也是“运行脚本”', () => {
    const map = sample();
    expect(short(map.view(choose('desktop-proxy'), { 'node-plan': 'plan-2' }).prev)).toBe('run-script');
    expect(short(map.view(choose('desktop-proxy'), {}).prev)).toBe('run-script');
  });

  it('AC-04 逻辑层：改为方案二后，从汇合点往回走两次到“买住宅 IP 服务器并测 IP”', () => {
    const map = sample();
    const stored = { 'node-plan': 'plan-2' };
    const p1 = map.view(choose('desktop-proxy'), stored).prev!;
    expect(short(p1)).toBe('run-script');
    const p2 = map.view(step('run-script'), stored).prev!;
    expect(short(p2)).toBe('ssh-connect');
    expect(short(map.view(step('ssh-connect'), stored).prev)).toBe('plan2-buy-residential-vps');
  });

  it('当前页属于某个分支时，按当前页所属选项覆盖 stored（AC-08 逻辑层）', () => {
    const v = sample().view(step('plan3-buy-node'), { 'node-plan': 'plan-1' });
    expect(v.choices['node-plan']).toBe('plan-3');
    expect(short(v.prev)).toBe('choose/node-plan');
    expect(short(v.next)).toBe('choose/desktop-proxy');
  });

  it('stored 里不存在的分叉点或选项被忽略，回退默认路线', () => {
    const v = sample().view(step('webrtc'), { 'node-plan': 'plan-9', 'desktop-proxy': 'gone', ghost: 'x' } as Choices);
    expect(v.choices).toEqual({ 'node-plan': 'plan-1', 'desktop-proxy': 'v2rayn', phone: 'iphone' });
    expect(short(v.prev)).toBe('v2rayn-dns');
  });

  it('同一分叉点紧挨着的两段分支（F2）：第二章末尾接第三章同一选项的分支，再汇合到 WebRTC', () => {
    const map = sample();
    const stored = { 'desktop-proxy': 'clash-verge' };
    expect(short(map.view(step('clash-verge-tun'), stored).next)).toBe('clash-verge-dns');
    expect(short(map.view(step('clash-verge-dns'), stored).prev)).toBe('clash-verge-tun');
    expect(short(map.view(step('clash-verge-dns'), {}).next)).toBe('webrtc');
    expect(short(map.view(step('webrtc'), stored).prev)).toBe('clash-verge-dns');
    // 打开第二段分支的页面时，也按它所属的选项算
    expect(map.view(step('clash-verge-dns'), {}).choices['desktop-proxy']).toBe('clash-verge');
  });

  it('F3 跨章节：第六章分支沿用到第七、十章，汇合点在后面的章节', () => {
    const map = sample();
    const android = { phone: 'android' };
    expect(walk(map, android).slice(16)).toEqual([
      'choose/phone', 'android-v2rayng', 'android-timezone',
      'android-google-play', 'android-gmail', 'create-google-account',
      'use-google-few-days',
      'android-subscribe',
      'after-subscribe', 'about-kyc',
    ]);
    expect(short(map.view(step('create-google-account'), android).prev)).toBe('android-gmail');
    expect(short(map.view(step('after-subscribe'), android).prev)).toBe('android-subscribe');
    expect(short(map.view(step('after-subscribe'), {}).prev)).toBe('purchase-failed');
  });

  it('不在路线图里的步骤或分叉点抛错，原型链上的名字也一样', () => {
    expect(() => sample().view(step('nope'), {})).toThrow(/不在路线图里的步骤：nope/);
    expect(() => sample().view(choose('nope'), {})).toThrow(/不在路线图里的分叉点：nope/);
    expect(() => sample().view(choose('constructor'), {})).toThrow(/不在路线图里的分叉点：constructor/);
    expect(() => sample().view(step('constructor'), {})).toThrow(/不在路线图里的步骤：constructor/);
  });

  it('stored 形状不对（null、数组、原型链上的键）时按默认路线，不抛错', () => {
    const map = sample();
    const defaults = map.view(step('webrtc'), {}).choices;
    expect(map.view(step('webrtc'), null as unknown as Choices).choices).toEqual(defaults);
    expect(map.view(step('webrtc'), [] as unknown as Choices).choices).toEqual(defaults);
    expect(map.view(step('webrtc'), JSON.parse('{"__proto__":{"phone":"android"}}')).choices).toEqual(defaults);
  });
});

describe('共享步骤（AC-19 逻辑层）', () => {
  it('stored 为空：按默认的方案一，“连上服务器”的上一步是“白嫖住宅 IP”', () => {
    const v = sample().view(step('ssh-connect'), {});
    expect(v.choices['node-plan']).toBe('plan-1');
    expect(short(v.prev)).toBe('plan1-free-residential-ip');
    expect(short(v.next)).toBe('run-script');
  });

  it('stored 为方案二：沿用方案二，上一步是“买住宅 IP 服务器并测 IP”', () => {
    const v = sample().view(step('ssh-connect'), { 'node-plan': 'plan-2' });
    expect(v.choices['node-plan']).toBe('plan-2');
    expect(short(v.prev)).toBe('plan2-buy-residential-vps');
  });

  it('stored 为方案三（不在共享步骤的选项里）：回退默认的方案一', () => {
    const v = sample().view(step('run-script'), { 'node-plan': 'plan-3' });
    expect(v.choices['node-plan']).toBe('plan-1');
    expect(short(v.prev)).toBe('ssh-connect');
    expect(short(v.next)).toBe('choose/desktop-proxy');
  });

  it('stored 不在其中时用默认选项，而不是选项列表里的第一个（FR-17）', () => {
    const spec = sampleSpec();
    spec.defaults['node-plan'] = 'plan-2';
    const map = buildRouteMap(spec, sampleSteps(), sampleChoices());
    expect(map.view(step('ssh-connect'), { 'node-plan': 'plan-3' }).choices['node-plan']).toBe('plan-2');
  });

  it('默认选项也不在共享步骤的选项里时，取其中第一个（按选择页的选项顺序）', () => {
    const spec = sampleSpec();
    spec.defaults['node-plan'] = 'plan-3';
    const map = buildRouteMap(spec, sampleSteps(), sampleChoices());
    expect(map.view(step('ssh-connect'), {}).choices['node-plan']).toBe('plan-1');
    expect(map.view(step('ssh-connect'), { 'node-plan': 'plan-2' }).choices['node-plan']).toBe('plan-2');
  });

  it('目录里共享步骤出现在它所属的每个选项下，只有所选选项下的标为在路线上', () => {
    const v = sample().view(step('ssh-connect'), { 'node-plan': 'plan-2' });
    const branch = v.outline.find((c) => c.id === 'residential-ip')!.items.find((i) => i.kind === 'branch')!;
    if (branch.kind !== 'branch') throw new Error('expected branch');
    const ids = (o: string) => branch.options.find((x) => x.id === o)!.steps.filter((s) => s.id === 'ssh-connect');
    expect(ids('plan-1')).toMatchObject([{ onRoute: false, current: true }]);
    expect(ids('plan-2')).toMatchObject([{ onRoute: true, current: true }]);
    expect(ids('plan-3')).toEqual([]);
  });
});

describe('可跳过步骤 skipTo（FR-15、AC-05 逻辑层）', () => {
  it('不可跳过的步骤没有 skipTo', () => {
    expect(sample().view(step('overview'), {}).skipTo).toBeNull();
  });

  it('本章末尾的可跳过步骤：跳到下一章的选择页', () => {
    expect(short(sample().view(step('clean-claude-code'), {}).skipTo)).toBe('choose/node-plan');
    expect(short(sample().view(step('ip-failed'), {}).skipTo)).toBe('choose/phone');
  });

  it('安卓：从“安装 Google Play”跳过本章内连续的可跳过步骤（跨越分支末尾），到第八章第一步', () => {
    expect(short(sample().view(step('android-google-play'), { phone: 'android' }).skipTo)).toBe('use-google-few-days');
  });

  it('iPhone：从“下载 Gmail”连跳到第八章第一步', () => {
    expect(short(sample().view(step('iphone-gmail'), {}).skipTo)).toBe('use-google-few-days');
  });

  it('后面紧跟不可跳过步骤时，跳到那一步', () => {
    const steps = sampleSteps().map((s) => (s.id === 'create-google-account' ? { ...s, skippable: false } : s));
    const map = buildRouteMap(sampleSpec(), steps, sampleChoices());
    expect(short(map.view(step('android-google-play'), { phone: 'android' }).skipTo)).toBe('create-google-account');
  });

  it('可跳过步骤是路线最后一项时跳到完成页', () => {
    const steps = sampleSteps().map((s) => (s.id === 'about-kyc' ? { ...s, skippable: true } : s));
    const map = buildRouteMap(sampleSpec(), steps, sampleChoices());
    expect(map.view(step('about-kyc'), {}).skipTo).toEqual({ kind: 'done' });
  });

  it('不越过章节：下一章开头的可跳过步骤不会被一起跳过', () => {
    const steps = sampleSteps().map((s) => (s.id === 'use-google-few-days' ? { ...s, skippable: true } : s));
    const map = buildRouteMap(sampleSpec(), steps, sampleChoices());
    expect(short(map.view(step('iphone-gmail'), {}).skipTo)).toBe('use-google-few-days');
  });

  it('skipLabel 原样进入 RouteData（AC-05 的“没用过，跳过”）', () => {
    const data = sample().data;
    expect(data.steps['clean-claude-code']).toMatchObject({ skippable: true, skipLabel: '没用过，跳过' });
    expect(data.steps['iphone-gmail']).not.toHaveProperty('skipLabel');
  });
});

describe('进度与目录（FR-10、FR-16）', () => {
  it('进度按当前路线在本章内计数，选择页不计入', () => {
    const map = sample();
    expect(map.view(step('ssh-connect'), {}).progress).toEqual({
      chapterId: 'residential-ip',
      chapter: '一、准备住宅 IP',
      index: 3,
      total: 4,
    });
    expect(map.view(step('ssh-connect'), { 'node-plan': 'plan-2' }).progress).toMatchObject({ index: 2, total: 3 });
    expect(map.view(step('plan3-buy-node'), {}).progress).toMatchObject({ index: 1, total: 1 });
  });

  it('跨两段分支的章节按所选选项计数', () => {
    expect(sample().view(step('webrtc'), {}).progress).toMatchObject({ index: 2, total: 3 });
  });

  it('选择页没有进度', () => {
    expect(sample().view(choose('phone'), {}).progress).toBeNull();
  });

  it('目录列出全部章节和步骤，标出在不在当前路线上、当前项和选择页', () => {
    const outline = sample().view(choose('desktop-proxy'), { 'desktop-proxy': 'clash-verge' }).outline;
    expect(outline.map((c) => c.id)).toEqual(sampleSpec().chapters.map((c) => c.id));
    const ch2 = outline.find((c) => c.id === 'desktop-proxy')!;
    expect(ch2.items[0]).toEqual({ kind: 'choose', fork: 'desktop-proxy', title: '选择电脑代理软件', current: true });
    const branch = ch2.items[1]!;
    if (branch.kind !== 'branch') throw new Error('expected branch');
    expect(branch.options.map((o) => [o.id, o.title, o.selected])).toEqual([
      ['v2rayn', 'v2rayN', false],
      ['clash-verge', 'Clash Verge', true],
    ]);
    expect(branch.options[0]!.steps.every((s) => !s.onRoute)).toBe(true);
    expect(branch.options[1]!.steps.map((s) => [s.id, s.onRoute, s.placeholder])).toEqual([
      ['clash-verge-import', true, false],
      ['clash-verge-tun', true, true],
    ]);
    const start = outline[0]!.items;
    expect(start[2]).toMatchObject({ kind: 'step', id: 'clean-claude-code', skippable: true, onRoute: true, current: false });
  });
});

describe('RouteData 与 routeMapFromData', () => {
  it('RouteData 可序列化，含标题、章节标题、skippable/skipLabel/placeholder 标记', () => {
    const data = sample().data;
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
    expect(data.chapters[1]!.title).toBe('一、准备住宅 IP');
    expect(data.steps['clash-verge-tun']).toEqual({ title: 'Clash Verge 开 tun', skippable: false, placeholder: true });
    expect(data.forks.phone).toEqual({ title: '选择手机', options: [{ id: 'iphone', title: 'iPhone' }, { id: 'android', title: '安卓' }] });
  });

  it('浏览器用 JSON 重建的 RouteMap 与构建时结果一致', () => {
    const built = sample();
    const rebuilt = routeMapFromData(JSON.parse(JSON.stringify(built.data)));
    const cases: [At, Choices][] = [
      [choose('desktop-proxy'), { 'node-plan': 'plan-3' }],
      [step('ssh-connect'), { 'node-plan': 'plan-2' }],
      [step('android-google-play'), { phone: 'android' }],
      [step('before-you-start'), {}],
    ];
    for (const [at, stored] of cases) expect(rebuilt.view(at, stored)).toEqual(built.view(at, stored));
  });
});

describe('pathOf', () => {
  it('步骤、选择页、完成页的站内路径（ADR-0002）', () => {
    expect(pathOf({ kind: 'step', id: 'run-script', title: '运行脚本' })).toBe('/run-script/');
    expect(pathOf({ kind: 'choose', fork: 'node-plan', title: '选择节点方案' })).toBe('/choose/node-plan/');
    expect(pathOf({ kind: 'done' })).toBe('/done/');
  });
});

// ================================================================ 校验

describe('校验：夹具是合法的', () => {
  it('全部 3×2×2 = 12 种选项组合都能从第一项走到完成页、不重复经过同一项', () => {
    const map = sample();
    let routes = 0;
    for (const plan of ['plan-1', 'plan-2', 'plan-3']) {
      for (const proxy of ['v2rayn', 'clash-verge']) {
        for (const phone of ['iphone', 'android']) {
          const seen = walk(map, { 'node-plan': plan, 'desktop-proxy': proxy, phone });
          expect(new Set(seen).size).toBe(seen.length);
          expect(seen.at(-1)).toBe('about-kyc');
          routes++;
        }
      }
    }
    expect(routes).toBe(12);
  });
});

describe('校验错误（FR-61、AC-14 逻辑层）', () => {
  it('错误一次报全，并写进异常消息', () => {
    const spec = sampleSpec();
    spec.chapters[0]!.items.push('missing-a', 'missing-b');
    expect(errorsOf(spec)).toHaveLength(2);
    expect(() => buildRouteMap(spec, sampleSteps(), sampleChoices())).toThrow(/route\.yaml：步骤 missing-a[\s\S]*missing-b/);
  });

  it('步骤在路线图里重复出现（两个普通项）', () => {
    const spec = sampleSpec();
    chapter(spec, 'after').items.push('overview');
    expectError(errorsOf(spec), 'route.yaml', /步骤 overview 在路线图里出现了多次/);
  });

  it('同一步骤出现在两个不同的分支段里', () => {
    const spec = sampleSpec();
    const seg = chapter(spec, 'leak-protection').items[0] as { branch: string; options: Record<string, string[]> };
    seg.options.v2rayn!.push('v2rayn-tun');
    expectError(errorsOf(spec), 'route.yaml', /步骤 v2rayn-tun 在路线图里出现了多次/);
  });

  it('同一步骤既是普通项又在分支段里', () => {
    const spec = sampleSpec();
    chapter(spec, 'ip-quality').items.push('ssh-connect');
    expectError(errorsOf(spec), 'route.yaml', /步骤 ssh-connect 在路线图里出现了多次/);
  });

  it('同一选项里同一步骤出现两次', () => {
    const spec = sampleSpec();
    const seg = chapter(spec, 'residential-ip').items[1] as { options: Record<string, string[]> };
    seg.options['plan-3']!.push('plan3-buy-node');
    expectError(errorsOf(spec), 'route.yaml', /步骤 plan3-buy-node 在分叉点 node-plan 的选项 plan-3 里出现了多次/);
  });

  it('步骤文件标识重复', () => {
    const steps = [...sampleSteps(), { id: 'webrtc', title: '又一个' }];
    expectError(errorsOf(sampleSpec(), steps), 'steps/webrtc.md', /步骤标识重复/);
  });

  it('路线图引用不存在的步骤，报 route.yaml', () => {
    const spec = sampleSpec();
    chapter(spec, 'nurture').items.push('ghost-step');
    expectError(errorsOf(spec), 'route.yaml', /步骤 ghost-step 没有对应的文件 steps\/ghost-step\.md/);
  });

  it('步骤文件不在路线图里，报步骤文件', () => {
    const steps = [...sampleSteps(), { id: 'orphan', title: '孤儿' }];
    expectError(errorsOf(sampleSpec(), steps), 'steps/orphan.md', /不在路线图里/);
  });

  it('branch 出现在 choose 之前', () => {
    const spec = sampleSpec();
    const items = chapter(spec, 'phone-proxy').items;
    items.reverse(); // [branch, choose]
    // 分支段被挪到选择页前面后，它后面紧跟选择页，汇合仍成立，只报顺序错误
    const errors = errorsOf(spec);
    expect(errors).toHaveLength(1);
    expectError(errors, 'route.yaml', /分叉点 phone 的分支段（章节 phone-proxy）出现在它的选择页/);
  });

  it('branch 引用了没有选择页的分叉点', () => {
    const spec = sampleSpec();
    chapter(spec, 'after').items.splice(0, 0, { branch: 'ghost', options: { a: ['x1'], b: ['x2'] } });
    const errors = errorsOf(spec);
    expectError(errors, 'route.yaml', /分叉点 ghost 没有对应的文件 choices\/ghost\.md/);
    expectError(errors, 'route.yaml', /分叉点 ghost 的分支段（章节 after）出现在它的选择页/);
  });

  it('branch 的 options 与选择页不一致（缺少、多出）', () => {
    const spec = sampleSpec();
    const seg = chapter(spec, 'residential-ip').items[1] as { options: Record<string, string[]> };
    delete seg.options['plan-3'];
    seg.options['plan-4'] = ['plan3-buy-node'];
    expectError(errorsOf(spec), 'route.yaml', /node-plan 的分支段（章节 residential-ip）的选项与 choices\/node-plan\.md 不一致：缺少 plan-3，多出 plan-4/);
  });

  it('选项的步骤列表为空', () => {
    const spec = sampleSpec();
    const seg = chapter(spec, 'residential-ip').items[1] as { options: Record<string, string[]> };
    seg.options['plan-3'] = [];
    const steps = sampleSteps().filter((s) => s.id !== 'plan3-buy-node');
    expectError(errorsOf(spec, steps), 'route.yaml', /选项 plan-3（章节 residential-ip）没有步骤/);
  });

  it('defaults 缺少分叉点', () => {
    const spec = sampleSpec();
    delete spec.defaults.phone;
    expectError(errorsOf(spec), 'route.yaml', /defaults 缺少分叉点 phone/);
  });

  it('defaults 的值不是该分叉点的选项，或写了不存在的分叉点', () => {
    const spec = sampleSpec();
    spec.defaults.phone = 'nokia';
    spec.defaults.ghost = 'x';
    const errors = errorsOf(spec);
    expectError(errors, 'route.yaml', /defaults\.phone 的值 nokia 不是这个分叉点的选项/);
    expectError(errors, 'route.yaml', /defaults 里的 ghost 不是路线图里的分叉点/);
  });

  it('分支之后没有汇合（分支段是路线最后一项）', () => {
    const spec = sampleSpec();
    spec.chapters = spec.chapters.filter((c) => c.id !== 'after');
    const steps = sampleSteps().filter((s) => !['after-subscribe', 'about-kyc'].includes(s.id));
    expectError(errorsOf(spec, steps), 'route.yaml', /分叉点 phone 的分支段（章节 subscribe）之后没有汇合点/);
  });

  it('分支之后紧跟另一个分叉点的分支段，也算没有汇合', () => {
    const spec = sampleSpec();
    // F2 的第二段分支后面直接接 F1 的一段分支（借用 webrtc、ipv6、check-ip-quality 作它的步骤）
    const leak = chapter(spec, 'leak-protection');
    leak.items = [leak.items[0]!, { branch: 'node-plan', options: { 'plan-1': ['webrtc'], 'plan-2': ['ipv6'], 'plan-3': ['check-ip-quality'] } }, 'ip-failed'];
    spec.chapters = spec.chapters.filter((c) => c.id !== 'ip-quality');
    expectError(errorsOf(spec), 'route.yaml', /分叉点 desktop-proxy 的分支段（章节 leak-protection）之后没有汇合点.*node-plan/);
  });

  it('汇合点可以在后面的章节：去掉第七章的汇合步骤后，第八章第一步成为 F3 的汇合点', () => {
    // 汇合点可以在后面的章节（评审 R2）：去掉 create-google-account 后，use-google-few-days 成为汇合点
    const spec = sampleSpec();
    chapter(spec, 'google-account').items.pop();
    const steps = sampleSteps().filter((s) => s.id !== 'create-google-account');
    expect(() => buildRouteMap(spec, steps, sampleChoices())).not.toThrow();
  });

  it.each(RESERVED_STEP_IDS)('保留字 %s 不能作步骤标识', (id) => {
    const spec = sampleSpec();
    chapter(spec, 'after').items.push(id);
    const steps = [...sampleSteps(), { id, title: '保留' }];
    expectError(errorsOf(spec, steps), `steps/${id}.md`, /保留路径/);
  });

  it('步骤标识必须是 kebab-case', () => {
    const spec = sampleSpec();
    chapter(spec, 'after').items.push('Bad_Id');
    const steps = [...sampleSteps(), { id: 'Bad_Id', title: '坏' }];
    expectError(errorsOf(spec, steps), 'steps/Bad_Id.md', /kebab-case/);
  });

  it('汇合点是另一个分叉点的选择页时合法（F1 → choose/desktop-proxy）', () => {
    expect(() => sample()).not.toThrow();
    expect(short(sample().view(step('run-script'), {}).next)).toBe('choose/desktop-proxy');
  });

  it('选择页引用的分叉点没有选择页文件', () => {
    const choices = sampleChoices().filter((c) => c.id !== 'phone');
    expectError(errorsOf(sampleSpec(), sampleSteps(), choices), 'route.yaml', /选择页 phone 没有对应的文件 choices\/phone\.md/);
  });

  it('分叉点、选项、章节标识必须是 kebab-case', () => {
    const choices = sampleChoices();
    choices.push({ id: 'Bad_Fork', title: '坏', options: [{ id: 'Bad_Opt', title: 'A' }, { id: 'ok', title: 'B' }] });
    const spec = sampleSpec();
    chapter(spec, 'after').id = 'After';
    const errors = errorsOf(spec, sampleSteps(), choices);
    expectError(errors, 'choices/Bad_Fork.md', /分叉点标识 Bad_Fork 必须是英文 kebab-case/);
    expectError(errors, 'choices/Bad_Fork.md', /选项标识 Bad_Opt 必须是英文 kebab-case/);
    expectError(errors, 'route.yaml', /第 10 个章节的 id 必须是英文 kebab-case/);
  });

  it('原型链上的键不能绕过校验：__proto__ 作 defaults 或选项键时报错，constructor 作分叉点时仍要求写 defaults', () => {
    const spec = JSON.parse(JSON.stringify(sampleSpec()).replace('"defaults":{', '"defaults":{"__proto__":"x",')) as RouteSpec;
    expectError(errorsOf(spec), 'route.yaml', /defaults 里的分叉点标识 __proto__ 必须是英文 kebab-case/);

    const spec2 = sampleSpec();
    const seg = chapter(spec2, 'residential-ip').items[1] as { options: Record<string, string[]> };
    Object.defineProperty(seg.options, '__proto__', { value: ['plan3-buy-node'], enumerable: true });
    expectError(errorsOf(spec2), 'route.yaml', /选项标识 __proto__ 必须是英文 kebab-case/);

    const spec3 = sampleSpec();
    chapter(spec3, 'nurture').items.push({ choose: 'constructor' }, { branch: 'constructor', options: { a: ['x-a'], b: ['x-b'] } }, 'x-end');
    const steps = [...sampleSteps(), { id: 'x-a', title: 'A' }, { id: 'x-b', title: 'B' }, { id: 'x-end', title: 'E' }];
    const choices = [...sampleChoices(), { id: 'constructor', title: 'C', options: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] }];
    expectError(errorsOf(spec3, steps, choices), 'route.yaml', /defaults 缺少分叉点 constructor/);
  });

  it('选择页文件没有出现在路线图里', () => {
    const choices = [...sampleChoices(), { id: 'extra', title: '多余', options: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] }];
    expectError(errorsOf(sampleSpec(), sampleSteps(), choices), 'choices/extra.md', /路线图里没有分叉点 extra 的选择页/);
  });

  it('选择页重复出现', () => {
    const spec = sampleSpec();
    chapter(spec, 'nurture').items.push({ choose: 'phone' });
    const errors = errorsOf(spec);
    expectError(errors, 'route.yaml', /分叉点 phone 的选择页出现了多次/);
  });

  it('选择页没有任何分支段', () => {
    const spec = sampleSpec();
    const choices = [...sampleChoices(), { id: 'lonely', title: '孤单', options: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] }];
    chapter(spec, 'nurture').items.unshift({ choose: 'lonely' });
    spec.defaults.lonely = 'a';
    expectError(errorsOf(spec, sampleSteps(), choices), 'route.yaml', /分叉点 lonely 有选择页，但没有任何分支段/);
  });

  it('选择页只有一个选项、选项标识重复', () => {
    const choices = sampleChoices();
    choices[2]!.options = [{ id: 'iphone', title: 'iPhone' }, { id: 'iphone', title: '又是 iPhone' }];
    const errors = errorsOf(sampleSpec(), sampleSteps(), choices);
    expectError(errors, 'choices/phone.md', /选项标识重复：iphone/);
    const single = sampleChoices();
    single[0]!.options = [{ id: 'plan-1', title: '方案一' }];
    expectError(errorsOf(sampleSpec(), sampleSteps(), single), 'choices/node-plan.md', /至少要有两个选项/);
  });

  it('章节标识重复', () => {
    const spec = sampleSpec();
    chapter(spec, 'after').id = 'start';
    expectError(errorsOf(spec), 'route.yaml', /章节标识重复：start/);
  });

  it.each<[string, unknown, RegExp]>([
    ['不是对象', 'oops', /路线图必须是一个对象/],
    ['缺 chapters', { defaults: {} }, /chapters 必须是非空列表/],
    ['未知字段', { ...sampleSpec(), extra: 1 }, /未知字段 extra/],
    ['defaults 不是映射', { ...sampleSpec(), defaults: [] }, /defaults 必须是/],
    ['defaults 的值不是字符串', { ...sampleSpec(), defaults: { ...sampleSpec().defaults, phone: 1 } }, /defaults\.phone 必须是选项标识/],
    ['章节缺 title', { ...sampleSpec(), chapters: [{ id: 'a', items: ['overview'] }] }, /第 1 个章节缺少 title/],
    ['章节 items 为空', { ...sampleSpec(), chapters: [{ id: 'a', title: 'A', items: [] }] }, /items 必须是非空列表/],
    ['坏的项', { ...sampleSpec(), chapters: [{ id: 'a', title: 'A', items: [42] }] }, /必须是步骤标识、\{ choose \} 或 \{ branch, options \}/],
    ['坏的 choose', { ...sampleSpec(), chapters: [{ id: 'a', title: 'A', items: [{ choose: 1 }] }] }, /选择页写作/],
    ['坏的 branch', { ...sampleSpec(), chapters: [{ id: 'a', title: 'A', items: [{ branch: 'x' }] }] }, /分支段写作/],
    ['选项不是列表', { ...sampleSpec(), chapters: [{ id: 'a', title: 'A', items: [{ branch: 'x', options: { a: 'y' } }] }] }, /选项 a 必须是步骤标识列表/],
  ])('route.yaml 形状错误：%s', (_name, spec, pattern) => {
    expectError(errorsOf(spec), 'route.yaml', pattern);
  });
});
