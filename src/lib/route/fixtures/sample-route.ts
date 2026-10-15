/**
 * 测试用路线图：按需求 §5.2 的形状缩写（v2.0）。
 *
 * - F1 node-plan（选择页 choose-plan）：三个选项，方案一、二共享 make-node；汇合点是 import-proxy。
 * - F2 phone（选择页 choose-phone）：两段 branch，第一段汇合到 register-gmail，第二段（没有选择页）汇合到 after-subscribe。
 * - 原理独有步骤：overview（普通项）、recap（汇合之后）、iphone-why（第二段 iPhone 的第一页）。
 * - 可跳过步骤：clean-up（章末，跳到下一章的选择页）、plan1-panel（分支末尾，跳到汇合点）、
 *   android-gmail → register-gmail（跨越分支末尾连跳）、google-region、iphone-apple-id。
 * - 旁支页：google-appeal 挂在 use-two-days 上。
 *
 * 每次调用返回新对象，测试可以放心修改。
 */
import type { PageMeta, RouteSpec } from '../types';

export function sampleSpec(): RouteSpec {
  return {
    chapters: [
      { id: 'start', title: '开始', items: ['preface', 'overview', 'clean-up'] },
      {
        id: 'node-and-ip',
        title: '准备节点和住宅 IP',
        items: [
          { choose: 'node-plan', page: 'choose-plan' },
          {
            branch: 'node-plan',
            options: {
              'plan-1': ['plan1-buy-server', 'make-node', 'plan1-panel'],
              'plan-2': ['plan2-server', 'make-node'],
              'plan-3': ['plan3-node'],
            },
          },
          'import-proxy',
          'check-ip',
          'recap',
          'timezone',
        ],
      },
      {
        id: 'register-and-subscribe',
        title: '注册和订阅',
        items: [
          { choose: 'phone', page: 'choose-phone' },
          {
            branch: 'phone',
            options: { iphone: ['iphone-proxy', 'iphone-gmail'], android: ['android-proxy', 'android-gmail'] },
          },
          'register-gmail',
          'use-two-days',
          'google-region',
          'subscribe',
          {
            branch: 'phone',
            options: { iphone: ['iphone-why', 'iphone-apple-id', 'iphone-subscribe'], android: ['android-subscribe'] },
          },
          'after-subscribe',
        ],
      },
      { id: 'ending', title: '结尾', items: ['thanks', 'afterword'] },
    ],
    side: { 'google-appeal': { returnTo: 'use-two-days' } },
  };
}

const PAGES: [string, string, Partial<PageMeta>?][] = [
  ['preface', '前言'],
  ['overview', '整体思路', { principleOnly: true }],
  ['clean-up', '清理旧账号和配置', { skippable: true, skipLabel: '没用过，跳过' }],
  [
    'choose-plan',
    '选择方案',
    {
      options: [
        { id: 'plan-1', title: '方案一' },
        { id: 'plan-2', title: '方案二' },
        { id: 'plan-3', title: '方案三' },
      ],
    },
  ],
  ['plan1-buy-server', '购买服务器'],
  ['make-node', '把服务器变成节点'],
  ['plan1-panel', '安装面板', { skippable: true }],
  ['plan2-server', '方案二：住宅 IP 服务器'],
  ['plan3-node', '方案三：直接买住宅节点'],
  ['import-proxy', '导入代理软件'],
  ['check-ip', '测 IP 质量'],
  ['recap', '小结', { principleOnly: true }],
  ['timezone', '改时区'],
  [
    'choose-phone',
    '选择手机系统',
    {
      options: [
        { id: 'iphone', title: 'iPhone' },
        { id: 'android', title: '安卓' },
      ],
    },
  ],
  ['iphone-proxy', 'iPhone：导入代理软件'],
  ['iphone-gmail', 'iPhone：下载 Gmail'],
  ['android-proxy', '安卓：导入代理软件'],
  ['android-gmail', '安卓：下载 Gmail', { skippable: true }],
  ['register-gmail', '注册 Gmail', { skippable: true }],
  ['use-two-days', '先用两天'],
  ['google-appeal', '被封了：申诉解封'],
  ['google-region', '修改 Google 账号地区', { skippable: true }],
  ['subscribe', '订阅'],
  ['iphone-why', 'iPhone：为什么用美区 Apple ID', { principleOnly: true }],
  ['iphone-apple-id', 'iPhone：注册美区 Apple ID', { skippable: true }],
  ['iphone-subscribe', 'iPhone：在 app 内订阅'],
  ['android-subscribe', '安卓：订阅'],
  ['after-subscribe', '订阅之后'],
  ['thanks', '致谢'],
  ['afterword', '后记'],
];

export function samplePages(): PageMeta[] {
  return PAGES.map(([id, title, extra]) => ({ id, title, principleOnly: false, skippable: false, ...extra }));
}
