import { describe, expect, it } from 'vitest';
import { applySectionHash, initSectionHash } from './section-hash';

/** 够用的假页面：正文容器里只有一个小节，`#main` 这类容器外的 id 查不到 */
function fakePage(ids: string[] = ['step-2']) {
  const scrolled: string[] = [];
  const targets = new Map(
    ids.map((id) => [
      id,
      {
        scrollIntoView() {
          scrolled.push(id);
        },
      },
    ]),
  );
  const body = {
    ownerDocument: undefined as Document | undefined,
    querySelector(selector: string) {
      const id = selector.replace(/^#/, '').replace(/\\(.)/g, '$1');
      return (targets.get(id) as HTMLElement | undefined) ?? null;
    },
    contains(target: Element) {
      return [...targets.values()].includes(target as never);
    },
  };
  const doc = {
    querySelector(selector: string) {
      return selector === '.prose' ? (body as unknown as HTMLElement) : null;
    },
    getElementById(id: string) {
      return (targets.get(id) as HTMLElement | undefined) ?? null;
    },
  };
  body.ownerDocument = doc as unknown as Document;
  return { doc: doc as unknown as Document, scrolled };
}

describe('applySectionHash：把 #小节 滚到正文里', () => {
  it('找到正文容器里的小节就 scrollIntoView，返回 true', () => {
    const { doc, scrolled } = fakePage();
    expect(applySectionHash(doc, '#step-2')).toBe(true);
    expect(scrolled).toEqual(['step-2']);
  });

  it('不是小节（#main）或不存在时不处理，交给浏览器', () => {
    const { doc, scrolled } = fakePage();
    expect(applySectionHash(doc, '#main')).toBe(false);
    expect(applySectionHash(doc, '#没有这个小节')).toBe(false);
    expect(applySectionHash(doc, '')).toBe(false);
    expect(scrolled).toEqual([]);
  });

  it('百分号编码的片段先解码再找', () => {
    const { doc, scrolled } = fakePage(['改时区']);
    expect(applySectionHash(doc, '#%E6%94%B9%E6%97%B6%E5%8C%BA')).toBe(true);
    expect(scrolled).toEqual(['改时区']);
  });
});

describe('initSectionHash：加载和 hashchange 都生效', () => {
  it('初始化时滚到当前 hash，之后 hash 变了再滚一次', () => {
    const { doc, scrolled } = fakePage(['step-2']);
    const location = { hash: '#step-2' };
    const listeners = new Map<string, () => void>();
    const win = {
      location,
      addEventListener(type: string, listener: () => void) {
        listeners.set(type, listener);
      },
    };
    initSectionHash(doc, win as unknown as Window);
    expect(scrolled).toEqual(['step-2']);

    location.hash = '#step-2';
    listeners.get('hashchange')!();
    expect(scrolled).toEqual(['step-2', 'step-2']);
  });
});
