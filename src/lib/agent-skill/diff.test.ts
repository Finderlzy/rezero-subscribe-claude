import { describe, expect, it } from 'vitest';
import { diffSkill } from './diff';
import type { GeneratedSkill } from './generate';

const expected: GeneratedSkill = {
  files: new Map([
    ['SKILL.md', '---\nname: x\n---\n'],
    ['references/afterword.md', '# 后记\n\n第一句\n第二句\n'],
  ]),
  sources: new Map([
    ['SKILL.md', 'agent-skill/source/SKILL.md'],
    ['references/afterword.md', 'docs/v3-rewrite/10-后记.md'],
  ]),
};

describe('diffSkill：生成结果和入库的生成物逐字对照（AC-41）', () => {
  it('完全一致时没有问题', () => {
    expect(diffSkill(expected, new Map(expected.files))).toEqual([]);
  });

  it('少文件：指出缺的生成物和它的源文件', () => {
    const actual = new Map(expected.files);
    actual.delete('references/afterword.md');
    expect(diffSkill(expected, actual)).toEqual([
      {
        file: 'agent-skill/rezero-subscribe-claude/references/afterword.md',
        message: '缺少这个文件（由 docs/v3-rewrite/10-后记.md 生成），运行 npm run skill 重新生成',
      },
    ]);
  });

  it('多文件：入库里有、生成结果里没有', () => {
    const actual = new Map([...expected.files, ['references/old.md', '旧页\n']]);
    expect(diffSkill(expected, actual)).toEqual([
      { file: 'agent-skill/rezero-subscribe-claude/references/old.md', message: '生成结果里没有这个文件，运行 npm run skill 重新生成（会删掉它）' },
    ]);
  });

  it('内容不同：指出生成物、重写稿和第一处不同的行', () => {
    const actual = new Map([...expected.files, ['references/afterword.md', '# 后记\n\n第一句\n第二句改了\n']]);
    expect(diffSkill(expected, actual)).toEqual([
      {
        file: 'agent-skill/rezero-subscribe-claude/references/afterword.md',
        line: 4,
        message: '和 docs/v3-rewrite/10-后记.md 对不上，运行 npm run skill 重新生成',
      },
    ]);
  });

  it('多处问题按路径排序逐条列出', () => {
    const actual = new Map([['SKILL.md', '改过\n'], ['references/zz.md', '']]);
    expect(diffSkill(expected, actual).map((p) => p.file)).toEqual([
      'agent-skill/rezero-subscribe-claude/SKILL.md',
      'agent-skill/rezero-subscribe-claude/references/afterword.md',
      'agent-skill/rezero-subscribe-claude/references/zz.md',
    ]);
  });
});
