import { describe, expect, it } from 'vitest';
import { referenceReturn } from './reference-return';

const pages = { 'plan3-residential-node': '方案三：直接买住宅节点', 'choose-plan': '选择方案', 'google-appeal': '被封了：申诉解封' };

describe('reference-return：参考页按 ?from= 找回刚才的页面（FR-20）', () => {
  it('from 是路线图里的页面时，返回它的标识和标题', () => {
    expect(referenceReturn('?from=plan3-residential-node', pages)).toEqual({ id: 'plan3-residential-node', title: '方案三：直接买住宅节点' });
    expect(referenceReturn('?x=1&from=choose-plan', pages)).toEqual({ id: 'choose-plan', title: '选择方案' });
  });

  it('选择页、旁支页和步骤共用一个标识空间，都能返回', () => {
    expect(referenceReturn('?from=google-appeal', pages)).toEqual({ id: 'google-appeal', title: '被封了：申诉解封' });
  });

  it('直接打开（没有 from）时没有返回目标', () => {
    expect(referenceReturn('', pages)).toBeNull();
    expect(referenceReturn('?from=', pages)).toBeNull();
  });

  it('from 不是已知页面时不给返回链接，不拼出指向任意地址的链接', () => {
    expect(referenceReturn('?from=no-such-step', pages)).toBeNull();
    expect(referenceReturn('?from=https%3A%2F%2Fexample.com', pages)).toBeNull();
    expect(referenceReturn('?from=faq', pages)).toBeNull();
    expect(referenceReturn('?from=__proto__', pages)).toBeNull();
    expect(referenceReturn('?from=toString', pages)).toBeNull();
  });
});
