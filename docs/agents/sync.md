# 文章同步

改了文章（`docs/v3-rewrite/` 的 11 页、参考页、附件）之后**不自动**同步，作者说了才同步。

- **Writing**（`~/Workspace/writing`，作者博客）：作者要求同步时，11 页单版本按 Writing 的目录和链接规则落到博客里，先 diff 再改，保留 Writing 已有的改写和 frontmatter 的 `slug`；在 Writing 里单独提交，信息写“同步订阅教程：……”。规则以 Writing 的 `docs/AGENTS.md` 为准；旧口径见 git 历史。
- **大肥鱼**（`~/Workspace/dafeiyu`）：本仓库合并后，在 `MaiBot-1.2.4/plugins/dafeiyu_tutorial_qa/` 运行 `python3 build_corpus.py ~/Workspace/rezero-subscribe-claude` 重新生成 `corpus.json`（记录本仓库的提交号），再按该目录 `README.md` 同步到服务器、重启 core。上服务器会影响线上群，先问用户；大肥鱼仓库不自动提交，在它的 `docs/project-board.md` 登记，规则以它的 `AGENTS.md` 为准。
