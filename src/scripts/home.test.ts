import { describe, expect, it } from 'vitest';
import { createReaderStore } from '../lib/reader-state/reader-store';
import { resumeOf } from './home';

const titles = { 'v2rayn-dns': '防 DNS 泄漏', 'run-script': '运行脚本' };

describe('resumeOf：首页“继续上次”要去的步骤', () => {
  it('没有进度时返回 null', () => {
    expect(resumeOf(createReaderStore(null), titles)).toBeNull();
  });

  it('有进度时返回上一次阅读的步骤和标题', () => {
    const store = createReaderStore(null);
    store.write({ lastStep: 'v2rayn-dns' });
    expect(resumeOf(store, titles)).toEqual({ id: 'v2rayn-dns', title: '防 DNS 泄漏' });
  });

  it('记下的步骤已不在路线图里时返回 null', () => {
    const store = createReaderStore(null);
    store.write({ lastStep: 'gone-step' });
    expect(resumeOf(store, titles)).toBeNull();
  });

  it('原型上的键不算步骤', () => {
    const store = createReaderStore(null);
    store.write({ lastStep: 'constructor' });
    expect(resumeOf(store, titles)).toBeNull();
  });
});
