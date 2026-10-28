# AI日报

本项目独立维护 AI日报阅读器。项目需求与迁移规格以本仓库 GitHub Issues 为准；主站为 `CaiYan12/caiyan12.github.io`，跨仓操作必须显式核对目标仓库。

当前迁移规格：[CaiYan12/ai-news #1](https://github.com/CaiYan12/ai-news/issues/1)。规格就绪不等于已授权实施；应用迁移、提交和部署按站长后续指令执行。

## Agent skills

### Issue tracker

本项目的 issue 与 spec 使用 GitHub Issues，通过 `gh` CLI 操作。见 [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)。

### Triage labels

使用五个默认角色标签，贴标签前核实是否存在。见 [docs/agents/triage-labels.md](docs/agents/triage-labels.md)。

### Domain docs

使用单上下文布局：根 `GLOSSARY.md` 与 `docs/adr/`。见 [docs/agents/domain.md](docs/agents/domain.md)。
