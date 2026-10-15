import { describe, expect, it } from 'vitest';
import { operationSchema, principleSchema, referenceSchema } from './schemas';

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
        iphone: { title: 'iPhone', heading: 'iPhone' },
        android: { title: '安卓', heading: '安卓' },
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
    expect(principleSchema.safeParse({ principleOnly: true, options: { a: { title: '甲', heading: '甲' }, b: { title: '乙', heading: '乙' } } }).success).toBe(false);
  });

  it('选项至少两个，标识是 kebab-case，title 和 heading 都必填', () => {
    const two = { 'plan-1': { title: '方案一', heading: '方案一：甲' }, 'plan-2': { title: '方案二', heading: '方案二：乙' } };
    expect(principleSchema.safeParse({ options: two }).success).toBe(true);
    expect(principleSchema.safeParse({ options: { 'plan-1': two['plan-1'] } }).success).toBe(false);
    expect(principleSchema.safeParse({ options: { ...two, Plan3: { title: '丙', heading: '丙' } } }).success).toBe(false);
    expect(principleSchema.safeParse({ options: { ...two, 'plan-3': { title: '丙' } } }).success).toBe(false);
    expect(principleSchema.safeParse({ options: { ...two, 'plan-3': { heading: '丙' } } }).success).toBe(false);
  });

  it('video 至少有一个平台，且格式正确', () => {
    expect(principleSchema.safeParse({ video: {} }).success).toBe(false);
    expect(principleSchema.safeParse({ video: { bilibili: 'av123' } }).success).toBe(false);
    expect(principleSchema.safeParse({ video: { youtube: 'https://youtu.be/x' } }).success).toBe(false);
    expect(principleSchema.safeParse({ video: { youtube: 'dQw4w9WgXcQ' } }).success).toBe(true);
  });
});

describe('operationSchema / referenceSchema', () => {
  it('不写 frontmatter；写了任何键都失败（页面元数据只写在原理版）', () => {
    expect(operationSchema.safeParse({}).success).toBe(true);
    expect(operationSchema.safeParse({ skippable: true }).success).toBe(false);
    expect(referenceSchema.safeParse({}).success).toBe(true);
    expect(referenceSchema.safeParse({ title: '常见问题' }).success).toBe(false);
  });
});
