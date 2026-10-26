import { describe, expect, it } from 'vitest';
import { checkFrontmatter, checkLeftovers, checkSecrets, checkSkill } from './check';

/** 一份能通过校验的最小 SKILL.md（frontmatter 用规范内的字段） */
const OK_FRONTMATTER = {
  name: 'rezero-subscribe-claude',
  description: '订阅 Claude 的教程。',
  license: 'MIT',
  compatibility: '需要能执行本机命令',
  metadata: { version: '3.1.3', site: 'https://re0sub.test' },
};

/** 组一份入库生成物：SKILL.md（正文 + frontmatter）加一个参考文件 */
function filesOf(body: string, frontmatter: Record<string, unknown> = OK_FRONTMATTER, references: Record<string, string> = { 'references/preface.md': '# 前言\n' }) {
  const lines = Object.entries(frontmatter)
    .map(([key, value]) =>
      key === 'metadata'
        ? `metadata:\n${Object.entries(value as Record<string, string>).map(([k, v]) => `  ${k}: "${v}"`).join('\n')}`
        : `${key}: ${typeof value === 'string' && /[：:]/.test(value) ? JSON.stringify(value) : value}`,
    )
    .join('\n');
  const files = new Map<string, string>([['SKILL.md', `---\n${lines}\n---\n\n${body}`]]);
  for (const [path, text] of Object.entries(references)) files.set(path, text);
  return files;
}

const OK_BODY = `# Re:从零开始订阅 claude

## 路线

| 章 | 页面 | 参考文件 |
| --- | --- | --- |
| 开始 | \`preface\` | \`references/preface.md\` |
`;

describe('checkFrontmatter：Agent Skills 规范（FR-113 第 2 条）', () => {
  it('规范内的字段、name 等于目录名时没有问题', () => {
    expect(checkFrontmatter(OK_FRONTMATTER, 'rezero-subscribe-claude')).toEqual([]);
  });

  it('name 和目录名不同时报错', () => {
    expect(checkFrontmatter({ ...OK_FRONTMATTER, name: 'other-name' }, 'rezero-subscribe-claude')).toEqual([
      'frontmatter 的 name（other-name）要等于目录名（rezero-subscribe-claude）',
    ]);
  });

  it('name 不合规范（大写、下划线）时报错', () => {
    for (const name of ['My-Skill', 'my_skill']) {
      expect(checkFrontmatter({ ...OK_FRONTMATTER, name }, 'my-skill').join('；')).toContain('不合规范');
    }
  });

  it('description 恰好 1024 个字符没有问题，1025 报错', () => {
    const long = 'a'.repeat(1024);
    expect(checkFrontmatter({ ...OK_FRONTMATTER, description: long }, 'rezero-subscribe-claude')).toEqual([]);
    expect(checkFrontmatter({ ...OK_FRONTMATTER, description: `${long}a` }, 'rezero-subscribe-claude')).toEqual([
      'frontmatter 的 description 有 1025 个字符，超过 1024',
    ]);
  });

  it('缺少 description 报错', () => {
    const { description: _omitted, ...without } = OK_FRONTMATTER;
    expect(checkFrontmatter(without, 'rezero-subscribe-claude')).toEqual(['frontmatter 缺少 description']);
  });

  it('compatibility 超过 500 个字符报错', () => {
    expect(checkFrontmatter({ ...OK_FRONTMATTER, compatibility: 'x'.repeat(501) }, 'rezero-subscribe-claude').join()).toContain('compatibility');
  });

  it('metadata 的值不是字符串时报错', () => {
    expect(checkFrontmatter({ ...OK_FRONTMATTER, metadata: { version: 3 } }, 'rezero-subscribe-claude')).toEqual([
      'frontmatter 的 metadata.version 要写成字符串（加引号）',
    ]);
  });

  it('规范以外的字段报错', () => {
    expect(checkFrontmatter({ ...OK_FRONTMATTER, extra: 'x' }, 'rezero-subscribe-claude')).toEqual([
      'frontmatter 的 extra 不是 Agent Skills 规范里的字段',
    ]);
  });
});

describe('checkLeftovers：Obsidian 写法和占位残留（FR-113 第 3 条）', () => {
  const cases: [string, RegExp][] = [
    ['看 ![[x.png]]', /!\[\[/],
    ['链到 [[另一页]]', /\[\[/],
    ['图 ![说明](x.png)', /!\[/],
    ['> [!why] 说明', /Callout/],
    ['模板 {{name}}', /\{\{/],
  ];
  for (const [line, pattern] of cases) {
    it(`报出：${pattern.source}`, () => {
      const problems = checkLeftovers('a.md', `第一行\n${line}\n第三行`);
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatchObject({ file: 'a.md', line: 2, message: expect.stringMatching(pattern) });
    });
  }

  it('![[ 只报最具体的一种（图片嵌入），不再重复报 [[ 和 ![', () => {
    expect(checkLeftovers('a.md', '![[x.png]]')).toEqual([{ file: 'a.md', line: 1, message: '残留图片嵌入 ![[' }]);
  });

  it('代码块里的残留同样报（残留本身就不该有）', () => {
    expect(checkLeftovers('a.md', '```\n![[x.png]]\n```')).toHaveLength(1);
  });

  it('干净的文件没有问题', () => {
    expect(checkLeftovers('a.md', OK_BODY)).toEqual([]);
  });
});

describe('checkSecrets：凭据与真实地址（FR-113 第 4 条）', () => {
  it('vless:// 后跟实际内容报，单独写 `vless://` 允许', () => {
    expect(checkSecrets('a.md', '链接：vless://uuid@1.2.3.4:443?x=1')).toHaveLength(1);
    expect(checkSecrets('a.md', '主节点以 `vless://` 开头')).toEqual([]);
    for (const protocol of ['vmess', 'trojan', 'ss', 'hysteria2', 'hy2']) {
      expect(checkSecrets('a.md', `${protocol}://payload`)).toHaveLength(1);
    }
  });

  it('名单里的 IPv4 允许，名单外报；同一行两个 IP 只报名单外那个', () => {
    expect(checkSecrets('a.md', '本机 127.0.0.1 和 8.8.8.8')).toEqual([]);
    const problems = checkSecrets('a.md', '回环 127.0.0.1，服务器 192.0.2.1');
    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('192.0.2.1');
  });

  it('版本号、小数点数字不算 IPv4', () => {
    expect(checkSecrets('a.md', '版本 3.1.3，比例 0.5')).toEqual([]);
  });

  it('password: / 密码： 后跟值报，跟说明文字允许', () => {
    expect(checkSecrets('a.md', 'password: hunter2')).toHaveLength(1);
    expect(checkSecrets('a.md', '密码：Abc12345')).toHaveLength(1);
    expect(checkSecrets('a.md', '出现 `password:` 时输入 root 密码')).toEqual([]);
    expect(checkSecrets('a.md', '输入 root 密码')).toEqual([]);
  });
});

describe('checkSkill：整体（AC-42）', () => {
  it('干净的生成物没有问题', () => {
    expect(checkSkill(filesOf(OK_BODY))).toEqual([]);
  });

  it('缺少 SKILL.md 报出', () => {
    const files = filesOf(OK_BODY);
    files.delete('SKILL.md');
    expect(checkSkill(files).map(({ message }) => message)).toEqual(['缺少 SKILL.md']);
  });

  it('引用的参考文件不存在时报出：引用处和缺的参考文件各一条', () => {
    const files = filesOf(`${OK_BODY}\n另外看 \`references/missing.md\`。`);
    expect(checkSkill(files)).toEqual([
      { file: 'agent-skill/rezero-subscribe-claude/SKILL.md', message: '引用的 references/missing.md 不存在' },
      { file: 'agent-skill/rezero-subscribe-claude/references/missing.md', message: '路线图页面或 ip-tests 缺少参考文件，运行 npm run skill 重新生成' },
    ]);
  });

  it('参考文件少了（路线表里有、目录里没有）时报出缺的那个', () => {
    const files = filesOf(OK_BODY, OK_FRONTMATTER, {});
    expect(checkSkill(files)).toEqual([
      { file: 'agent-skill/rezero-subscribe-claude/SKILL.md', message: '引用的 references/preface.md 不存在' },
      { file: 'agent-skill/rezero-subscribe-claude/references/preface.md', message: '路线图页面或 ip-tests 缺少参考文件，运行 npm run skill 重新生成' },
    ]);
  });

  it('frontmatter 写坏时逐条报出', () => {
    const files = filesOf(OK_BODY, { ...OK_FRONTMATTER, name: 'other', description: '' });
    const messages = checkSkill(files).map(({ message }) => message);
    expect(messages).toContain('frontmatter 的 name（other）要等于目录名（rezero-subscribe-claude）');
    expect(messages).toContain('frontmatter 缺少 description');
  });

  it('SKILL.md 正文超过 500 行报出（NFR-07）', () => {
    const files = filesOf(`${OK_BODY}\n${'占位行\n'.repeat(500)}`);
    const problems = checkSkill(files);
    expect(problems.some(({ message }) => message.includes('超过 500 行'))).toBe(true);
  });

  it('参考文件里的残留和凭据同样报，并指出文件和行', () => {
    const files = filesOf(OK_BODY, OK_FRONTMATTER, {
      'references/preface.md': '第一行\n![[x.png]]\nvless://uuid@host\n',
    });
    const problems = checkSkill(files);
    expect(problems).toContainEqual({ file: 'agent-skill/rezero-subscribe-claude/references/preface.md', line: 2, message: expect.stringContaining('![[') });
    expect(problems.some(({ line, message }) => line === 3 && message.includes('vless://'))).toBe(true);
  });
});
