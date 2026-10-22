import { describe, expect, it } from 'vitest';
import { samplePages, sampleSpec } from '../lib/route/fixtures/sample-route';
import { buildRouteMap } from '../lib/route/route-map';
import { forkOfChoosePage, openPatch, renderProgress } from './route-enhance';

const map = buildRouteMap(sampleSpec(), samplePages());
const { data } = map;

describe('openPatch：打开一页时写入的本机状态（FR-17、FR-50）', () => {
  it('只属于一个分支的页面：记下它所属的选项，只写 choices（AC-08）', () => {
    expect(openPatch(data, 'iphone-gmail')).toEqual({ choices: { phone: 'iphone' } });
    expect(openPatch(data, 'plan3-node')).toEqual({ choices: { 'node-plan': 'plan-3' } });
  });

  it('同一分叉点的后一段分支也算它的选项', () => {
    expect(openPatch(data, 'android-subscribe')).toEqual({ choices: { phone: 'android' } });
  });

  it('原理独有的分支页面同样记下选项', () => {
    expect(openPatch(data, 'iphone-why')).toEqual({ choices: { phone: 'iphone' } });
  });

  it('共享步骤属于多个选项：不写，本机已有的选择保持不变', () => {
    expect(openPatch(data, 'make-node')).toBeNull();
  });

  it('普通页、汇合点、选择页、旁支页：不写', () => {
    for (const id of ['preface', 'import-proxy', 'register-gmail', 'choose-plan', 'google-appeal', 'afterword']) {
      expect(openPatch(data, id)).toBeNull();
    }
  });

  it('不在路线图里的标识：不写', () => {
    expect(openPatch(data, 'no-such-page')).toBeNull();
  });
});

describe('forkOfChoosePage：选择页对应的分叉点（FR-12）', () => {
  it('选择页返回它的分叉点，其余页面返回 null', () => {
    expect(forkOfChoosePage(data, 'choose-plan')).toBe('node-plan');
    expect(forkOfChoosePage(data, 'choose-phone')).toBe('phone');
    for (const id of ['preface', 'plan3-node', 'google-appeal', 'no-such-page']) expect(forkOfChoosePage(data, id)).toBeNull();
  });
});

describe('renderProgress：改写眉题、步数和读屏文字（FR-10，design §4.1，v2.2 D4、D10）', () => {
  const render = (at: string, choices: Record<string, string>, mode: 'operation' | 'principle') => {
    const slots = { eyebrow: { textContent: '' as string | null }, text: { textContent: '' as string | null } };
    renderProgress(slots, map.view(at, choices, mode));
    return { eyebrow: slots.eyebrow.textContent, text: slots.text.textContent };
  };

  it('眉题写“第 n 章 · 章名 · 第几步，共几步”；切换视图后重算：整体思路是原理独有步骤，清理旧账号在操作视图是第 2 步，原理视图是第 3 步', () => {
    expect(render('make-node', {}, 'operation')).toEqual({ eyebrow: '第 1 章 · 准备节点和住宅 IP · 第 2 步，共 6 步', text: '准备节点和住宅 IP，第 2 步，共 6 步' });
    expect(render('clean-up', {}, 'operation')).toEqual({ eyebrow: '第 0 章 · 开始 · 第 2 步，共 2 步', text: '开始，第 2 步，共 2 步' });
    expect(render('clean-up', {}, 'principle')).toEqual({ eyebrow: '第 0 章 · 开始 · 第 3 步，共 3 步', text: '开始，第 3 步，共 3 步' });
  });

  // v3 去掉了章节标题卡（FR-72）：章首页的眉题和别的页一样写全
  it('章首页的眉题也写全章号和章名', () => {
    expect(render('preface', {}, 'principle')).toEqual({ eyebrow: '第 0 章 · 开始 · 第 1 步，共 3 步', text: '开始，第 1 步，共 3 步' });
    expect(render('choose-plan', {}, 'principle')).toEqual({ eyebrow: '第 1 章 · 准备节点和住宅 IP · 选择', text: '准备节点和住宅 IP' });
  });

  it('改选分叉点后重算：没选时汇合点数不清第几步，选了之后有步数', () => {
    expect(render('import-proxy', {}, 'operation')).toEqual({ eyebrow: '第 1 章 · 准备节点和住宅 IP', text: '准备节点和住宅 IP' });
    expect(render('import-proxy', { 'node-plan': 'plan-3' }, 'operation')).toEqual({
      eyebrow: '第 1 章 · 准备节点和住宅 IP · 第 2 步，共 4 步',
      text: '准备节点和住宅 IP，第 2 步，共 4 步',
    });
  });

  it('附录页（本章唯一一页，也是章首页）：眉题和读屏都只写“附录”，不写“第 1 步，共 1 步”（W5 第 1 条）', () => {
    for (const mode of ['operation', 'principle'] as const) {
      expect(render('appendix', {}, mode)).toEqual({ eyebrow: '附录', text: '附录' });
    }
  });

  it('选择页写“选择”，旁支页写“旁支”，都不写步数', () => {
    expect(render('choose-plan', {}, 'operation')).toEqual({ eyebrow: '第 1 章 · 准备节点和住宅 IP · 选择', text: '准备节点和住宅 IP' });
    expect(render('google-appeal', {}, 'operation')).toEqual({ eyebrow: '第 2 章 · 注册和订阅 · 旁支', text: '注册和订阅 · 旁支' });
  });

  it('截图编号的步骤号随视图和选择改写；数不清、选择页只用序号（design §4.7）', () => {
    const figures = (at: string, choices: Record<string, string>, mode: 'operation' | 'principle') => {
      const list = [{ textContent: '' as string | null }, { textContent: '' as string | null }];
      renderProgress({ figures: list }, map.view(at, choices, mode));
      return list.map((f) => f.textContent);
    };
    expect(figures('clean-up', {}, 'operation')).toEqual(['02-', '02-']);
    expect(figures('clean-up', {}, 'principle')).toEqual(['03-', '03-']);
    expect(figures('import-proxy', {}, 'operation')).toEqual(['', '']);
    expect(figures('import-proxy', { 'node-plan': 'plan-3' }, 'operation')).toEqual(['02-', '02-']);
    expect(figures('choose-plan', {}, 'operation')).toEqual(['', '']);
  });

  it('挂载点缺了也不报错', () => {
    expect(() => renderProgress({}, map.view('preface', {}, 'operation'))).not.toThrow();
  });
});
