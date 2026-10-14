import { afterEach, describe, expect, it, vi } from 'vitest';
import { joinBase, withBase } from './with-base';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('withBase：根路径部署（BASE_URL = "/"）', () => {
  it('首页 "/" 保持为 "/"', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/')).toBe('/');
  });

  it('站内路径原样保留', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/foo/')).toBe('/foo/');
  });

  it('缺少开头斜杠时补上', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('foo/')).toBe('/foo/');
  });
});

describe('withBase：子路径部署（BASE_URL = "/sub/"）', () => {
  it('首页 "/" 变为 "/sub/"', () => {
    vi.stubEnv('BASE_URL', '/sub/');
    expect(withBase('/')).toBe('/sub/');
  });

  it('站内路径拼上子路径', () => {
    vi.stubEnv('BASE_URL', '/sub/');
    expect(withBase('/foo/')).toBe('/sub/foo/');
  });

  it('BASE_URL 缺少结尾斜杠时也只有一个分隔斜杠', () => {
    vi.stubEnv('BASE_URL', '/sub');
    expect(withBase('/foo/')).toBe('/sub/foo/');
    expect(withBase('/')).toBe('/sub/');
  });

  it('保留查询参数和锚点，且不改动其中的斜杠', () => {
    vi.stubEnv('BASE_URL', '/sub/');
    expect(withBase('/faq/x/?from=a//b#top')).toBe('/sub/faq/x/?from=a//b#top');
    expect(withBase('/?from=intro')).toBe('/sub/?from=intro');
  });

  it('合并路径中重复的斜杠', () => {
    vi.stubEnv('BASE_URL', '/sub/');
    expect(withBase('//foo//bar/')).toBe('/sub/foo/bar/');
    expect(withBase('//')).toBe('/sub/');
  });
});

describe('joinBase：显式传入 base（供构建配置阶段使用）', () => {
  it('与 withBase 的规则一致', () => {
    expect(joinBase('/', '/foo/')).toBe('/foo/');
    expect(joinBase('/sub', '/foo/')).toBe('/sub/foo/');
    expect(joinBase('/sub/', 'faq/x/?from=a//b#top')).toBe('/sub/faq/x/?from=a//b#top');
  });
});
