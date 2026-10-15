import {
  createReaderStore,
  getLocalStorage,
  type ReaderStore,
  type ReaderStoreOptions,
} from '../lib/reader-state/reader-store';
import type { RouteData } from '../lib/route/types';

/**
 * 页面脚本共用的本机状态（架构 §3 M4）：route-enhance 和目录脚本都从这里取 ReaderStore，
 * 常见问题页、找不到页只运行目录脚本，不用依赖 route-enhance。
 */

/** M4 用来过滤失效标识的判断：只认路线图里现有的步骤和选项。 */
export function readerStoreOptions(data: RouteData): ReaderStoreOptions {
  return {
    isKnownStep: (id) => Object.hasOwn(data.steps, id),
    isKnownChoice: (fork, option) =>
      Object.hasOwn(data.forks, fork) && data.forks[fork]!.options.some((o) => o.id === option),
  };
}

let pageStore: ReaderStore | null = null;

/**
 * 一页只用一个 ReaderStore：本机存储不可用时 M4 换成内存，各脚本各建一个就看不到彼此的写入
 * （例如在目录里“切换”后，导航读不到新选择）。一页只内嵌一份 RouteData，所以第一次调用之后忽略 `data`。
 */
export function readerStoreFor(data: RouteData): ReaderStore {
  pageStore ??= createReaderStore(getLocalStorage(), readerStoreOptions(data));
  return pageStore;
}

/** “清除进度”前的确认文字；目录和完成页共用（FR-51）。 */
export const CLEAR_PROGRESS_CONFIRM = '清除本机保存的阅读进度和路线选择？';

/**
 * 在目录里改了选择、或在目录/完成页清除了进度后派发；route-enhance 收到后按新选择重画导航
 * （不再写入本机状态），目录收到后重画。
 */
export const CHOICES_CHANGED_EVENT = 'reader-choices-changed';
