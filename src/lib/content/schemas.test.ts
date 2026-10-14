import { describe, expect, it } from 'vitest';
import { choiceSchema, faqSchema, pageSchema, stepSchema } from './schemas';

describe('stepSchema', () => {
  it('只写 title 时，skippable、placeholder 默认 false，其余可选项为空', () => {
    expect(stepSchema.parse({ title: '连上服务器' })).toEqual({
      title: '连上服务器',
      skippable: false,
      placeholder: false,
    });
  });

  it('接受完整元数据', () => {
    const data = {
      title: '下载 Gmail',
      skippable: true,
      skipLabel: '已经装好了，跳过',
      placeholder: true,
      placeholderHint: '原文：安卓用户自行安装',
      video: { bilibili: 'BV1xx411c7mD', youtube: 'dQw4w9WgXcQ' },
    };
    expect(stepSchema.parse(data)).toEqual(data);
  });

  it('缺少 title 或 title 为空时失败', () => {
    expect(stepSchema.safeParse({}).success).toBe(false);
    expect(stepSchema.safeParse({ title: '  ' }).success).toBe(false);
  });

  it('写错的键直接失败，不被悄悄忽略', () => {
    expect(stepSchema.safeParse({ title: '甲', skipable: true }).success).toBe(false);
  });

  it('skipLabel 只能配 skippable，placeholderHint 只能配 placeholder', () => {
    expect(stepSchema.safeParse({ title: '甲', skipLabel: '跳过' }).success).toBe(false);
    expect(stepSchema.safeParse({ title: '甲', placeholderHint: '提示' }).success).toBe(false);
  });

  it('video 至少有一个平台，且格式正确', () => {
    expect(stepSchema.safeParse({ title: '甲', video: {} }).success).toBe(false);
    expect(stepSchema.safeParse({ title: '甲', video: { bilibili: 'av123' } }).success).toBe(false);
    expect(stepSchema.safeParse({ title: '甲', video: { youtube: 'https://youtu.be/x' } }).success).toBe(false);
    expect(stepSchema.safeParse({ title: '甲', video: { youtube: 'dQw4w9WgXcQ' } }).success).toBe(true);
  });
});

describe('choiceSchema', () => {
  const ok = {
    question: '选哪种节点方案？',
    options: {
      'plan-1': { title: '方案一', path: 'VPS + 免费住宅 IP', effort: '较多', audience: '想省钱' },
      'plan-2': { title: '方案二' },
    },
  };

  it('接受问题和选项（对应原文的对比表）', () => {
    expect(choiceSchema.parse(ok)).toEqual(ok);
  });

  it('缺少 question、选项少于两个、选项标识不是 kebab-case 时失败', () => {
    expect(choiceSchema.safeParse({ options: ok.options }).success).toBe(false);
    expect(choiceSchema.safeParse({ ...ok, options: { 'plan-1': { title: '方案一' } } }).success).toBe(false);
    expect(choiceSchema.safeParse({ ...ok, options: { Plan1: { title: '甲' }, 'plan-2': { title: '乙' } } }).success).toBe(false);
    expect(choiceSchema.safeParse({ ...ok, options: { '1': { title: '甲' }, 'plan-2': { title: '乙' } } }).success).toBe(false);
    expect(choiceSchema.safeParse({ ...ok, options: { 'plan-1': {}, 'plan-2': { title: '乙' } } }).success).toBe(false);
  });
});

describe('faqSchema / pageSchema', () => {
  it('title 必填', () => {
    expect(faqSchema.safeParse({ title: '打开面板排查' }).success).toBe(true);
    expect(faqSchema.safeParse({}).success).toBe(false);
    expect(pageSchema.safeParse({ title: '完成' }).success).toBe(true);
    expect(pageSchema.safeParse({}).success).toBe(false);
  });
});
