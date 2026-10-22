import { describe, expect, it } from 'vitest';
import { MOVED_BOOT_SCRIPT } from './moved';
import { READER_STATE_KEY, WINDOW_NAME_PREFIX } from './reader-state/reader-store';

/**
 * 跳转页按本机选择分流的内联脚本（FR-25、ADR-0006、实施计划 §3.1）：页面写出兜底去向和各个选项的去向，
 * 脚本读 M4 里存的选择换成对应分支。用假的 document / localStorage / window / location 运行脚本本身，
 * 和 `view-boot.test.ts` 一样，测的就是内联到 `<head>` 的那段代码。
 */
const data = {
  fork: 'phone',
  options: { iphone: '/iphone-gmail/', android: '/android-gmail/' },
  fallback: '/choose-phone/',
};

interface Env {
  /** `<script id="moved-data">` 的内容；null 表示页面上没有这个元素 */
  json?: string | null;
  /** localStorage 里的 M4 值；`throwOnRead` 模拟存储被禁用 */
  stored?: string | null;
  throwOnRead?: boolean;
  /** `window.name` 里的 M4 值（第二层兜底） */
  windowName?: string;
}

function run({ json = JSON.stringify(data), stored = null, throwOnRead = false, windowName = '' }: Env = {}): string[] {
  const replaced: string[] = [];
  const document = { getElementById: (id: string) => (id === 'moved-data' && json !== null ? { textContent: json } : null) };
  const localStorage = {
    getItem: (key: string) => {
      if (throwOnRead) throw new Error('storage disabled');
      return key === READER_STATE_KEY ? stored : null;
    },
  };
  const location = { replace: (href: string) => replaced.push(href) };
  new Function('document', 'localStorage', 'window', 'location', MOVED_BOOT_SCRIPT)(
    document,
    localStorage,
    { name: windowName },
    location,
  );
  return replaced;
}

const stored = (choices: Record<string, string>) => JSON.stringify({ choices, view: 'principle' });

describe('MOVED_BOOT_SCRIPT：按 M4 里的分叉点选择挑去向', () => {
  it('没有存过选择时用兜底去向', () => {
    expect(run()).toEqual(['/choose-phone/']);
    expect(run({ stored: stored({}) })).toEqual(['/choose-phone/']);
  });

  it('存过这个分叉点时用对应分支的去向', () => {
    expect(run({ stored: stored({ phone: 'iphone' }) })).toEqual(['/iphone-gmail/']);
    expect(run({ stored: stored({ phone: 'android' }) })).toEqual(['/android-gmail/']);
  });

  it('存的值不在选项里（旧值或手改过的值）时用兜底去向', () => {
    expect(run({ stored: stored({ phone: 'windows' }) })).toEqual(['/choose-phone/']);
  });

  it('localStorage 读不了时退回 window.name（M4 的第二层）', () => {
    expect(run({ stored: stored({ phone: 'android' }), throwOnRead: true })).toEqual(['/choose-phone/']);
    expect(run({ throwOnRead: true, windowName: `${WINDOW_NAME_PREFIX}${stored({ phone: 'iphone' })}` })).toEqual([
      '/iphone-gmail/',
    ]);
  });

  it('存储里的值不是 JSON 或不是本站写的 window.name 时用兜底去向，不报错', () => {
    expect(run({ stored: '{oops' })).toEqual(['/choose-phone/']);
    expect(run({ windowName: '别的站点写的名字' })).toEqual(['/choose-phone/']);
  });

  it('页面上没有去向数据或格式不对时不跳转（留给正文的链接）', () => {
    expect(run({ json: null })).toEqual([]);
    expect(run({ json: '{oops' })).toEqual([]);
  });

  it('和 M4 用同一个存储键：改键只改 reader-store.ts', () => {
    expect(MOVED_BOOT_SCRIPT).toContain(JSON.stringify(READER_STATE_KEY));
    expect(MOVED_BOOT_SCRIPT).toContain(JSON.stringify(WINDOW_NAME_PREFIX));
  });
});
