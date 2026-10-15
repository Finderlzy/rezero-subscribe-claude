import { describe, expect, it } from 'vitest';
import { faqReturn } from './faq-return';

const steps = { 'run-script': '运行脚本', 'plan3-buy-node': '购买住宅节点' };

describe('faq-return：常见问题页按 ?from= 找回刚才的步骤（FR-20）', () => {
  it('from 是已知步骤时，返回它的标识和标题', () => {
    expect(faqReturn('?from=run-script', steps)).toEqual({ id: 'run-script', title: '运行脚本' });
    expect(faqReturn('?x=1&from=plan3-buy-node', steps)).toEqual({ id: 'plan3-buy-node', title: '购买住宅节点' });
  });

  it('直接打开（没有 from）时没有返回目标', () => {
    expect(faqReturn('', steps)).toBeNull();
    expect(faqReturn('?from=', steps)).toBeNull();
  });

  it('from 不是已知步骤时不给返回链接，不拼出指向任意地址的链接', () => {
    expect(faqReturn('?from=no-such-step', steps)).toBeNull();
    expect(faqReturn('?from=https%3A%2F%2Fexample.com', steps)).toBeNull();
    expect(faqReturn('?from=__proto__', steps)).toBeNull();
    expect(faqReturn('?from=toString', steps)).toBeNull();
  });
});
