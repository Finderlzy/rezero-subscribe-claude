/**
 * M4 本机状态：读写分叉点选择和视图偏好（架构 §3 M4，FR-50）。
 *
 * 数据只存在读者本机，不发给任何服务器。适配器按 localStorage → `window.name` → 内存的顺序兜底：
 * 前一层不可用或读写抛异常时换到下一层，不报错（AC-18）。`window.name` 在同一标签页的同源跳转之间保留，
 * 本机存储被禁用时换页也能记住选择，读者不会在“订阅”绕回“选择手机系统”（评审 V11）。
 * 本模块不依赖路线模块 M2：选项是否仍在路线图里，由调用方通过 `ReaderStoreOptions` 传入的判断函数决定。
 */

// 与 M2 的同名类型含义一致；这里用字符串别名，避免 M4 依赖 M2。
export type ForkId = string;
export type OptionId = string;
export type Choices = Partial<Record<ForkId, OptionId>>;
export type View = 'operation' | 'principle';

export interface ReaderState {
  choices: Choices;
  view: View;
}

export interface ReaderStore {
  /** 读出当前状态；存储为空、不可用或格式不对时返回默认值。返回的是副本。 */
  read(): ReaderState;
  /** 合并写入：未出现在 patch 里（或值为 undefined）的字段保持不变；`choices` 按分叉点合并。 */
  write(patch: Partial<ReaderState>): void;
}

/** 有 `name` 的宿主，浏览器里就是 `window`。 */
export interface NameHost {
  name: string;
}

export interface ReaderStoreOptions {
  /** 某分叉点的某选项是否仍在路线图里；不传时接受任何非空字符串。 */
  isKnownChoice?: (fork: ForkId, option: OptionId) => boolean;
  /** localStorage 不可用时的第二层；不传或为 null 时直接用内存。 */
  nameHost?: NameHost | null;
}

export const READER_STATE_KEY = 'rezero-subscribe-claude:v2';
/** 写进 `window.name` 的值的前缀，后面接 JSON；不以它开头的 `window.name` 不是本站写的，当作空。 */
export const WINDOW_NAME_PREFIX = `${READER_STATE_KEY}=`;

// 视图字段暂留：用户 2026-10-22 决定页面固定原理视图后没有地方再写它、页面也不读它（架构 §13.12），
// 等单版本重写时连同操作版一起清理。
const DEFAULT_VIEW: View = 'operation';

/** 存储接缝：只关心本站这一个值。 */
interface Adapter {
  get(): string | null;
  set(value: string): void;
}

function localStorageAdapter(storage: Storage): Adapter {
  return {
    get: () => storage.getItem(READER_STATE_KEY),
    set: (v) => storage.setItem(READER_STATE_KEY, v),
  };
}

function windowNameAdapter(host: NameHost): Adapter {
  return {
    get: () => {
      const name = host.name;
      return name.startsWith(WINDOW_NAME_PREFIX) ? name.slice(WINDOW_NAME_PREFIX.length) : null;
    },
    set: (v) => {
      host.name = WINDOW_NAME_PREFIX + v;
    },
  };
}

function memoryAdapter(initial: string | null): Adapter {
  let value = initial;
  return {
    get: () => value,
    set: (v) => {
      value = v;
    },
  };
}

/**
 * 依次使用各层：当前层任何一次访问抛异常，就永久换到下一层，并在新的一层上重做这次操作。
 * 新的一层先写入最近一次成功读写的值，这样只是写入失败（如配额已满）时，已有选择不会丢；
 * 最近没有成功读写过时保留新一层原有的值（例如上一页写进 `window.name` 的选择）。最后一层是内存，不会抛异常。
 */
function layeredAdapter(layers: Adapter[]): Adapter {
  let lastKnown: string | null = null;
  let index = 0;

  const guard = <T>(op: (layer: Adapter) => T): T => {
    for (;;) {
      const layer = layers[index]!;
      try {
        return op(layer);
      } catch {
        index += 1;
        const next = layers[index]!;
        if (lastKnown !== null) {
          try {
            next.set(lastKnown);
          } catch {
            // 下一层也不可用：交给下一轮循环继续往下换
          }
        }
      }
    }
  };

  return {
    get: () =>
      guard((layer) => {
        const value = layer.get();
        lastKnown = value;
        return value;
      }),
    set: (v) =>
      guard((layer) => {
        layer.set(v);
        lastKnown = v;
      }),
  };
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
/** 不能用作分叉点标识的键：写进普通对象会触碰原型，一律丢掉。 */
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** 把任意输入整理成合法的 ReaderState：格式不对的字段或项丢掉，用默认值代替；其他字段（如 1.0.0 的 visited）忽略。 */
function normalize(input: unknown, options: ReaderStoreOptions): ReaderState {
  const src = isPlainObject(input) ? input : {};
  const state: ReaderState = {
    choices: {},
    view: src.view === 'operation' || src.view === 'principle' ? src.view : DEFAULT_VIEW,
  };

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
 * 页面脚本用 `createReaderStore(getLocalStorage(), { nameHost: getNameHost() })` 创建 store。
 */
export function getLocalStorage(scope: { localStorage?: Storage } = globalThis): Storage | null {
  try {
    return scope.localStorage ?? null;
  } catch {
    return null;
  }
}

/** 取浏览器的 `window` 作为 `window.name` 的宿主；没有 window（构建时的 Node）时返回 null。 */
export function getNameHost(scope: { window?: NameHost } = globalThis as { window?: NameHost }): NameHost | null {
  try {
    return typeof scope.window?.name === 'string' ? scope.window : null;
  } catch {
    return null;
  }
}

export function createReaderStore(storage: Storage | null, options: ReaderStoreOptions = {}): ReaderStore {
  const layers: Adapter[] = [];
  if (storage !== null) layers.push(localStorageAdapter(storage));
  if (options.nameHost) layers.push(windowNameAdapter(options.nameHost));
  layers.push(memoryAdapter(null));
  const adapter = layeredAdapter(layers);
  const read = (): ReaderState => normalize(parse(adapter.get()), options);

  return {
    read,
    write(patch) {
      const current = read();
      // patch 先单独整理：不合法的值被丢掉，于是对应字段保持原值。
      const valid = normalize(patch, options);
      const next: ReaderState = { ...current, choices: { ...current.choices, ...valid.choices } };
      // view 直接看 patch：normalize 会把缺失的 view 补成默认值，用 valid.view 会误覆盖原值。
      if (patch.view === 'operation' || patch.view === 'principle') next.view = patch.view;
      adapter.set(JSON.stringify(next));
    },
  };
}
