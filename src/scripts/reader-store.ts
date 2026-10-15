import {
  createReaderStore,
  getLocalStorage,
  getNameHost,
  type ReaderStore,
  type ReaderStoreOptions,
} from '../lib/reader-state/reader-store';
import type { RouteData } from '../lib/route/types';

/**
 * 页面脚本共用的本机状态（架构 §3 M4）：route-enhance、view-toggle（以及之后的目录、选择页脚本）
 * 都从这里取 ReaderStore，并用这里的事件名互相通知。
 */

/** M4 用来过滤失效选择的判断：只认路线图里现有的分叉点和选项。 */
export function readerStoreOptions(data: RouteData): Pick<ReaderStoreOptions, 'isKnownChoice'> {
  return {
    isKnownChoice: (fork, option) =>
      Object.hasOwn(data.forks, fork) && data.forks[fork]!.options.some((o) => o.id === option),
  };
}

/**
 * 读出页面内嵌的 RouteData（PageLayout 写出的 `#route-data`）；没有或格式不对时返回 null，
 * 让页面上的其他脚本照常运行。一页只解析一次，结果交给 store 和 route-enhance 共用。
 */
export function readRouteData(doc: Document): RouteData | null {
  const text = doc.getElementById('route-data')?.textContent;
  if (!text) return null;
  try {
    return JSON.parse(text) as RouteData;
  } catch {
    return null;
  }
}

let pageStore: ReaderStore | null = null;

/**
 * 一页只用一个 ReaderStore：本机存储不可用、又退到内存时，各脚本各建一个就看不到彼此的写入。
 * `data` 用来过滤失效选择；没有路线数据的页面（参考页、找不到页）传 null，不过滤，
 * 读出的选择交给 M2 时它会再忽略失效项。第一次调用之后忽略 `data`。
 */
export function pageReaderStore(data: RouteData | null): ReaderStore {
  pageStore ??= createReaderStore(getLocalStorage(), {
    ...(data ? readerStoreOptions(data) : {}),
    nameHost: getNameHost(),
  });
  return pageStore;
}

/**
 * 在选择页或目录里改了选择后，在 document 上派发；route-enhance 收到后按新选择重算导航（不再写入本机状态）。
 */
export const CHOICES_CHANGED_EVENT = 'reader-choices-changed';

/** 切换视图后由 view-toggle 在 document 上派发；route-enhance 收到后按新视图重算导航（FR-11）。 */
export const VIEW_CHANGED_EVENT = 'reader-view-changed';
