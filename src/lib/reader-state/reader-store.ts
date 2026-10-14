/**
 * M4 本机状态：读写阅读进度、路线选择、视图偏好和已读步骤（架构 §3 M4）。
 *
 * 数据只存在读者本机，不发给任何服务器。`localStorage` 不可用或读写抛异常时
 * 自动换成内存适配器，不报错（AC-18）。本模块不依赖路线模块 M2：标识是否仍在
 * 路线图里，由调用方通过 `ReaderStoreOptions` 传入的判断函数决定。
 */

// 与 M2 的同名类型含义一致；这里用字符串别名，避免 M4 依赖 M2。
export type StepId = string;
export type ForkId = string;
export type OptionId = string;
export type Choices = Partial<Record<ForkId, OptionId>>;
export type View = 'operation' | 'principle';

export interface ReaderState {
  lastStep?: StepId;
  choices: Choices;
  view: View;
  visited: StepId[];
}

export interface ReaderStore {
  /** 读出当前状态；存储为空、不可用或格式不对时返回默认值。返回的是副本。 */
  read(): ReaderState;
  /**
   * 合并写入：未出现在 patch 里（或值为 undefined）的字段保持不变；
   * `choices` 按分叉点合并，`visited` 与已有记录合并去重。
   */
  write(patch: Partial<ReaderState>): void;
  /** 清除进度：删除本站的键，之后 read() 返回默认值（FR-51）。 */
  clear(): void;
}

export interface ReaderStoreOptions {
  /** 步骤标识是否仍在路线图里；不传时接受任何非空字符串。 */
  isKnownStep?: (id: StepId) => boolean;
  /** 某分叉点的某选项是否仍在路线图里；不传时接受任何非空字符串。 */
  isKnownChoice?: (fork: ForkId, option: OptionId) => boolean;
}

export const READER_STATE_KEY = 'rezero-subscribe-claude:v1';

// 改默认视图或视图取值时，同步 view-boot.ts 里的内联脚本（它不能导入本模块）。
const DEFAULT_VIEW: View = 'operation';

/** 存储接缝：只关心本站这一个键。 */
interface Adapter {
  get(): string | null;
  set(value: string): void;
  remove(): void;
}

function memoryAdapter(initial: string | null = null): Adapter {
  let value = initial;
  return {
    get: () => value,
    set: (v) => {
      value = v;
    },
    remove: () => {
      value = null;
    },
  };
}

/**
 * 包一层 Storage：任何一次访问抛异常，就永久换成内存适配器，并在内存上重做这次操作。
 * 内存以最近一次成功读写的值为起点，这样只是写入失败（如配额已满）时，已有进度不会丢。
 */
function resilientAdapter(storage: Storage | null): Adapter {
  if (storage === null) return memoryAdapter();
  let lastKnown: string | null = null;
  let fallback: Adapter | null = null;

  const guard = <T>(viaStorage: () => T, viaMemory: (m: Adapter) => T): T => {
    if (fallback === null) {
      try {
        return viaStorage();
      } catch {
        fallback = memoryAdapter(lastKnown);
      }
    }
    return viaMemory(fallback);
  };

  return {
    get: () =>
      guard(
        () => (lastKnown = storage.getItem(READER_STATE_KEY)),
        (m) => m.get(),
      ),
    set: (v) =>
      guard(
        () => {
          storage.setItem(READER_STATE_KEY, v);
          lastKnown = v;
        },
        (m) => m.set(v),
      ),
    remove: () =>
      guard(
        () => {
          storage.removeItem(READER_STATE_KEY);
          lastKnown = null;
        },
        (m) => m.remove(),
      ),
  };
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
/** 不能用作分叉点标识的键：写进普通对象会触碰原型，一律丢掉。 */
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** 把任意输入整理成合法的 ReaderState：格式不对的字段或项丢掉，用默认值代替。 */
function normalize(input: unknown, options: ReaderStoreOptions): ReaderState {
  const src = isPlainObject(input) ? input : {};
  const knownStep = (id: unknown): id is StepId =>
    isNonEmptyString(id) && (options.isKnownStep?.(id) ?? true);

  const state: ReaderState = {
    choices: {},
    view: src.view === 'operation' || src.view === 'principle' ? src.view : DEFAULT_VIEW,
    visited: Array.isArray(src.visited) ? [...new Set(src.visited.filter(knownStep))] : [],
  };

  if (knownStep(src.lastStep)) state.lastStep = src.lastStep;

  if (isPlainObject(src.choices)) {
    for (const [fork, option] of Object.entries(src.choices)) {
      if (
        isNonEmptyString(fork) &&
        !RESERVED_KEYS.has(fork) &&
        isNonEmptyString(option) &&
        (options.isKnownChoice?.(fork, option) ?? true)
      ) {
        state.choices[fork] = option;
      }
    }
  }
  return state;
}

function parse(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 安全地取浏览器的 localStorage：没有 window、或访问它就抛异常（禁用存储）时返回 null。
 * 页面脚本用 `createReaderStore(getLocalStorage())` 创建 store。
 */
export function getLocalStorage(scope: { localStorage?: Storage } = globalThis): Storage | null {
  try {
    return scope.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createReaderStore(storage: Storage | null, options: ReaderStoreOptions = {}): ReaderStore {
  const adapter = resilientAdapter(storage);
  const read = (): ReaderState => normalize(parse(adapter.get()), options);

  return {
    read,
    write(patch) {
      const current = read();
      // patch 先单独整理：不合法的值被丢掉，于是对应字段保持原值。
      const valid = normalize(patch, options);
      const next: ReaderState = {
        ...current,
        choices: { ...current.choices, ...valid.choices },
        visited: [...new Set([...current.visited, ...valid.visited])],
      };
      if (valid.lastStep !== undefined) next.lastStep = valid.lastStep;
      // view 直接看 patch：normalize 会把缺失的 view 补成默认值，用 valid.view 会误覆盖原值。
      if (patch.view === 'operation' || patch.view === 'principle') next.view = patch.view;
      adapter.set(JSON.stringify(next));
    },
    clear() {
      adapter.remove();
    },
  };
}
