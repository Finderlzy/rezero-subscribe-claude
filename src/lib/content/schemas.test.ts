import { describe, expect, it } from 'vitest';
import { principleSchema, referenceSchema } from './schemas';

describe('principleSchema', () => {
  it('不写 frontmatter 时，principleOnly、skippable 默认 false', () => {
    expect(principleSchema.parse({})).toEqual({ principleOnly: false, skippable: false });
  });

  it('接受完整元数据和选择页的选项', () => {
    const data = {
      principleOnly: false,
      skippable: true,
      skipLabel: '已经有了，跳过',
      video: { bilibili: 'BV1xx411c7mD' },
      options: {
        iphone: { title: 'iPhone / iPad' },
        android: { title: '安卓' },
      },
    };
    expect(principleSchema.parse(data)).toEqual(data);
  });

  it('不再接受 v1 的 title、placeholder，写错的键失败', () => {
    expect(principleSchema.safeParse({ title: '前言' }).success).toBe(false);
    expect(principleSchema.safeParse({ placeholder: true }).success).toBe(false);
    expect(principleSchema.safeParse({ skipable: true }).success).toBe(false);
  });

  it('skipLabel 只能配 skippable；原理独有步骤不能可跳过以外再写选项', () => {
    expect(principleSchema.safeParse({ skipLabel: '跳过' }).success).toBe(false);
    expect(principleSchema.safeParse({ principleOnly: true, options: { a: { title: '甲' }, b: { title: '乙' } } }).success).toBe(false);
  });

  it('选项至少两个，标识是 kebab-case，title 必填（V10 起不再写正文里的加粗标题 heading）', () => {
    const two = { 'plan-1': { title: '方案一' }, 'plan-2': { title: '方案二' } };
    expect(principleSchema.safeParse({ options: two }).success).toBe(true);
    expect(principleSchema.safeParse({ options: { 'plan-1': two['plan-1'] } }).success).toBe(false);
    expect(principleSchema.safeParse({ options: { ...two, Plan3: { title: '丙' } } }).success).toBe(false);
    expect(principleSchema.safeParse({ options: { ...two, 'plan-3': { title: '丙' } } }).success).toBe(true);
    expect(principleSchema.safeParse({ options: { ...two, 'plan-3': { heading: '丙' } } }).success).toBe(false);
  });

  it('video 至少有一个平台，且格式正确', () => {
    expect(principleSchema.safeParse({ video: {} }).success).toBe(false);
    expect(principleSchema.safeParse({ video: { bilibili: 'av123' } }).success).toBe(false);
    expect(principleSchema.safeParse({ video: { youtube: 'https://youtu.be/x' } }).success).toBe(false);
    expect(principleSchema.safeParse({ video: { youtube: 'dQw4w9WgXcQ' } }).success).toBe(true);
  });
});

describe('referenceSchema', () => {
  it('参考页不写 frontmatter；写了任何键都失败（页面元数据只写在步骤页里）', () => {
    expect(referenceSchema.safeParse({}).success).toBe(true);
    expect(referenceSchema.safeParse({ title: 'IP 质量实测合集' }).success).toBe(false);
  });
});
