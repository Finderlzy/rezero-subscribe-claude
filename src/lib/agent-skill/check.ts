import { parseFrontmatter } from '@astrojs/markdown-remark';
import { SKILL_DIR } from './index';

/**
 * 校验规则（架构 §16.4 第 3 步，FR-113 第 2–6 条，NFR-07，AC-42）：
 * 对入库的生成物再查一遍规则，坏夹具即使和生成结果不同，也会报出具体问题。
 * 返回逐条的“文件：说明”，空数组表示通过；不放宽。
 */

/** Agent Skills 规范的 name 正则 */
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** frontmatter 允许的字段（规范以内的） */
const FRONTMATTER_FIELDS = ['name', 'description', 'license', 'compatibility', 'metadata'] as const;
/** SKILL.md 正文行数上限（NFR-07） */
const SKILL_MAX_LINES = 500;
/** IPv4 允许名单：回环、本机、正文里的公共 DNS、示例地址和文档示例网段（新增要重新核对重写稿和方法文件） */
const ALLOWED_IPV4 = new Set(['127.0.0.1', '0.0.0.0', '1.1.1.1', '8.8.8.8', '119.29.29.29', '1.2.3.4', '203.0.113.10']);
/** 节点分享链接协议：后面紧跟实际内容才算凭据，单独写 `vless://` 这种说明文字允许 */
const NODE_PROTOCOLS = 'vless|vmess|trojan|ss|hysteria2|hy2';
const NODE_LINK_RE = new RegExp(`(?:${NODE_PROTOCOLS})://(?!\\s|\`|$)[^\s\`，。；、）]+`);
const IPV4_RE = /(?<![\d.])(\d{1,3}(?:\.\d{1,3}){3})(?![\d.])/g;

export interface SkillCheckProblem {
  file: string;
  line?: number;
  message: string;
}

/** 问题行号（1 起）：`text` 按行找第一个含 `needle` 的行，找不到返回 undefined */
function lineOf(text: string, needle: string): number | undefined {
  const index = text.split('\n').findIndex((line) => line.includes(needle));
  return index === -1 ? undefined : index + 1;
}

/** frontmatter 校验：`name` 合规范且等于目录名、`description` 1–1024、`compatibility` ≤500、metadata 值是字符串、无规范外字段 */
export function checkFrontmatter(frontmatter: Record<string, unknown>, dirName: string): string[] {
  const problems: string[] = [];
  for (const key of Object.keys(frontmatter)) {
    if (!(FRONTMATTER_FIELDS as readonly string[]).includes(key)) problems.push(`frontmatter 的 ${key} 不是 Agent Skills 规范里的字段`);
  }
  const name = frontmatter['name'];
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    problems.push(`frontmatter 的 name（${String(name)}）不合规范：只能用小写英文、数字和连字符`);
  } else if (name !== dirName) {
    problems.push(`frontmatter 的 name（${name}）要等于目录名（${dirName}）`);
  }
  const description = frontmatter['description'];
  if (typeof description !== 'string' || description.length === 0) {
    problems.push('frontmatter 缺少 description');
  } else if (description.length > 1024) {
    problems.push(`frontmatter 的 description 有 ${description.length} 个字符，超过 1024`);
  }
  const compatibility = frontmatter['compatibility'];
  if (compatibility !== undefined && (typeof compatibility !== 'string' || compatibility.length > 500)) {
    problems.push(`frontmatter 的 compatibility 不能超过 500 个字符（现在 ${String(compatibility).length} 个）`);
  }
  const metadata = frontmatter['metadata'];
  if (metadata !== undefined) {
    if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
      problems.push('frontmatter 的 metadata 要是键值表');
    } else {
      for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
        if (typeof value !== 'string') problems.push(`frontmatter 的 metadata.${key} 要写成字符串（加引号）`);
      }
    }
  }
  return problems;
}

/** Obsidian 写法和占位残留：`[[`、`![[`、`![`、`> [!`、`{{`（出现在行内哪一行就报哪一行） */
export function checkLeftovers(file: string, text: string): SkillCheckProblem[] {
  const problems: SkillCheckProblem[] = [];
  // 每行只报最具体的一种：![[ 覆盖 ![ 和 [[，[[ 覆盖 [! 的行首形式，Callout 和占位独立判断
  const marks: [RegExp, string][] = [
    [/!\[\[/, '残留图片嵌入 ![['],
    [/\[\[/, '残留双链 [['],
    [/!\[/, '残留图片写法 !['],
  ];
  for (const [index, line] of text.split('\n').entries()) {
    const no = index + 1;
    const mark = marks.find(([re]) => re.test(line));
    if (mark) problems.push({ file, line: no, message: mark[1] });
    if (/^>\s*\[!/.test(line)) problems.push({ file, line: no, message: '残留 Callout > [!' });
    if (/\{\{/.test(line)) problems.push({ file, line: no, message: '残留占位 {{' });
  }
  return problems;
}

/** 凭据与真实地址：节点链接、名单外的 IPv4、password: / 密码： 后跟值 */
export function checkSecrets(file: string, text: string): SkillCheckProblem[] {
  const problems: SkillCheckProblem[] = [];
  for (const [index, line] of text.split('\n').entries()) {
    const no = index + 1;
    const nodeLink = NODE_LINK_RE.exec(line);
    if (nodeLink) problems.push({ file, line: no, message: `有像节点凭据的链接（${nodeLink[0]}…），真实节点信息不能入库` });
    for (const match of line.matchAll(IPV4_RE)) {
      const ip = match[1]!;
      if (!ALLOWED_IPV4.has(ip)) problems.push({ file, line: no, message: `有不在允许名单里的 IPv4 地址 ${ip}（真实服务器 IP 不能入库；名单在 src/lib/agent-skill/check.ts）` });
    }
    const password = /(?:password:|密码：)\s*\S/.exec(line);
    if (password) {
      const head = line.slice((password.index ?? 0), (password.index ?? 0) + password[0].length + 20);
      // `password:` 后面是「输入 root 密码」这类说明文字允许；只有后面跟着像值的连续非空白（且不是纯说明）才报
      const rest = line.slice((password.index ?? 0) + password[0].length);
      if (rest.trim() !== '' && !/[，。；：！？、）]|输入|屏幕/.test(rest)) {
        problems.push({ file, line: no, message: `password 后面跟着像密码的值（${head.trim()}…）` });
      }
    }
  }
  return problems;
}

/**
 * 校验入库的订阅 Skill（`files`：相对生成物目录的路径 → 文本，`readSkillDir()` 的输出）。
 * 逐条返回“文件：说明”形状的问题；SKILL.md 的 frontmatter、引用、行数和全部文件的残留、凭据都查。
 */
export function checkSkill(files: ReadonlyMap<string, string>): SkillCheckProblem[] {
  const problems: SkillCheckProblem[] = [];
  const skill = files.get('SKILL.md');
  const dirName = SKILL_DIR.split('/').at(-1)!;
  const referenceFiles = new Set([...files.keys()].filter((path) => path.startsWith('references/') && path.endsWith('.md')));

  if (skill === undefined) {
    problems.push({ file: `${SKILL_DIR}/SKILL.md`, message: '缺少 SKILL.md' });
  } else {
    let frontmatter: Record<string, unknown> = {};
    let body = skill;
    try {
      const parsed = parseFrontmatter(skill, { frontmatter: 'empty-with-spaces' });
      frontmatter = parsed.frontmatter as Record<string, unknown>;
      body = parsed.content;
    } catch {
      problems.push({ file: `${SKILL_DIR}/SKILL.md`, message: 'frontmatter 解析失败' });
    }
    for (const message of checkFrontmatter(frontmatter, dirName)) {
      problems.push({ file: `${SKILL_DIR}/SKILL.md`, message });
    }
    const lines = body.split('\n');
    if (lines.length > SKILL_MAX_LINES) {
      problems.push({ file: `${SKILL_DIR}/SKILL.md`, message: `正文有 ${lines.length} 行，超过 ${SKILL_MAX_LINES} 行（NFR-07）` });
    }
    // SKILL.md 引用的参考文件都存在
    for (const match of new Set(skill.matchAll(/references\/[a-z0-9-]+\.md/g))) {
      if (!files.has(match[0])) problems.push({ file: `${SKILL_DIR}/SKILL.md`, message: `引用的 ${match[0]} 不存在` });
    }
  }

  // 路线图的每一页和 ip-tests 都有参考文件：SKILL.md 路线表里列出的 `references/<页>.md` 必须齐
  const routeRefs = [...(skill?.matchAll(/references\/([a-z0-9-]+)\.md/g) ?? [])].map((m) => m[1]!);
  const missing = new Set<string>();
  for (const id of routeRefs) {
    if (!referenceFiles.has(`references/${id}.md`)) missing.add(`references/${id}.md`);
  }
  for (const ref of missing) {
    problems.push({ file: `${SKILL_DIR}/${ref}`, message: '路线图页面或 ip-tests 缺少参考文件，运行 npm run skill 重新生成' });
  }

  for (const [path, text] of files) {
    problems.push(...checkLeftovers(`${SKILL_DIR}/${path}`, text));
    problems.push(...checkSecrets(`${SKILL_DIR}/${path}`, text));
  }
  return problems;
}
