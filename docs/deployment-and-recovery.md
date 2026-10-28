# 发布与恢复

独立仓库的 `.github/workflows/pages.yml` 对 `main` 推送或手动触发执行冻结安装、类型检查、构建、Chromium 阅读与取数检查，并部署 `dist`；PR 只检查。GitHub Pages 发布源为 GitHub Actions，地址为 <https://caiyan12.github.io/ai-news/>。查看运行时应核对实际 SHA、构建及部署结果，并在浏览器验证资源、阅读和导航；HTTP 200 与 CI 成功都不能单独证明功能可用。

## 恢复独立项目

2026-10-28 两次受控演练删除独立 Pages 配置后，重建 workflow 配置并手动触发 `main`，成功恢复独立应用；第二次成功运行是 [40661911730](https://github.com/CaiYan12/ai-news/actions/runs/40661911730)，SHA `9a1fd00f1564954946733aafa970f1bb3c9c3c5e`。恢复后禁用浏览器缓存检查了新文档身份、两视口阅读、真实 RSS 和列表图片。实际步骤须先确认期望的 `main` SHA 与仓库状态；删除、重建和部署会影响线上服务。

```powershell
gh api repos/CaiYan12/ai-news/pages
gh api repos/CaiYan12/ai-news/commits/main --jq .sha
```

仅在确认 Pages 配置不存在、且需要恢复时创建；已存在则跳过 POST。随后触发 workflow 并读取这次新运行的 ID 和结果：

```powershell
gh api --method POST repos/CaiYan12/ai-news/pages -f build_type=workflow
gh api --method POST repos/CaiYan12/ai-news/actions/workflows/pages.yml/dispatches -f ref=main
gh run list --repo CaiYan12/ai-news --workflow pages.yml --limit 5
gh run watch <实际运行ID> --repo CaiYan12/ai-news
```

写入遇到 EOF 时先回读配置和运行列表，确认是否已经生效再决定重试。部署后核对实际 HTML 和资源身份，并在隔离浏览器检查实时源、列表、详情、收藏、导航与主站往返。边缘缓存传播并非原子操作，可能短时返回不同版本；记录时间、响应头和浏览器实际版本。

## 旧主站恢复的边界

两次删除配置后外部请求曾观察到旧主站 HTML，但生产浏览器即使禁用 CDP 缓存仍取得新 HTML；旧生产版本实际执行、旧版写入及跨版回写 **未验证**。本地同 origin 的真实旧→新→旧产物及数据回写实验通过，不能替代线上回滚证明。详细证据见 [迁移证据](migration-evidence.md)。

主站清理提交 `e683da0ed62fcf5e1f54ee93d9db3d560e7ad926` 上线后，当前主站构建已不含旧日报。若需要尝试从源码恢复旧版，先核对主站后续提交及依赖，正常 revert 清理提交并运行主站检查、构建和 Pages 部署；这会影响整个主站，恢复路线尚未演练，原入口实际返回内容也必须再验证。不要假设仅取消发布独立站即可恢复旧版。保留的旧 artifact 包含整个主站且有到期时间；本地备份直接上传部署以及重跑旧 job 是否复用原 artifact 均未验证，不作为已验证的恢复命令。

不强推或重置仓库，不清空读者存储。恢复后分别核对主站、日报资源、详情直达、阅读及状态，记录未通过项。官方资料：[自定义 Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[取消发布和重新发布](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site)。
