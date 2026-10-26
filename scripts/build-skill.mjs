#!/usr/bin/env node
// 开发脚本（V14 建立，架构 §16.3、ADR-0007）：从重写稿生成订阅 Skill，写进 agent-skill/rezero-subscribe-claude/。
//
// 用法：npm run skill
//
// 生成逻辑在 src/lib/agent-skill/（TypeScript，和构建校验共用一份），这里用 Vite 的 runnerImport 加载它
// （reuse-research §5.2 已验证）。只写内容有变化的文件，删掉生成结果里没有的文件；连跑两次第二次没有改动。
// 改重写稿、改 agent-skill/source/、改 src/lib/group.ts、升版本之后都要运行，否则 npm run check 会报生成物对不上。

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { runnerImport } from 'vite';

const repoRoot = resolve(import.meta.dirname, '..');
const lib = (name) => join(repoRoot, 'src/lib/agent-skill', name);
// 不读任何 Vite 配置文件：这里只是借 Vite 的模块解析加载 TS
const inline = { configFile: false, logLevel: 'error' };
const [{ module: load }, { module: skill }] = await Promise.all([
  runnerImport(lib('load.ts'), inline),
  runnerImport(lib('index.ts'), inline),
]);

let generated;
try {
  generated = load.generateFromRepo(repoRoot);
} catch (error) {
  if (!Array.isArray(error?.problems)) throw error;
  console.error(`订阅 Skill 生成失败，共 ${error.problems.length} 处：`);
  console.error(error.message);
  process.exit(1);
}

const outDir = join(repoRoot, skill.SKILL_DIR);
const existing = load.readSkillDir(outDir);
const written = [];
const removed = [];
for (const [path, text] of generated.files) {
  const file = join(outDir, path);
  if (existsSync(file) && readFileSync(file, 'utf8') === text) continue;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  written.push(path);
}
for (const path of existing.keys()) {
  if (generated.files.has(path)) continue;
  rmSync(join(outDir, path));
  removed.push(path);
}

console.log(`订阅 Skill 已生成：${skill.SKILL_DIR}/（${generated.files.size} 个文件，写入 ${written.length} 个，删除 ${removed.length} 个）`);
for (const path of written) console.log(`  写入 ${path}`);
for (const path of removed) console.log(`  删除 ${path}`);
