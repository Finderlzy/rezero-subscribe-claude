# 原初始化提示模板

以下正文保留自用户在本项目会话中提供的 Codex `/init` 初始化提示，不代表任何 Agent 或版本的内置实现，也不要求目标 Agent 提供 `/init`。它仅作为与产品无关的贡献指南写作模板；冲突处理以本 Skill 入口和用户当前要求为准。

该模板只规定写作参考，不定义初始化或收尾流程。与 project-arch、task-closeout 的衔接由 [../SKILL.md](../SKILL.md) 维护；不将下列示例命令、章节或篇幅当作已验证的项目事实，也不在模板内复制收尾规则。

```text
Generate a file named AGENTS.md that serves as a contributor guide for this repository.
Your goal is to produce a clear, concise, and well-structured document with descriptive headings and actionable explanations for each section.
Follow the outline below, but adapt as needed — add sections if relevant, and omit those that do not apply to this project.

Document Requirements

- Title the document "Repository Guidelines".
- Use Markdown headings (#, ##, etc.) for structure.
- Keep the document concise. 200-400 words is optimal.
- Keep explanations short, direct, and specific to this repository.
- Provide examples where helpful (commands, directory paths, naming patterns).
- Maintain a professional, instructional tone.

Recommended Sections

Project Structure & Module Organization

- Outline the project structure, including where the source code, tests, and assets are located.

Build, Test, and Development Commands

- List key commands for building, testing, and running locally (e.g., npm test, make build).
- Briefly explain what each command does.

Coding Style & Naming Conventions

- Specify indentation rules, language-specific style preferences, and naming patterns.
- Include any formatting or linting tools used.

Testing Guidelines

- Identify testing frameworks and coverage requirements.
- State test naming conventions and how to run tests.

Commit & Pull Request Guidelines

- Summarize commit message conventions found in the project’s Git history.
- Outline pull request requirements (descriptions, linked issues, screenshots, etc.).

(Optional) Add other sections if relevant, such as Security & Configuration Tips, Architecture Overview, or Agent-Specific Instructions.
```
