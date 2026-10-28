# AI日报

本项目独立维护 AI日报阅读器。项目需求与迁移规格以本仓库 GitHub Issues 为准；主站为 `CaiYan12/caiyan12.github.io`，跨仓操作必须显式核对目标仓库。

迁移规格：[CaiYan12/ai-news #1](https://github.com/CaiYan12/ai-news/issues/1)。规格正文保留当时的阶段状态；实际实施与验收记录见 [迁移证据](docs/migration-evidence.md)。日常维护入口和命令见 [README](README.md)。

## Agent skills

### Issue tracker

本项目的 issue 与 spec 使用 GitHub Issues，通过 `gh` CLI 操作。见 [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)。

### Triage labels

使用五个默认角色标签，贴标签前核实是否存在。见 [docs/agents/triage-labels.md](docs/agents/triage-labels.md)。

### Domain docs

使用单上下文布局：根 `GLOSSARY.md` 与 `docs/adr/`。见 [docs/agents/domain.md](docs/agents/domain.md)。
