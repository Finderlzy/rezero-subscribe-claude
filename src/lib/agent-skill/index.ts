/**
 * M8 订阅 Skill 的常量（架构 §16，ADR-0007）。页面、目录、sitemap 和生成器都从这里取，不另写一份。
 * 这个文件不引用任何模块，M3 只读这里的常量（§16.11：M3 只读 M8 的常量）。
 */

/** Skill 名：frontmatter 的 `name`，也是生成物的目录名和 zip 里的顶层目录（规范要求两者相同） */
export const SKILL_NAME = 'rezero-subscribe-claude';

/** 生成物里的网址一律用正式域名，不随 SITE_URL、BASE_PATH 变化（ADR-0007 第 4 条） */
export const SKILL_SITE = 'https://re0claude.us.ci';

/** Skill 页的站内路径（发布后不能改，ADR-0007 第 5 条）；生成站内链接时交给 withBase() */
export const AGENT_SKILL_PATH = '/agent-skill/';

/** zip 的站内路径（发布后不能改） */
export const AGENT_SKILL_ZIP_PATH = `${AGENT_SKILL_PATH}${SKILL_NAME}.zip`;

/** 生成物目录（仓库相对路径），由 `npm run skill` 写出，入库，不手改 */
export const SKILL_DIR = `agent-skill/${SKILL_NAME}`;

/** 手写的源稿目录（仓库相对路径）：`SKILL.md` 模板和 `references/agent-*.md` 方法文件 */
export const SKILL_SOURCE_DIR = 'agent-skill/source';

/** 重写稿目录（仓库相对路径），参考文件从这里生成（FR-101） */
export const REWRITE_DIR = 'docs/v3-rewrite';
