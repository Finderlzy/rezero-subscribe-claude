import { describe, expect, it } from 'vitest';
import { createReaderStore, getLocalStorage, READER_STATE_KEY, type ReaderState } from './reader-store';

const DEFAULT_STATE: ReaderState = { choices: {}, view: 'operation', visited: [] };

/** 最小的 Storage 替身：只实现本模块用到的方法，可以预置内容。 */
function fakeStorage(initial?: string): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(READER_STATE_KEY, initial);
  return {
    data,
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, String(v));
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
    clear: () => data.clear(),
  };
}

/** 每个方法都抛异常的 Storage，模拟无痕模式或禁用存储。 */
function throwingStorage(which: 'all' | 'set' = 'all'): Storage {
  const s = fakeStorage();
  const boom = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  return {
    ...s,
    getItem: which === 'all' ? boom : s.getItem,
    setItem: boom,
    removeItem: which === 'all' ? boom : s.removeItem,
  };
}

describe('createReaderStore：默认值', () => {
  it('空存储时 read() 返回默认值', () => {
    expect(createReaderStore(fakeStorage()).read()).toEqual(DEFAULT_STATE);
  });

  it('使用约定的键 rezero-subscribe-claude:v1，值是 JSON', () => {
    const storage = fakeStorage();
    createReaderStore(storage).write({ lastStep: 'dns' });
    expect(READER_STATE_KEY).toBe('rezero-subscribe-claude:v1');
    expect(JSON.parse(storage.data.get(READER_STATE_KEY)!)).toMatchObject({ lastStep: 'dns' });
  });
});

describe('createReaderStore：存储不可用', () => {
  it('storage 为 null 时用内存适配器，读写正常', () => {
    const store = createReaderStore(null);
    expect(store.read()).toEqual(DEFAULT_STATE);
    store.write({ lastStep: 'dns', view: 'principle' });
    expect(store.read()).toMatchObject({ lastStep: 'dns', view: 'principle' });
    store.clear();
    expect(store.read()).toEqual(DEFAULT_STATE);
  });

  it('getItem/setItem/removeItem 都抛异常时不报错，换成内存适配器', () => {
    const store = createReaderStore(throwingStorage('all'));
    expect(() => store.read()).not.toThrow();
    expect(store.read()).toEqual(DEFAULT_STATE);
    expect(() => store.write({ lastStep: 'dns' })).not.toThrow();
    expect(store.read().lastStep).toBe('dns');
    expect(() => store.clear()).not.toThrow();
    expect(store.read()).toEqual(DEFAULT_STATE);
  });

  it('只有 setItem 抛异常（配额已满）时，已写入的内容仍能读回', () => {
    const store = createReaderStore(throwingStorage('set'));
    expect(() => store.write({ view: 'principle', visited: ['a'] })).not.toThrow();
    expect(store.read()).toMatchObject({ view: 'principle', visited: ['a'] });
  });

  it('访问 storage 本身就抛异常（读取 window.localStorage 被拒）时也不报错', () => {
    const hostile = new Proxy({} as Storage, {
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    const store = createReaderStore(hostile);
    expect(store.read()).toEqual(DEFAULT_STATE);
    store.write({ lastStep: 'dns' });
    expect(store.read().lastStep).toBe('dns');
  });
});

describe('createReaderStore：读出的数据格式不对', () => {
  it.each(['not json', '{', '', 'undefined'])('值不是 JSON（%j）时返回默认值', (raw) => {
    expect(createReaderStore(fakeStorage(raw)).read()).toEqual(DEFAULT_STATE);
  });

  it.each(['null', '42', '"text"', '[1,2]', 'true'])('值是 JSON 但不是对象（%s）时返回默认值', (raw) => {
    expect(createReaderStore(fakeStorage(raw)).read()).toEqual(DEFAULT_STATE);
  });

  it('字段类型不对时只丢该字段，其他字段保留', () => {
    const raw = JSON.stringify({ lastStep: 42, choices: 'plan-1', view: 'principle', visited: ['a', 'b'] });
    expect(createReaderStore(fakeStorage(raw)).read()).toEqual({
      choices: {},
      view: 'principle',
      visited: ['a', 'b'],
    });
  });

  it('visited 不是数组时丢掉，lastStep 和 choices 保留', () => {
    const raw = JSON.stringify({ lastStep: 'dns', choices: { 'node-plan': 'plan-3' }, visited: 'dns' });
    expect(createReaderStore(fakeStorage(raw)).read()).toEqual({
      lastStep: 'dns',
      choices: { 'node-plan': 'plan-3' },
      view: 'operation',
      visited: [],
    });
  });

  it('choices 里值不是字符串的项被丢掉，其余保留', () => {
    const raw = JSON.stringify({ choices: { 'node-plan': 'plan-3', 'pc-client': 1, phone: null } });
    expect(createReaderStore(fakeStorage(raw)).read().choices).toEqual({ 'node-plan': 'plan-3' });
  });

  it('choices 是数组时丢掉该字段', () => {
    const raw = JSON.stringify({ choices: ['plan-3'] });
    expect(createReaderStore(fakeStorage(raw)).read().choices).toEqual({});
  });

  it('lastStep 为空字符串时丢掉', () => {
    expect(createReaderStore(fakeStorage(JSON.stringify({ lastStep: '' }))).read().lastStep).toBeUndefined();
  });

  it('visited 里的非字符串项被丢掉', () => {
    const raw = JSON.stringify({ visited: ['a', 1, null, 'b', {}] });
    expect(createReaderStore(fakeStorage(raw)).read().visited).toEqual(['a', 'b']);
  });

  it.each(['why', 'Principle', '', 1, null])('view 不是两个合法值之一（%j）时用默认的操作视图', (view) => {
    const raw = JSON.stringify({ view, lastStep: 'dns' });
    expect(createReaderStore(fakeStorage(raw)).read()).toMatchObject({ view: 'operation', lastStep: 'dns' });
  });

  it('view 为 principle 时原样读出', () => {
    expect(createReaderStore(fakeStorage(JSON.stringify({ view: 'principle' }))).read().view).toBe('principle');
  });
});

describe('createReaderStore：visited 去重', () => {
  it('读出时去重并保留首次出现的顺序', () => {
    const raw = JSON.stringify({ visited: ['a', 'b', 'a', 'c', 'b'] });
    expect(createReaderStore(fakeStorage(raw)).read().visited).toEqual(['a', 'b', 'c']);
  });

  it('写入时与已有记录合并去重', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ visited: ['a', 'b'] });
    store.write({ visited: ['b', 'c', 'c'] });
    expect(store.read().visited).toEqual(['a', 'b', 'c']);
  });
});

describe('createReaderStore：write 是合并而不是覆盖', () => {
  it('只写一个字段时其他字段保留', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ lastStep: 'dns', view: 'principle', visited: ['dns'] });
    store.write({ lastStep: 'ip-check' });
    expect(store.read()).toEqual({
      lastStep: 'ip-check',
      choices: {},
      view: 'principle',
      visited: ['dns'],
    });
  });

  it('choices 按分叉点合并：写一个分叉点不影响其他分叉点', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ choices: { 'node-plan': 'plan-1', phone: 'iphone' } });
    store.write({ choices: { 'node-plan': 'plan-3' } });
    expect(store.read().choices).toEqual({ 'node-plan': 'plan-3', phone: 'iphone' });
  });

  it('patch 里值为 undefined 的顶层字段被忽略', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ lastStep: 'dns', view: 'principle' });
    store.write({ lastStep: undefined, view: undefined });
    expect(store.read()).toMatchObject({ lastStep: 'dns', view: 'principle' });
  });

  it('写入在同一存储上新建的 store 中可读回（持久化）', () => {
    const storage = fakeStorage();
    createReaderStore(storage).write({ lastStep: 'dns', choices: { 'node-plan': 'plan-3' } });
    expect(createReaderStore(storage).read()).toMatchObject({
      lastStep: 'dns',
      choices: { 'node-plan': 'plan-3' },
    });
  });

  it('在格式不对的旧值上写入时，先按默认值修复再合并', () => {
    const storage = fakeStorage('garbage');
    createReaderStore(storage).write({ view: 'principle' });
    expect(JSON.parse(storage.data.get(READER_STATE_KEY)!)).toEqual({
      choices: {},
      view: 'principle',
      visited: [],
    });
  });

  it('写入不合法的值时不会存进去，该字段保持原值', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ lastStep: 'dns', view: 'principle', choices: { f: 'o' } });
    store.write({
      lastStep: 42 as never,
      view: 'why' as never,
      visited: [1 as never, 'a'],
      choices: { f: 7 as never, g: 'p' },
    });
    expect(store.read()).toEqual({ lastStep: 'dns', view: 'principle', visited: ['a'], choices: { f: 'o', g: 'p' } });
  });
});

describe('createReaderStore：clear', () => {
  it('clear() 后 read() 返回默认值，且存储里的键被删除', () => {
    const storage = fakeStorage();
    const store = createReaderStore(storage);
    store.write({ lastStep: 'dns', choices: { 'node-plan': 'plan-3' }, view: 'principle', visited: ['dns'] });
    store.clear();
    expect(store.read()).toEqual(DEFAULT_STATE);
    expect(storage.data.has(READER_STATE_KEY)).toBe(false);
  });

  it('clear() 只删除本站的键，不动其他键', () => {
    const storage = fakeStorage();
    storage.setItem('other-site', 'keep');
    const store = createReaderStore(storage);
    store.write({ lastStep: 'dns' });
    store.clear();
    expect(storage.getItem('other-site')).toBe('keep');
  });
});

describe('createReaderStore：标识过滤（调用方传入，不依赖路线模块）', () => {
  const known = {
    isKnownStep: (id: string) => ['dns', 'ip-check'].includes(id),
    isKnownChoice: (fork: string, option: string) => fork === 'node-plan' && ['plan-1', 'plan-3'].includes(option),
  };

  it('不在路线图里的 lastStep、visited 项、choices 项被丢掉', () => {
    const raw = JSON.stringify({
      lastStep: 'removed-step',
      choices: { 'node-plan': 'plan-3', 'old-fork': 'x', 'node-plan-typo': 'plan-1' },
      visited: ['dns', 'removed-step', 'ip-check'],
    });
    expect(createReaderStore(fakeStorage(raw), known).read()).toEqual({
      choices: { 'node-plan': 'plan-3' },
      view: 'operation',
      visited: ['dns', 'ip-check'],
    });
  });

  it('分叉点存在但选项已删除时丢掉该选择', () => {
    const raw = JSON.stringify({ choices: { 'node-plan': 'plan-2' } });
    expect(createReaderStore(fakeStorage(raw), known).read().choices).toEqual({});
  });

  it('没有传过滤函数时接受任何非空字符串标识', () => {
    const raw = JSON.stringify({ lastStep: 'anything', visited: ['x'], choices: { f: 'o' } });
    expect(createReaderStore(fakeStorage(raw)).read()).toMatchObject({
      lastStep: 'anything',
      visited: ['x'],
      choices: { f: 'o' },
    });
  });

  it('过滤函数也作用于写入', () => {
    const store = createReaderStore(fakeStorage(), known);
    store.write({ lastStep: 'removed-step', visited: ['dns', 'nope'], choices: { 'node-plan': 'plan-9' } });
    expect(store.read()).toEqual({ choices: {}, view: 'operation', visited: ['dns'] });
  });
});

describe('getLocalStorage', () => {
  it('有 localStorage 时原样返回', () => {
    const storage = fakeStorage();
    expect(getLocalStorage({ localStorage: storage })).toBe(storage);
  });

  it('没有 localStorage（如构建时的 Node）时返回 null', () => {
    expect(getLocalStorage({})).toBeNull();
  });

  it('访问 localStorage 就抛异常（禁用存储）时返回 null，不报错', () => {
    const scope = {
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
    };
    expect(getLocalStorage(scope)).toBeNull();
    expect(createReaderStore(getLocalStorage(scope)).read()).toEqual(DEFAULT_STATE);
  });
});

describe('createReaderStore：read 返回的是副本', () => {
  it('修改 read() 的结果不影响存储', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ visited: ['a'], choices: { f: 'o' } });
    const s = store.read();
    s.visited.push('b');
    s.choices.f = 'changed';
    expect(store.read()).toMatchObject({ visited: ['a'], choices: { f: 'o' } });
  });
});
