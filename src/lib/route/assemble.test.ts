import { describe, expect, it } from 'vitest';
import { assembleRoute, pageTitle, type PrincipleEntry } from './assemble';
import { RouteValidationError } from './route-map';
import { parseRouteYaml } from './route-yaml';

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
