# Issue tracker: GitHub

本项目的 issue 与 spec 放在 `CaiYan12/ai-news` 的 GitHub Issues，使用 `gh` CLI 操作。

跨仓操作显式指定 `--repo CaiYan12/ai-news`；涉及主站的票据单独使用 `CaiYan12/caiyan12.github.io`，正文互链，不能依赖当前工作目录猜测仓库。

多行正文先以 UTF-8 写入文件，再使用 `--body-file`；在 PowerShell 中不使用 Bash heredoc。

**PRs as a request surface: no.**

技能要求 publish to the issue tracker 时创建 issue；要求 fetch the relevant ticket 时读取该 issue 的正文、标签与评论。

使用 `/wayfinder` 时，先读取当前安装技能的操作契约并核实目标仓库的标签、sub-issues 与 dependencies 能力，再建立关系。不能照搬主站历史编号或数据库 id。
