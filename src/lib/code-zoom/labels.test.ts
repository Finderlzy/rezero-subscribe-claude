import { describe, expect, it } from 'vitest';
import { COPIED_LABEL, COPIED_RESET_MS, COPY_LABEL, codeTextOf, zoomAltOf } from './labels';

describe('复制按钮的文案和时机（design §4.7）', () => {
  it('默认是“复制”，成功后是“已复制”', () => {
    expect(COPY_LABEL).toBe('复制');
    expect(COPIED_LABEL).toBe('已复制');
  });

  it('“已复制”在 2 秒后回到“复制”', () => {
    expect(COPIED_RESET_MS).toBe(2000);
  });
});

describe('codeTextOf：复制的文本要和代码块原文一致（NFR-02）', () => {
  it('取 pre 的全部文本，保留换行和缩进', () => {
    const pre = {
      textContent: 'bash <(curl -fsSL https://example.com/setup.sh)\n',
    } as Element;
    expect(codeTextOf(pre)).toBe('bash <(curl -fsSL https://example.com/setup.sh)\n');
  });

  it('多行命令里的换行和行首缩进原样保留', () => {
    const source = 'line one\n  indented two\n\ttabbed three';
    expect(codeTextOf({ textContent: source } as Element)).toBe(source);
  });

  it('没有文本时得到空串，不是 undefined', () => {
    expect(codeTextOf({ textContent: null } as unknown as Element)).toBe('');
  });
});

describe('zoomAltOf：看大图的替代文字（design §4.7）', () => {
  const img = (attrs: Record<string, string>) => ({ getAttribute: (name: string) => attrs[name] ?? null }) as HTMLImageElement;

  it('用 alt（M1 已经写进去的文件名去掉扩展名）', () => {
    expect(zoomAltOf(img({ alt: 'VoyraCloud住宅服务器实测-ipinfo' }))).toBe('VoyraCloud住宅服务器实测-ipinfo');
  });

  it('alt 只有空白时按没有 alt 处理', () => {
    expect(zoomAltOf(img({ alt: '   ', src: '/_astro/abc123.png' }))).toBe('abc123');
  });

  it('缺 alt 时用 src 的文件名去掉扩展名兜底', () => {
    expect(zoomAltOf(img({ src: '/_astro/VoyraCloud实测-ipinfo.abc123.png' }))).toBe('VoyraCloud实测-ipinfo.abc123');
  });

  it('src 带查询串或锚点时先去掉再取文件名', () => {
    expect(zoomAltOf(img({ src: '/img/shot.png?x=1#y' }))).toBe('shot');
  });

  it('src 是编码过的中文时解码回来', () => {
    expect(zoomAltOf(img({ src: '/img/%E6%88%AA%E5%9B%BE.png' }))).toBe('截图');
  });

  it('% 序列不合法时不抛异常，退回原串', () => {
    // decodeURIComponent('/img/100%.png') 会抛 URIError，不能让整个看大图初始化中断。
    expect(() => zoomAltOf(img({ src: '/img/100%.png' }))).not.toThrow();
    expect(zoomAltOf(img({ src: '/img/100%.png' }))).toBe('100%');
  });

  it('alt 和 src 都没有时得到空串', () => {
    expect(zoomAltOf(img({}))).toBe('');
  });
});
