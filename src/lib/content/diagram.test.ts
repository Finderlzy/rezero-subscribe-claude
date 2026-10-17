import { describe, expect, it } from 'vitest';
import { DIAGRAM_MAX_WIDTH, parseDiagram } from './diagram';

/** 说明图（design v2.1 §4.7）：作者确认过的 SVG 原样内联进正文，只接受单色线稿该有的写法 */

const svg = (inner: string, root = 'viewBox="0 0 320 120"') =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<!-- 注释 -->\n<svg xmlns="http://www.w3.org/2000/svg" ${root}>\n<title>手机到 claude 的路线</title>\n${inner}\n</svg>\n`;

const errors = (text: string) => {
  const r = parseDiagram(text);
  return 'errors' in r ? r.errors : [];
};

describe('parseDiagram', () => {
  it('取出标题、viewBox 的宽高和根元素里面的内容（去掉 XML 声明和注释）', () => {
    const r = parseDiagram(svg('<g class="accent"><rect x="1" y="1" width="80" height="40" fill="none" stroke="currentColor"/></g>'));
    expect(r).toEqual({
      title: '手机到 claude 的路线',
      width: 320,
      height: 120,
      inner: '<title>手机到 claude 的路线</title>\n<g class="accent"><rect x="1" y="1" width="80" height="40" fill="none" stroke="currentColor"/></g>',
    });
  });

  it('描述 <desc> 可以有，原样保留', () => {
    const r = parseDiagram(svg('<desc>先过防火墙，再到节点</desc><path d="M0 0H10" stroke="currentColor"/>'));
    expect('inner' in r && r.inner).toContain('<desc>先过防火墙，再到节点</desc>');
  });

  it(`viewBox 必须从 0 0 开始，宽度不超过手机正文栏的 ${DIAGRAM_MAX_WIDTH}（图按 1:1 显示，图中文字才是 14px）`, () => {
    expect(errors(svg('', ''))).toEqual([expect.stringContaining('viewBox')]);
    expect(errors(svg('', 'viewBox="10 0 320 120"'))).toEqual([expect.stringContaining('viewBox')]);
    expect(errors(svg('', `viewBox="0 0 ${DIAGRAM_MAX_WIDTH + 1} 120"`))).toEqual([expect.stringContaining(`不超过 ${DIAGRAM_MAX_WIDTH}`)]);
    expect(errors(svg('', `viewBox="0 0 ${DIAGRAM_MAX_WIDTH} 120"`))).toEqual([]);
  });

  it('根元素只能写 xmlns 和 viewBox：宽高由页面按 viewBox 定，线宽、字体写在里面的 <g> 上', () => {
    expect(errors(svg('', 'viewBox="0 0 320 120" width="640"'))).toEqual([expect.stringContaining('width')]);
  });

  it('必须有 <title>（读屏读它）', () => {
    expect(errors('<svg viewBox="0 0 100 100"><path d="M0 0H1" stroke="currentColor"/></svg>')).toEqual([expect.stringContaining('<title>')]);
  });

  it('不是一个 <svg> 根元素时报错', () => {
    expect(errors('<p>不是图</p>')).toEqual([expect.stringContaining('<svg>')]);
  });

  it('颜色只能是 currentColor 或 none：线条跟着 --text 变，强调用 class="accent"（深浅两色都对）', () => {
    expect(errors(svg('<path d="M0 0H1" stroke="#5b3fa0"/>'))).toEqual([expect.stringContaining('stroke="#5b3fa0"')]);
    expect(errors(svg('<text fill="black">x</text>'))).toEqual([expect.stringContaining('fill="black"')]);
  });

  it.each([
    ['<script>alert(1)</script>', '<script'],
    ['<style>svg{}</style>', '<style'],
    ['<foreignObject></foreignObject>', '<foreignObject'],
    ['<image href="x.png"/>', '<image'],
    ['<use href="#a"/>', '<use'],
    ['<a href="https://example.com"><text>x</text></a>', '<a'],
    ['<linearGradient id="g"/>', '<linearGradient'],
    ['<filter id="f"/>', '<filter'],
    ['<path d="M0 0H1" stroke="currentColor" onclick="x()"/>', 'onclick'],
    ['<path d="M0 0H1" style="stroke:red"/>', 'style'],
    ['<path id="p" d="M0 0H1" stroke="currentColor"/>', 'id'],
  ])('不接受 %s：脚本、外部资源、渐变滤镜、内联样式和 id（同页多张图会撞）', (inner, word) => {
    expect(errors(svg(inner))).toContainEqual(expect.stringContaining(word));
  });

  it.each([
    ['<rect onclick=alert(1) width="5"/>', 'onclick'],
    ['<rect style=fill:red width="5"/>', 'style'],
    ['<path d="M0 0H1" stroke=red/>', 'stroke'],
    ['<path hidden d="M0 0H1"/>', 'hidden'],
    ['<text class="x>" onmouseover="alert(1)">hi</text>', 'onmouseover'],
  ])('不带引号或没有值的属性也要报错：%s', (inner, word) => {
    expect(errors(svg(inner))).toContainEqual(expect.stringContaining(word));
  });

  it.each([
    ['<rect width="5" height="5" fill="currentColor"/>', 'fill="currentColor"'],
    ['<path d="M0 0H1" stroke="currentColor" stroke-width="6"/>', 'stroke-width="6"'],
    ['<text font-size="8">x</text>', 'font-size="8"'],
    ['<text><tspan font-size="20">x</tspan></text>', 'font-size="20"'],
    ['<text transform="scale(0.5)">x</text>', 'transform'],
    ['<g class="plate-no"/>', 'class="plate-no"'],
  ])('画法按 §4.7：不填色、线宽 1.5、字号 14、不缩放、class 只用 accent：%s', (inner, word) => {
    expect(errors(svg(inner))).toContainEqual(expect.stringContaining(word));
  });

  it('不支持的元素只报一次（闭合标签不重复报）', () => {
    expect(errors(svg('<script>x</script>')).filter((e) => e.includes('<script>'))).toHaveLength(1);
  });

  it('<title> 里的实体还原后再当替代文字', () => {
    const r = parseDiagram(svg('', 'viewBox="0 0 10 10"').replace('手机到 claude 的路线', 'A &amp; B &#x2192; C'));
    expect('title' in r && r.title).toBe('A & B → C');
  });

  it('标签以外不能有 <：CDATA、声明、残缺的标签', () => {
    expect(errors(svg('<text><![CDATA[x]]></text>'))).toContainEqual(expect.stringContaining('认不出的标签'));
    expect(errors(svg('<text>a < b</text>'))).toContainEqual(expect.stringContaining('认不出的标签'));
  });

  it('文字和包文字的 <g> 可以 fill="currentColor"', () => {
    expect(errors(svg('<g fill="currentColor" font-size="14"><text stroke-width="1.5">x</text></g>'))).toEqual([]);
  });
});
