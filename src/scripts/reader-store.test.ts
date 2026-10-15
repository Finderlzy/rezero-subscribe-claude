import { describe, expect, it } from 'vitest';
import { samplePages, sampleSpec } from '../lib/route/fixtures/sample-route';
import { buildRouteMap } from '../lib/route/route-map';
import type { RouteData } from '../lib/route/types';
import { readerStoreOptions, readRouteData } from './reader-store';

const { data } = buildRouteMap(sampleSpec(), samplePages());

describe('readerStoreOptions：本机保存的选择要仍在路线图里', () => {
  const options = readerStoreOptions(data);

  it('认得分叉点的选项，不认得不存在的选项或分叉点', () => {
    expect(options.isKnownChoice?.('node-plan', 'plan-2')).toBe(true);
    expect(options.isKnownChoice?.('node-plan', 'plan-9')).toBe(false);
    expect(options.isKnownChoice?.('no-such-fork', 'plan-1')).toBe(false);
  });

  it('原型上的键不算标识', () => {
    expect(options.isKnownChoice?.('constructor', 'plan-1')).toBe(false);
    expect(options.isKnownChoice?.('node-plan', 'constructor')).toBe(false);
  });
});

describe('readRouteData：读出页面内嵌的路线数据', () => {
  /** 只有 getElementById 的 Document 替身 */
  const docWith = (text: string | null) =>
    ({ getElementById: (id: string) => (id === 'route-data' && text !== null ? { textContent: text } : null) }) as unknown as Document;

  it('原样读出 JSON', () => {
    expect(readRouteData(docWith(JSON.stringify(data)))).toEqual<RouteData>(data);
  });

  it('没有 #route-data、内容为空或不是 JSON 时返回 null，不抛异常', () => {
    expect(readRouteData(docWith(null))).toBeNull();
    expect(readRouteData(docWith(''))).toBeNull();
    expect(readRouteData(docWith('{oops'))).toBeNull();
  });
});
