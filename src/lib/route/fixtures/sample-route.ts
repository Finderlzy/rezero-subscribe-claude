/**
 * 测试用路线图：按需求 §5.2 的形状缩写。
 *
 * - F1 node-plan：三个选项，方案一、二共享 ssh-connect、run-script；汇合点是 F2 的选择页。
 * - F2 desktop-proxy：两段紧挨着的 branch（第二章、第三章），汇合点是 webrtc。
 * - F3 phone：三段 branch（第六、七、十章），跨章节汇合。
 * - 可跳过步骤：clean-claude-code（本章末尾）、ip-failed（跳到下一章的选择页）、
 *   第七章 android-google-play → android-gmail → create-google-account（跨越分支末尾，跳到第八章）。
 *
 * 每次调用返回新对象，测试可以放心修改。
 */
import type { ChoiceMeta, RouteSpec, StepMeta } from '../types';

export function sampleSpec(): RouteSpec {
  return {
    defaults: { 'node-plan': 'plan-1', 'desktop-proxy': 'v2rayn', phone: 'iphone' },
    chapters: [
      { id: 'start', title: '开始', items: ['before-you-start', 'overview', 'clean-claude-code'] },
      {
        id: 'residential-ip',
        title: '一、准备住宅 IP',
        items: [
          { choose: 'node-plan' },
          {
            branch: 'node-plan',
            options: {
              'plan-1': ['plan1-buy-vps', 'plan1-free-residential-ip', 'ssh-connect', 'run-script'],
              'plan-2': ['plan2-buy-residential-vps', 'ssh-connect', 'run-script'],
              'plan-3': ['plan3-buy-node'],
            },
          },
        ],
      },
      {
        id: 'desktop-proxy',
        title: '二、电脑代理',
        items: [
          { choose: 'desktop-proxy' },
          {
            branch: 'desktop-proxy',
            options: {
              v2rayn: ['v2rayn-import', 'v2rayn-tun'],
              'clash-verge': ['clash-verge-import', 'clash-verge-tun'],
            },
          },
        ],
      },
      {
        id: 'leak-protection',
        title: '三、防泄漏',
        items: [
          { branch: 'desktop-proxy', options: { v2rayn: ['v2rayn-dns'], 'clash-verge': ['clash-verge-dns'] } },
          'webrtc',
          'ipv6',
        ],
      },
      { id: 'ip-quality', title: '五、检查 IP 质量', items: ['check-ip-quality', 'ip-failed'] },
      {
        id: 'phone-proxy',
        title: '六、手机代理',
        items: [
          { choose: 'phone' },
          {
            branch: 'phone',
            options: {
              iphone: ['iphone-app-store-region', 'iphone-v2box', 'iphone-timezone'],
              android: ['android-v2rayng', 'android-timezone'],
            },
          },
        ],
      },
      {
        id: 'google-account',
        title: '七、准备 Google 账号',
        items: [
          {
            branch: 'phone',
            options: { iphone: ['iphone-gmail'], android: ['android-google-play', 'android-gmail'] },
          },
          'create-google-account',
        ],
      },
      { id: 'nurture', title: '八、养号', items: ['use-google-few-days'] },
      {
        id: 'subscribe',
        title: '十、订阅',
        items: [
          {
            branch: 'phone',
            options: { iphone: ['iphone-subscribe', 'purchase-failed'], android: ['android-subscribe'] },
          },
        ],
      },
      { id: 'after', title: '十一、订阅之后', items: ['after-subscribe', 'about-kyc'] },
    ],
  };
}

const STEP_TITLES: [string, string, Partial<StepMeta>?][] = [
  ['before-you-start', '开始之前'],
  ['overview', '整体思路'],
  ['clean-claude-code', '清理本机的 Claude Code 配置', { skippable: true, skipLabel: '没用过，跳过', placeholder: true }],
  ['plan1-buy-vps', '买普通服务器'],
  ['plan1-free-residential-ip', '白嫖住宅 IP'],
  ['ssh-connect', '连上服务器'],
  ['run-script', '运行脚本'],
  ['plan2-buy-residential-vps', '买住宅 IP 服务器并测 IP'],
  ['plan3-buy-node', '购买住宅节点'],
  ['v2rayn-import', '下载 v2rayN 并导入节点'],
  ['v2rayn-tun', '开 tun'],
  ['clash-verge-import', '下载 Clash Verge 并导入节点'],
  ['clash-verge-tun', 'Clash Verge 开 tun', { placeholder: true }],
  ['v2rayn-dns', 'DNS'],
  ['clash-verge-dns', 'Clash Verge DNS', { placeholder: true }],
  ['webrtc', 'WebRTC'],
  ['ipv6', 'IPv6'],
  ['check-ip-quality', '检查 IP 质量'],
  ['ip-failed', 'IP 不合格：换 IP 或退款', { skippable: true, skipLabel: 'IP 合格，跳过', placeholder: true }],
  ['iphone-app-store-region', '把 App Store 改到奥地利', { placeholder: true }],
  ['iphone-v2box', '下载 v2Box 并导入节点', { placeholder: true }],
  ['iphone-timezone', '手机改时区'],
  ['android-v2rayng', '下载 v2rayNG 并导入节点', { placeholder: true }],
  ['android-timezone', '安卓改时区', { placeholder: true }],
  ['iphone-gmail', '下载 Gmail', { skippable: true }],
  ['android-google-play', '安装 Google Play', { skippable: true, placeholder: true }],
  ['android-gmail', '安卓下载 Gmail', { skippable: true, placeholder: true }],
  ['create-google-account', '创建 Gmail 邮箱和 Google 账号', { skippable: true }],
  ['use-google-few-days', '先用 Google 账号几天'],
  ['iphone-subscribe', '在 app 内订阅'],
  ['purchase-failed', '购买无法完成：问 AI', { skippable: true, skipLabel: '订阅成功，跳过' }],
  ['android-subscribe', '安卓订阅', { placeholder: true }],
  ['after-subscribe', '订阅之后的注意事项'],
  ['about-kyc', '关于 KYC'],
];

export function sampleSteps(): StepMeta[] {
  return STEP_TITLES.map(([id, title, extra]) => ({ id, title, ...extra }));
}

export function sampleChoices(): ChoiceMeta[] {
  return [
    {
      id: 'node-plan',
      title: '选择节点方案',
      options: [
        { id: 'plan-1', title: '方案一' },
        { id: 'plan-2', title: '方案二' },
        { id: 'plan-3', title: '方案三' },
      ],
    },
    {
      id: 'desktop-proxy',
      title: '选择电脑代理软件',
      options: [
        { id: 'v2rayn', title: 'v2rayN' },
        { id: 'clash-verge', title: 'Clash Verge' },
      ],
    },
    {
      id: 'phone',
      title: '选择手机',
      options: [
        { id: 'iphone', title: 'iPhone' },
        { id: 'android', title: '安卓' },
      ],
    },
  ];
}
