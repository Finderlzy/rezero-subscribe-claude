import { describe, expect, it } from 'vitest';
import { assembleRoute } from '../route/assemble';
import { parseRouteYaml } from '../route/route-yaml';
import { generateSkill, rewriteFingerprint, SkillGenerateError, type SkillInputs } from './generate';

const FENCE = '```';

const PAGE_A = `# 甲页
---
开头见 [乙页的第二节](01-乙.md#第二节)，也见 [本页小节](#第一节)。

## 第一节
---
![[shot.png|300]]
\`[[不转换]]\` 和 [[乙页#第二节|去乙]]、[[乙页]]、[[04技术/博客文|博客]]、[[04技术/待填]]、[[#子节|同页]]

> [!caution] 小心
> 第二行 [[乙页]]
> 第三行

TODO：这里还没写

${FENCE}bash
echo "[[不转换]]" ![[x.png]] [乙](01-乙.md)
> [!note] 也不转换
${FENCE}

### 子节
![[demo.mp4]]（说明）
![[图.svg]]
![外部图](https://example.com/a.png)

| 表 | 头 |
| --- | --- |
| [乙](01-乙.md) | [[乙页#第二节\\|第二节]] |

#### 更深一层
![[deep.png]]
`;

const PAGE_B = `# 乙页

## 第二节

> [!note]
> 内容
`;

const ROUTE = `
chapters:
  - id: start
    title: 开始
    items: [a]
  - id: end
    title: 结尾
    items: [b]
`;

function inputs(overrides: Partial<SkillInputs> = {}): SkillInputs {
  const entry = (id: string, title: string) => ({ id, body: `# ${title}\n`, data: { principleOnly: false, skippable: false } });
  return {
    rewrite: [
      { path: 'docs/v3-rewrite/00-甲.md', text: PAGE_A },
      { path: 'docs/v3-rewrite/01-乙.md', text: PAGE_B.replace(/\n/g, '\r\n') },
      { path: 'docs/v3-rewrite/reference/合集.md', text: '# 合集\n\n见 [[甲页#第一节]]，[[实测：x]]\n' },
      { path: 'docs/v3-rewrite/reference/实测：x.md', text: '# 实测：x\n\n## 结果\n' },
    ],
    pages: [
      { kind: 'principle', id: 'a', title: '甲页' },
      { kind: 'principle', id: 'b', title: '乙页' },
      { kind: 'reference', id: 'ip-tests', title: '合集' },
      { kind: 'reference', id: 'ip-tests/x', title: '实测：x' },
    ],
    blogLinks: new Map([
      ['04技术/博客文', 'https://blog.example/post/'],
      ['04技术/待填', null],
    ]),
    route: assembleRoute(parseRouteYaml(ROUTE), [entry('a', '甲页'), entry('b', '乙页')]).data,
    template: '---\nname: rezero-subscribe-claude\nmetadata:\n  version: "{{version}}"\n  rewrite: "{{ rewrite }}"\n---\n\n{{site}} {{group}}\n\n{{route}}\n',
    sourceReferences: [{ name: 'agent-ssh.md', text: '# 连服务器\r\n' }],
    version: '9.9.9',
    group: { number: '123', url: 'https://qm.example/q' },
    ...overrides,
  };
}

const page = (overrides?: Partial<SkillInputs>) => generateSkill(inputs(overrides)).files.get('references/a.md')!;
const lines = (text: string) => text.split('\n');

describe('generateSkill：文件', () => {
  it('11 页对应的页面 + 实测合集各一个参考文件，方法文件原样复制，按路径排序', () => {
    const { files, sources } = generateSkill(inputs());
    expect([...files.keys()]).toEqual(['SKILL.md', 'references/a.md', 'references/agent-ssh.md', 'references/b.md', 'references/ip-tests.md']);
    expect(files.get('references/agent-ssh.md')).toBe('# 连服务器\n');
    expect(sources.get('references/a.md')).toBe('docs/v3-rewrite/00-甲.md');
    expect(sources.get('SKILL.md')).toBe('agent-skill/source/SKILL.md');
  });

  it('文件开头是引导站网址和“由 npm run skill 生成”', () => {
    expect(lines(page()).slice(0, 4)).toEqual([
      '> 引导站：https://re0claude.us.ci/a/',
      '> 本文件由 `npm run skill` 从 `docs/v3-rewrite/00-甲.md` 生成，不要手改。',
      '',
      '# 甲页',
    ]);
  });

  it('确定性：同样的输入逐字节相同；换行统一成 \\n', () => {
    const first = generateSkill(inputs());
    const second = generateSkill(inputs());
    expect([...second.files]).toEqual([...first.files]);
    for (const text of first.files.values()) expect(text).not.toContain('\r');
  });
});

describe('generateSkill：转换规则（架构 §16.3）', () => {
  it('h2/h3 下加一行小节网址，锚点和站上一致；h4 不加', () => {
    const text = page();
    expect(text).toContain('## 第一节\n\n> 引导站小节：https://re0claude.us.ci/a/#第一节\n\n---');
    expect(text).toContain('### 子节\n\n> 引导站小节：https://re0claude.us.ci/a/#子节\n\n');
    expect(text).not.toContain('#更深一层');
  });

  it('相对链接和双链换成完整网址，锚点按目标重写稿的小标题算', () => {
    const text = page();
    expect(text).toContain('开头见 [乙页的第二节](https://re0claude.us.ci/b/#第二节)');
    expect(text).toContain('[去乙](https://re0claude.us.ci/b/#第二节)、[乙页](https://re0claude.us.ci/b/)');
    expect(text).toContain('> 第二行 [乙页](https://re0claude.us.ci/b/)');
    expect(generateSkill(inputs()).files.get('references/ip-tests.md')).toContain(
      '见 [甲页 > 第一节](https://re0claude.us.ci/a/#第一节)，[实测：x](https://re0claude.us.ci/ip-tests/x/)',
    );
  });

  it('同页小节链接 [文字](#小节) 和 [[#小节|文字]] 换成本页网址', () => {
    expect(page()).toContain('也见 [本页小节](https://re0claude.us.ci/a/#第一节)');
    expect(page()).toContain('[同页](https://re0claude.us.ci/a/#子节)');
  });

  it('表格里的 \\| 双链和相对链接都换成网址', () => {
    expect(page()).toContain('| [乙](https://re0claude.us.ci/b/) | [第二节](https://re0claude.us.ci/b/#第二节) |');
  });

  it('博客双链按 blog-links.yaml 换，没有地址的只留文字', () => {
    expect(page()).toContain('[博客](https://blog.example/post/)、待填、');
  });

  it('截图、说明图、普通图片换成“看图”，视频换成“看视频”，都指向所在小节；后面紧跟文字时空一格', () => {
    const text = page();
    expect(text).toContain('\n看图：https://re0claude.us.ci/a/#第一节\n');
    expect(text).toContain('\n看视频：https://re0claude.us.ci/a/#子节 （说明）\n看图：https://re0claude.us.ci/a/#子节\n看图：https://re0claude.us.ci/a/#子节\n');
    // h4 不是小节：仍指向它上面的 h3
    expect(text).toContain('#### 更深一层\n看图：https://re0claude.us.ci/a/#子节\n');
  });

  it('Callout 换成普通引用块，开头加“注意”“说明”，多行原样跟着', () => {
    expect(page()).toContain('> **注意**：小心\n> 第二行');
    expect(page()).toContain('> 第三行\n');
    expect(generateSkill(inputs()).files.get('references/b.md')).toContain('> **说明**\n> 内容\n');
  });

  it('TODO： 段落换成“作者待补：”，原文保留', () => {
    expect(page()).toContain('\n作者待补：这里还没写\n');
  });

  it('围栏代码块和行内代码里的 [[、![[、相对链接、Callout 都不转换', () => {
    const text = page();
    expect(text).toContain('`[[不转换]]` 和');
    expect(text).toContain(`${FENCE}bash\necho "[[不转换]]" ![[x.png]] [乙](01-乙.md)\n> [!note] 也不转换\n${FENCE}`);
  });

  it('同页链接里的小标题不存在时报错', () => {
    const rewrite = inputs().rewrite.map((f) => (f.path.endsWith('00-甲.md') ? { ...f, text: `${f.text}\n[坏](#没有这一节)\n` } : f));
    expect(() => generateSkill(inputs({ rewrite }))).toThrow(/00-甲\.md:\d+：这一页里没有小标题“没有这一节”/);
  });

  it('双链目标的小标题只按重写稿算（R2）：站上有、重写稿没有也报错', () => {
    const rewrite = inputs().rewrite.map((f) => (f.path.endsWith('00-甲.md') ? { ...f, text: `${f.text}\n[[乙页#旧小节]]\n` } : f));
    expect(() => generateSkill(inputs({ rewrite }))).toThrow(/“乙页”的重写稿里没有小标题“旧小节”/);
  });
});

describe('generateSkill：SKILL.md 模板', () => {
  it('替换 {{version}}、{{rewrite}}、{{site}}、{{group}}、{{route}}', () => {
    const skill = generateSkill(inputs()).files.get('SKILL.md')!;
    expect(skill).toContain('version: "9.9.9"');
    expect(skill).toMatch(/rewrite: "[0-9a-f]{12}"/);
    expect(skill).toContain('https://re0claude.us.ci QQ 群 123（加群链接：https://qm.example/q）');
    expect(skill).toContain('| 开始 | `a` | 甲页 | `references/a.md` | https://re0claude.us.ci/a/ | — |');
    expect(skill).toContain('- 合集：`references/ip-tests.md`，引导站 https://re0claude.us.ci/ip-tests/');
    expect(skill).not.toContain('{{');
  });

  it('路线表写出分叉点：选择页、各选项的页面和推荐项', () => {
    const route = assembleRoute(
      parseRouteYaml(`
chapters:
  - id: start
    title: 开始
    items:
      - s
      - { choose: plan, page: a, default: two }
      - branch: plan
        options: { one: [b], two: [c] }
      - e
`),
      [
        { id: 's', body: '# 起页', data: { principleOnly: false, skippable: false } },
        { id: 'e', body: '# 终页', data: { principleOnly: false, skippable: false } },
        { id: 'a', body: '# 甲页', data: { principleOnly: false, skippable: false, options: { one: { title: '方案一' }, two: { title: '方案二' } } } },
        { id: 'b', body: '# 乙页', data: { principleOnly: false, skippable: false } },
        { id: 'c', body: '# 丙页', data: { principleOnly: false, skippable: false } },
      ],
    ).data;
    const skill = generateSkill(inputs({ route })).files.get('SKILL.md')!;
    expect(skill).toContain('| `a` | 甲页 | `references/a.md` | https://re0claude.us.ci/a/ | 选择页：分叉点 `plan`，选项 `one`（方案一） / `two`（方案二），推荐 `two` |');
    expect(skill).toContain('| `c` | 丙页 | `references/c.md` | https://re0claude.us.ci/c/ | 分叉点 `plan` 选 `two`（方案二）时走 |');
  });

  it('模板里不认识的占位报错并指出行号', () => {
    expect(() => generateSkill(inputs({ template: '---\nname: x\n---\n{{nope}}\n' }))).toThrow(
      /agent-skill\/source\/SKILL\.md:4：不认识的占位 \{\{nope\}\}/,
    );
  });

  it('替换后还留着 {{ 时报错', () => {
    expect(() => generateSkill(inputs({ template: '{{version}} {{ 半个\n' }))).toThrow(/还留着“\{\{”/);
  });
});

describe('generateSkill：输入有问题时报错', () => {
  it('重写稿新增了一页、站内还没导入：报出重写稿文件，提示先按导入流程建页面', () => {
    const rewrite = [...inputs().rewrite, { path: 'docs/v3-rewrite/11-新页.md', text: '# 新页\n' }];
    let error: unknown;
    try {
      generateSkill(inputs({ rewrite }));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(SkillGenerateError);
    expect((error as SkillGenerateError).problems).toEqual([
      expect.objectContaining({ file: 'docs/v3-rewrite/11-新页.md', message: expect.stringContaining('站内没有标题是“新页”的页面') }),
    ]);
  });

  it('相对链接指向不存在的重写稿时报错', () => {
    const rewrite = inputs().rewrite.map((f) => (f.path.endsWith('01-乙.md') ? { ...f, text: `${PAGE_B}\n[坏](99-没有.md)\n` } : f));
    expect(() => generateSkill(inputs({ rewrite }))).toThrow(/01-乙\.md：相对链接的目标没有对应的重写稿文件 99-没有\.md/);
  });

  it('不认识的 Callout 类型报错', () => {
    const rewrite = inputs().rewrite.map((f) => (f.path.endsWith('01-乙.md') ? { ...f, text: `${PAGE_B}\n> [!tip] 不行\n` } : f));
    expect(() => generateSkill(inputs({ rewrite }))).toThrow(/不认识的 Callout 类型 \[!tip\]/);
  });

  it('方法文件名不是 agent-*.md 时报错', () => {
    expect(() => generateSkill(inputs({ sourceReferences: [{ name: 'preface.md', text: '' }] }))).toThrow(/agent-skill\/source\/references\/preface\.md：方法文件名/);
  });
});

describe('rewriteFingerprint', () => {
  const files = [
    { path: 'docs/v3-rewrite/b.md', text: '乙\n' },
    { path: 'docs/v3-rewrite/a.md', text: '甲\n' },
  ];

  it('12 位十六进制；和文件顺序、换行写法无关', () => {
    const value = rewriteFingerprint(files);
    expect(value).toMatch(/^[0-9a-f]{12}$/);
    expect(rewriteFingerprint([...files].reverse())).toBe(value);
    expect(rewriteFingerprint(files.map((f) => ({ ...f, text: f.text.replace(/\n/g, '\r\n') })))).toBe(value);
  });

  it('改一个字就变', () => {
    expect(rewriteFingerprint([files[0]!, { ...files[1]!, text: '甲。\n' }])).not.toBe(rewriteFingerprint(files));
  });

  it('只有参与生成的源文件算进去：实测单页变了，SKILL.md 的 rewrite 不变', () => {
    const fingerprint = (rewrite: SkillInputs['rewrite']) => /rewrite: "([0-9a-f]+)"/.exec(generateSkill(inputs({ rewrite })).files.get('SKILL.md')!)![1];
    const base = inputs().rewrite;
    const changed = base.map((f) => (f.path.endsWith('实测：x.md') ? { ...f, text: `${f.text}多一句\n` } : f));
    expect(fingerprint(changed)).toBe(fingerprint(base));
    const changedPage = base.map((f) => (f.path.endsWith('01-乙.md') ? { ...f, text: `${f.text}多一句\n` } : f));
    expect(fingerprint(changedPage)).not.toBe(fingerprint(base));
  });
});
