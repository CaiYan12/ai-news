# AI 日报

独立阅读器：[线上入口](https://caiyan12.github.io/ai-news/) · [源码与 Issues](https://github.com/CaiYan12/ai-news) · [迁移规格 #1](https://github.com/CaiYan12/ai-news/issues/1)。本机日常项目目录为 `D:\pages\ai-news`；主站 `D:\pages\myblog` 属于另一个项目。迁移结案后由站长自行在 Codex 中建立 `ai-news` 项目。

## 本地运行与检查

使用 Node.js 24 和 `package.json` 指定的 pnpm 10.26.2。以下 PowerShell 命令从独立仓库根目录运行，安装使用锁文件：

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm exec vite preview --host 127.0.0.1 --port 4322
```

预览地址为 `http://127.0.0.1:4322/ai-news/`；停止预览用 Ctrl+C。开发服务器使用 `pnpm dev`。生产构建在 `dist/`，公共路径由 `vite.config.ts` 配置。脚本的完整清单以 `package.json` 为准。

首次运行浏览器检查前安装 Chromium，然后构建并执行所需检查：

```powershell
pnpm exec playwright install chromium
pnpm build
pnpm test:journey
pnpm test:compatibility
pnpm test:feed
pnpm test:experience
pnpm test:motion
pnpm test:visual
```

测试使用隔离浏览器与本地服务；默认 `test:compatibility` 只检查新产物重启，历史新旧互操作需要显式提供旧产物。视觉及动态测试输出在 `test-results/`，可通过 `AI_NEWS_EVIDENCE` 指定其他目录。详情和历史对照命令见 [体验测试](docs/experience-tests.md)；实时源、快照和受控故障见 [取数说明](docs/feed-behavior.md)。本地检查不要求主站工作区或迁移临时目录。

## 维护与发布

需求与规格进入 [本仓库 Issues](https://github.com/CaiYan12/ai-news/issues)，主站事项进入 [主站 Issues](https://github.com/CaiYan12/caiyan12.github.io/issues)。跨仓 `gh` 操作显式指定 `--repo`；分流标签、术语和 ADR 规则见 [工程约定](AGENTS.md)。代码来源、快照和资产许可见 [SOURCES.md](SOURCES.md)。

推送独立仓库 `main` 触发 `.github/workflows/pages.yml` 检查并部署 GitHub Pages；PR 只检查。恢复操作、已验证范围与缓存限制见 [发布与恢复](docs/deployment-and-recovery.md)；历史 SHA、CI 和线上证据见 [迁移证据](docs/migration-evidence.md)。拆仓是工程归属调整，不是性能优化的证明。
