import { describe, expect, it } from 'vitest';
import {
  createReaderStore,
  getLocalStorage,
  getNameHost,
  READER_STATE_KEY,
  WINDOW_NAME_PREFIX,
  type NameHost,
  type ReaderState,
} from './reader-store';

const DEFAULT_STATE: ReaderState = { choices: {}, view: 'operation' };

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

/** `window` 的替身：只有 name。 */
const fakeWindow = (name = ''): NameHost => ({ name });

describe('createReaderStore：默认值', () => {
  it('空存储时 read() 返回默认值', () => {
    expect(createReaderStore(fakeStorage()).read()).toEqual(DEFAULT_STATE);
  });

  it('使用约定的键 rezero-subscribe-claude:v2，值是 JSON，只有 choices 和 view', () => {
    const storage = fakeStorage();
    createReaderStore(storage).write({ choices: { phone: 'iphone' } });
    expect(READER_STATE_KEY).toBe('rezero-subscribe-claude:v2');
    expect(JSON.parse(storage.data.get(READER_STATE_KEY)!)).toEqual({ choices: { phone: 'iphone' }, view: 'operation' });
  });

  it('不读 1.0.0 的 :v1 键', () => {
    const storage = fakeStorage();
    storage.setItem('rezero-subscribe-claude:v1', JSON.stringify({ choices: { phone: 'iphone' }, view: 'principle' }));
    expect(createReaderStore(storage).read()).toEqual(DEFAULT_STATE);
  });
});

describe('createReaderStore：三种适配器（localStorage → window.name → 内存）', () => {
  it('localStorage 可用时只用它，不碰 window.name', () => {
    const storage = fakeStorage();
    const win = fakeWindow('别的页面留下的值');
    createReaderStore(storage, { nameHost: win }).write({ view: 'principle' });
    expect(JSON.parse(storage.data.get(READER_STATE_KEY)!)).toMatchObject({ view: 'principle' });
    expect(win.name).toBe('别的页面留下的值');
  });

  it('localStorage 为空时不去读 window.name', () => {
    const win = fakeWindow(`${WINDOW_NAME_PREFIX}${JSON.stringify({ view: 'principle' })}`);
    expect(createReaderStore(fakeStorage(), { nameHost: win }).read()).toEqual(DEFAULT_STATE);
  });

  it('storage 为 null 时写进 window.name（带前缀的 JSON），换页后新建的 store 能读回（AC-18）', () => {
    const win = fakeWindow();
    createReaderStore(null, { nameHost: win }).write({ choices: { phone: 'iphone' }, view: 'principle' });
    expect(win.name.startsWith(WINDOW_NAME_PREFIX)).toBe(true);
    expect(JSON.parse(win.name.slice(WINDOW_NAME_PREFIX.length))).toEqual({ choices: { phone: 'iphone' }, view: 'principle' });
    // 同一标签页里跳到下一页：window 还是同一个，store 重新创建
    expect(createReaderStore(null, { nameHost: win }).read()).toEqual({ choices: { phone: 'iphone' }, view: 'principle' });
  });

  it('localStorage 读写都抛异常时换成 window.name', () => {
    const win = fakeWindow();
    createReaderStore(throwingStorage('all'), { nameHost: win }).write({ choices: { 'node-plan': 'plan-3' } });
    expect(createReaderStore(throwingStorage('all'), { nameHost: win }).read().choices).toEqual({ 'node-plan': 'plan-3' });
  });

  it('访问 localStorage 本身就抛异常时换成 window.name', () => {
    const win = fakeWindow();
    const scope = {
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
    };
    createReaderStore(getLocalStorage(scope), { nameHost: win }).write({ view: 'principle' });
    expect(createReaderStore(getLocalStorage(scope), { nameHost: win }).read().view).toBe('principle');
  });

  it('window.name 里不是本站的值时当作空，写入时覆盖', () => {
    const win = fakeWindow('{"view":"principle"}');
    const store = createReaderStore(null, { nameHost: win });
    expect(store.read()).toEqual(DEFAULT_STATE);
    store.write({ choices: { phone: 'android' } });
    expect(win.name.startsWith(WINDOW_NAME_PREFIX)).toBe(true);
  });

  it('window.name 带前缀但内容不是 JSON 时返回默认值', () => {
    expect(createReaderStore(null, { nameHost: fakeWindow(`${WINDOW_NAME_PREFIX}{oops`) }).read()).toEqual(DEFAULT_STATE);
  });

  it('没有 window.name 可用时用内存：本 store 内读写正常，新建的 store 看不到', () => {
    const store = createReaderStore(null);
    expect(store.read()).toEqual(DEFAULT_STATE);
    store.write({ choices: { phone: 'iphone' }, view: 'principle' });
    expect(store.read()).toEqual({ choices: { phone: 'iphone' }, view: 'principle' });
    expect(createReaderStore(null).read()).toEqual(DEFAULT_STATE);
  });

  it('window.name 读写也抛异常时换成内存，不报错', () => {
    const hostile: NameHost = {
      get name(): string {
        throw new Error('denied');
      },
      set name(_: string) {
        throw new Error('denied');
      },
    };
    const store = createReaderStore(throwingStorage('all'), { nameHost: hostile });
    expect(() => store.write({ view: 'principle' })).not.toThrow();
    expect(store.read().view).toBe('principle');
  });

  it('只有 setItem 抛异常（配额已满）时，已写入的内容仍能读回', () => {
    const store = createReaderStore(throwingStorage('set'), { nameHost: fakeWindow() });
    expect(() => store.write({ view: 'principle', choices: { f: 'o' } })).not.toThrow();
    expect(store.read()).toEqual({ view: 'principle', choices: { f: 'o' } });
  });

  it('换到下一层时以最近一次成功读到的值为起点，已有选择不丢', () => {
    const storage = fakeStorage(JSON.stringify({ choices: { phone: 'iphone' } }));
    let broken = false;
    const flaky: Storage = {
      ...storage,
      getItem: (k) => storage.getItem(k),
      setItem: (k, v) => {
        if (broken) throw new DOMException('quota', 'QuotaExceededError');
        storage.setItem(k, v);
      },
    };
    const win = fakeWindow();
    const store = createReaderStore(flaky, { nameHost: win });
    expect(store.read().choices).toEqual({ phone: 'iphone' });
    broken = true;
    store.write({ view: 'principle' });
    expect(store.read()).toEqual({ choices: { phone: 'iphone' }, view: 'principle' });
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
    const raw = JSON.stringify({ choices: 'plan-1', view: 'principle' });
    expect(createReaderStore(fakeStorage(raw)).read()).toEqual({ choices: {}, view: 'principle' });
  });

  it('1.0.0 的 lastStep、visited 字段被丢掉', () => {
    const raw = JSON.stringify({ lastStep: 'dns', visited: ['dns'], choices: { phone: 'iphone' } });
    expect(createReaderStore(fakeStorage(raw)).read()).toEqual({ choices: { phone: 'iphone' }, view: 'operation' });
  });

  it('choices 里值不是字符串的项被丢掉，其余保留', () => {
    const raw = JSON.stringify({ choices: { 'node-plan': 'plan-3', 'pc-client': 1, phone: null } });
    expect(createReaderStore(fakeStorage(raw)).read().choices).toEqual({ 'node-plan': 'plan-3' });
  });

  it('choices 是数组时丢掉该字段', () => {
    const raw = JSON.stringify({ choices: ['plan-3'] });
    expect(createReaderStore(fakeStorage(raw)).read().choices).toEqual({});
  });

  it.each(['why', 'Principle', '', 1, null])('view 不是两个合法值之一（%j）时用默认的操作视图', (view) => {
    const raw = JSON.stringify({ view, choices: { phone: 'iphone' } });
    expect(createReaderStore(fakeStorage(raw)).read()).toEqual({ view: 'operation', choices: { phone: 'iphone' } });
  });

  it('view 为 principle 时原样读出', () => {
    expect(createReaderStore(fakeStorage(JSON.stringify({ view: 'principle' }))).read().view).toBe('principle');
  });
});

describe('createReaderStore：write 是合并而不是覆盖', () => {
  it('只写一个字段时其他字段保留', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ choices: { phone: 'iphone' }, view: 'principle' });
    store.write({ view: 'operation' });
    expect(store.read()).toEqual({ choices: { phone: 'iphone' }, view: 'operation' });
  });

  it('choices 按分叉点合并：写一个分叉点不影响其他分叉点', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ choices: { 'node-plan': 'plan-1', phone: 'iphone' } });
    store.write({ choices: { 'node-plan': 'plan-3' } });
    expect(store.read().choices).toEqual({ 'node-plan': 'plan-3', phone: 'iphone' });
  });

  it('patch 里值为 undefined 的顶层字段被忽略', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ choices: { phone: 'iphone' }, view: 'principle' });
    store.write({ choices: undefined, view: undefined });
    expect(store.read()).toEqual({ choices: { phone: 'iphone' }, view: 'principle' });
  });

  it('写入在同一存储上新建的 store 中可读回（持久化）', () => {
    const storage = fakeStorage();
    createReaderStore(storage).write({ choices: { 'node-plan': 'plan-3' } });
    expect(createReaderStore(storage).read().choices).toEqual({ 'node-plan': 'plan-3' });
  });

  it('在格式不对的旧值上写入时，先按默认值修复再合并', () => {
    const storage = fakeStorage('garbage');
    createReaderStore(storage).write({ view: 'principle' });
    expect(JSON.parse(storage.data.get(READER_STATE_KEY)!)).toEqual({ choices: {}, view: 'principle' });
  });

  it('写入不合法的值时不会存进去，该字段保持原值', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ view: 'principle', choices: { f: 'o' } });
    store.write({ view: 'why' as never, choices: { f: 7 as never, g: 'p' } });
    expect(store.read()).toEqual({ view: 'principle', choices: { f: 'o', g: 'p' } });
  });
});

describe('createReaderStore：恶意或异常的键', () => {
  it('choices 里的 __proto__、constructor、prototype 键被丢掉，不污染原型', () => {
    const raw = '{"choices":{"__proto__":"x","constructor":"y","prototype":"z","node-plan":"plan-1"}}';
    const store = createReaderStore(fakeStorage(raw));
    const state = store.read();
    expect(state.choices).toEqual({ 'node-plan': 'plan-1' });
    expect(Object.keys(state.choices)).toEqual(['node-plan']);
    expect(Object.getPrototypeOf(state.choices)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).x).toBeUndefined();

    store.write({ choices: JSON.parse('{"__proto__":"evil","constructor":"evil"}') });
    expect(store.read().choices).toEqual({ 'node-plan': 'plan-1' });
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'evil')).toBe(false);
  });
});

describe('createReaderStore：失效项过滤（调用方传入，不依赖路线模块）', () => {
  const known = {
    isKnownChoice: (fork: string, option: string) => fork === 'node-plan' && ['plan-1', 'plan-3'].includes(option),
  };

  it('不在路线图里的分叉点或选项被丢掉', () => {
    const raw = JSON.stringify({ choices: { 'node-plan': 'plan-3', 'old-fork': 'x', 'node-plan-typo': 'plan-1' } });
    expect(createReaderStore(fakeStorage(raw), known).read()).toEqual({ choices: { 'node-plan': 'plan-3' }, view: 'operation' });
  });

  it('分叉点存在但选项已删除时丢掉该选择', () => {
    const raw = JSON.stringify({ choices: { 'node-plan': 'plan-2' } });
    expect(createReaderStore(fakeStorage(raw), known).read().choices).toEqual({});
  });

  it('window.name 里读出的值同样过滤', () => {
    const win = fakeWindow(`${WINDOW_NAME_PREFIX}${JSON.stringify({ choices: { 'node-plan': 'plan-2', phone: 'iphone' } })}`);
    expect(createReaderStore(null, { ...known, nameHost: win }).read().choices).toEqual({});
  });

  it('没有传过滤函数时接受任何非空字符串标识', () => {
    const raw = JSON.stringify({ choices: { f: 'o' } });
    expect(createReaderStore(fakeStorage(raw)).read().choices).toEqual({ f: 'o' });
  });

  it('过滤函数也作用于写入', () => {
    const store = createReaderStore(fakeStorage(), known);
    store.write({ choices: { 'node-plan': 'plan-9' } });
    expect(store.read()).toEqual(DEFAULT_STATE);
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

describe('getNameHost', () => {
  it('有 window.name 时返回 window', () => {
    const win = fakeWindow('x');
    expect(getNameHost({ window: win })).toBe(win);
  });

  it('没有 window（如构建时的 Node）时返回 null', () => {
    expect(getNameHost({})).toBeNull();
  });
});

describe('createReaderStore：read 返回的是副本', () => {
  it('修改 read() 的结果不影响存储', () => {
    const store = createReaderStore(fakeStorage());
    store.write({ choices: { f: 'o' } });
    store.read().choices.f = 'changed';
    expect(store.read().choices).toEqual({ f: 'o' });
  });
});
