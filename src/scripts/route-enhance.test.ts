import { describe, expect, it } from 'vitest';
import { sampleChoices, sampleSpec, sampleSteps } from '../lib/route/fixtures/sample-route';
import { buildRouteMap } from '../lib/route/route-map';
import type { At, Choices } from '../lib/route/types';
import { openPatch, readerStoreOptions } from './route-enhance';

const map = buildRouteMap(sampleSpec(), sampleSteps(), sampleChoices());
const step = (id: string): At => ({ kind: 'step', id });
const patchOf = (at: At, stored: Choices = {}) => openPatch(map.data, at, map.view(at, stored));

describe('readerStoreOptions：本机状态里的标识要仍在路线图里', () => {
  const options = readerStoreOptions(map.data);

  it('认得路线图里的步骤，不认得已删掉的', () => {
    expect(options.isKnownStep?.('ssh-connect')).toBe(true);
    expect(options.isKnownStep?.('gone-step')).toBe(false);
  });

  it('认得分叉点的选项，不认得不存在的选项或分叉点', () => {
    expect(options.isKnownChoice?.('node-plan', 'plan-2')).toBe(true);
    expect(options.isKnownChoice?.('node-plan', 'plan-9')).toBe(false);
    expect(options.isKnownChoice?.('no-such-fork', 'plan-1')).toBe(false);
  });

  it('原型上的键不算标识', () => {
    expect(options.isKnownStep?.('constructor')).toBe(false);
    expect(options.isKnownChoice?.('constructor', 'plan-1')).toBe(false);
  });
});

describe('openPatch：打开步骤页时写入的本机状态（FR-50）', () => {
  it('分支步骤：写阅读进度，并记下它所属的选项（AC-08）', () => {
    expect(patchOf(step('plan3-buy-node'))).toEqual({
      lastStep: 'plan3-buy-node',
      visited: ['plan3-buy-node'],
      choices: { 'node-plan': 'plan-3' },
    });
  });

  it('共享步骤：本机已选的选项在其中时沿用（AC-19）', () => {
    expect(patchOf(step('ssh-connect'), { 'node-plan': 'plan-2' })?.choices).toEqual({ 'node-plan': 'plan-2' });
  });

  it('共享步骤：本机已选的选项不在其中时，记下实际生效的选项', () => {
    expect(patchOf(step('ssh-connect'), { 'node-plan': 'plan-3' })?.choices).toEqual({ 'node-plan': 'plan-1' });
  });

  it('同一分叉点的后一段分支也算它的选项', () => {
    expect(patchOf(step('clash-verge-dns'))?.choices).toEqual({ 'desktop-proxy': 'clash-verge' });
  });

  it('普通步骤不写选择，没选过的分叉点继续跟随默认路线', () => {
    expect(patchOf(step('overview'), { phone: 'android' })).toEqual({
      lastStep: 'overview',
      visited: ['overview'],
      choices: {},
    });
  });

  it('选择页打开时什么都不写', () => {
    expect(patchOf({ kind: 'choose', fork: 'node-plan' })).toBeNull();
  });
});
