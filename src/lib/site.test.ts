import { describe, expect, it } from 'vitest';
import { RouteValidationError } from './route/route-map';
import { assembleRoute, parseRouteYaml, startOf, unlistedFaq } from './site';

const START_ONLY = `
defaults: {}
chapters:
  - id: start
    title: 开始
    items: [before-you-start, overview]
`;

const step = (id: string, data: Record<string, unknown> = {}) => ({
  id,
  data: { title: `标题 ${id}`, skippable: false, placeholder: false, ...data },
});

describe('parseRouteYaml', () => {
  it('把 route.yaml 文本解析成普通对象', () => {
    expect(parseRouteYaml(START_ONLY)).toEqual({
      defaults: {},
      chapters: [{ id: 'start', title: '开始', items: ['before-you-start', 'overview'] }],
    });
  });

  it('YAML 写坏时报出 route.yaml 和行号', () => {
    expect(() => parseRouteYaml('chapters:\n  - id: start\n   title: 开始\n')).toThrow(/route\.yaml.*第 3 行/);
  });
});

describe('assembleRoute', () => {
  it('把步骤条目映射成路线需要的元数据，按 route.yaml 编译', () => {
    const route = assembleRoute(parseRouteYaml(START_ONLY), [step('overview'), step('before-you-start')], []);
    const view = route.view({ kind: 'step', id: 'before-you-start' }, {});

    expect(view.prev).toBeNull();
    expect(view.next).toEqual({ kind: 'step', id: 'overview', title: '标题 overview' });
    expect(view.progress).toEqual({ chapterId: 'start', chapter: '开始', index: 1, total: 2 });
    expect(route.view({ kind: 'step', id: 'overview' }, {}).next).toEqual({ kind: 'done' });
  });

  it('带上 skippable、skipLabel、placeholder，不带内容字段', () => {
    const route = assembleRoute(
      parseRouteYaml(START_ONLY),
      [step('before-you-start'), step('overview', { skippable: true, skipLabel: '没用过，跳过', placeholder: true, placeholderHint: '提示' })],
      [],
    );
    expect(route.data.steps['overview']).toEqual({ title: '标题 overview', skippable: true, skipLabel: '没用过，跳过', placeholder: true });
  });

  it('选择页标题取 question，选项按 frontmatter 里的书写顺序', () => {
    const spec = parseRouteYaml(`
defaults: { node-plan: plan-2 }
chapters:
  - id: start
    title: 开始
    items:
      - before-you-start
      - choose: node-plan
      - branch: node-plan
        options: { plan-2: [b], plan-1: [a] }
      - overview
`);
    const route = assembleRoute(
      spec,
      [step('before-you-start'), step('a'), step('b'), step('overview')],
      [{ id: 'node-plan', data: { question: '你想用哪种方式？', options: { 'plan-2': { title: '方案二' }, 'plan-1': { title: '方案一' } } } }],
    );
    expect(route.data.forks['node-plan']).toEqual({
      title: '你想用哪种方式？',
      options: [
        { id: 'plan-2', title: '方案二' },
        { id: 'plan-1', title: '方案一' },
      ],
    });
  });

  it('路线图有错时抛出 RouteValidationError，列出出错的文件', () => {
    const run = () => assembleRoute(parseRouteYaml(START_ONLY), [step('before-you-start'), step('orphan')], []);
    expect(run).toThrow(RouteValidationError);
    expect(run).toThrow(/route\.yaml/);
    expect(run).toThrow(/steps\/orphan\.md/);
  });
});

describe('startOf', () => {
  it('取路线图第一章的第一项', () => {
    const route = assembleRoute(parseRouteYaml(START_ONLY), [step('before-you-start'), step('overview')], []);
    expect(startOf(route)).toEqual({ kind: 'step', id: 'before-you-start', title: '标题 before-you-start' });
  });
});

describe('unlistedFaq：常见问题列表页 pages/faq.md 漏列的条目', () => {
  const ids = ['open-panel', 'reinstall'];

  it('每条都写成列表项里的 [[faq/…]] 时没有漏列；允许链接文字和两边空格', () => {
    expect(unlistedFaq('引导语\n\n- [[faq/open-panel]]\n* [[ faq/reinstall |装过了]]\n', ids)).toEqual([]);
  });

  it('只看列表项：正文、代码块、注释里提到的不算列上', () => {
    const body = '见 [[faq/reinstall]]。\n\n```\n- [[faq/reinstall]]\n```\n\n<!-- - [[faq/reinstall]] -->\n\n- [[faq/open-panel]]\n';
    expect(unlistedFaq(body, ids)).toEqual(['reinstall']);
  });

  it('标识是另一条的前缀时不算列上', () => {
    expect(unlistedFaq('- [[faq/open-panel-old]]\n- [[faq/reinstall]]\n', ids)).toEqual(['open-panel']);
  });
});
