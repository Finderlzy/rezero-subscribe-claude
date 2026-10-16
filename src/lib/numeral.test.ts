import { describe, expect, it } from 'vitest';
import metrics from '../assets/numerals/metrics.json';
import { NUMERAL_CHARS, numeralSvg } from './numeral';

// 固定字形的编号（design §3.2 D7）：<use> 拼数字串，外层 role="img" + aria-label，高 1em、宽按字宽。
const uses = (svg: string) => [...svg.matchAll(/<use href="#([^"]+)" x="(\d+)"/g)].map((m) => [m[1], Number(m[2])]);

describe('numeralSvg', () => {
  it('能写 0–9 和短横', () => {
    expect([...NUMERAL_CHARS].sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '–']);
  });

  it('按字宽依次排开每个字形，viewBox 宽是字宽之和', () => {
    const svg = numeralSvg('404', '404');
    const [w4, w0] = [metrics.advance['4'], metrics.advance['0']];
    expect(uses(svg)).toEqual([
      ['numeral-4', 0],
      ['numeral-0', w4],
      ['numeral-4', w4 + w0],
    ]);
    expect(svg).toContain(`viewBox="0 ${metrics.top} ${w4 * 2 + w0} ${metrics.height}"`);
    expect(svg).toMatch(/ height="1em"/);
    expect(svg).toContain(`width="${Math.round(((w4 * 2 + w0) / metrics.height) * 1000) / 1000}em"`);
  });

  it('外层是 role="img"、带 aria-label，颜色跟随 currentColor，不含文字和外部引用', () => {
    const svg = numeralSvg('02', '第 2 步，共 5 步', 'step-no');
    expect(svg).toMatch(/^<svg class="numeral step-no" role="img" aria-label="第 2 步，共 5 步"/);
    expect(svg).toContain('fill="currentColor"');
    expect(svg).not.toMatch(/<text\b|@font-face|url\(|href="(?!#numeral-)/);
  });

  it('短横用 numeral-dash', () => {
    expect(uses(numeralSvg('–', '第几步数不清'))).toEqual([['numeral-dash', 0]]);
  });

  it('读屏文字会转义', () => {
    expect(numeralSvg('1', '"<x>&')).toContain('aria-label="&quot;&lt;x&gt;&amp;"');
  });

  it('空编号、空读屏文字、字形外的字符都抛错', () => {
    expect(() => numeralSvg('', '空')).toThrow('编号不能为空');
    expect(() => numeralSvg('01', ' ')).toThrow('缺少读屏文字');
    expect(() => numeralSvg('1-2', '1-2')).toThrow('没有“-”');
    expect(() => numeralSvg('A', 'A')).toThrow('没有“A”');
  });
});
