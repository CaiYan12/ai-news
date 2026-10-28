# 来源与许可范围

本仓库是独立 Git 历史，起始配置提交为 `48373371c68d0ade125e620515981d0c55a98dc0`。应用提取提交 `5ebe5fc` 的起点为 [主站](https://github.com/CaiYan12/caiyan12.github.io) 的 `80fee3da65c2c34975d99d69775d70083d8d5f55`：`src/` 中的阅读器来自主站的 `src/ai-news/`，并调整了独立入口与基路径。主站记录中接入提交 `3f9ade87aaa410cad3280961c3b9941eb59aea11` 的作者为 WindowsIt。主站 README 当时声明其自身没有 LICENSE，代码和内容版权归站长。站长为本独立项目的代码和文档选择 MIT，见 [LICENSE](LICENSE)。此选择不改变第三方材料的权利。

- `public/avatar.webp` 与主站基线 `public/images/avatar.webp` 的 SHA-256 均为 `cfc942c024e8d9ff646471414a6cd9a404aa7ba263b65cf249cbb3ea645a708e`。它是站点头像；此核对只证明文件一致，未确定头像的原始创作者或授权，因此不将头像声称为 MIT。
- `public/snapshot/juya.xml` 与主站基线 `public/ai-news/snapshot/juya.xml` 的 SHA-256 均为 `412c34ac8cf19703878705fe221df4f1211b3d8da8ce5e1a9a4878880669c08b`。它是橘鸦 AI 早报 RSS 的历史快照，内容与引用的远程图片归各自权利人；不属于本项目 MIT 授权。实时源为 `https://daily.juya.uk/rss.xml`。
- 运行依赖按各自许可分发：DOMPurify 3.4.16 为 MPL-2.0 或 Apache-2.0，lucide-react 1.38.0 为 ISC，React / React DOM 19.2.8 和 Zustand 5.0.15 为 MIT。版本与完整依赖树以 `pnpm-lock.yaml` 为准；各包的许可文件随包提供。开发工具也有各自许可，例如 Playwright 和 TypeScript 为 Apache-2.0。

快照不是完整离线包：页面和资源仍须加载，快照中图片可能来自外部。实时源能否被浏览器读取取决于上游响应和 CORS；见 [取数说明](docs/feed-behavior.md)。
