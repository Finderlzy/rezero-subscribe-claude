import { describe, expect, it } from 'vitest';
import { samplePages, sampleSpec } from '../lib/route/fixtures/sample-route';
import { buildRouteMap } from '../lib/route/route-map';
import { openPatch } from './route-enhance';

const { data } = buildRouteMap(sampleSpec(), samplePages());

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
