# 发布与恢复

独立项目的 `.github/workflows/pages.yml` 对 main 的推送执行冻结安装、类型检查、构建及 Chromium 阅读和取数测试，然后上传 `dist` 并部署到 GitHub Pages。Pull request 执行检查但不部署。站点地址为 <https://caiyan12.github.io/ai-news/>；`vite.config.ts` 的 base 是 `/ai-news/`。使用仓库 Settings → Pages 的 GitHub Actions 发布源。部署状态与站点实际内容都应核验，流水线成功本身不证明浏览器可用。

切换或恢复前保存当前主站成功 Pages 运行的提交、artifact、校验值，以及可用的独立站部署提交。旧主站产物是整个站点，不是仅日报的备份；重新部署整个旧产物可能覆盖之后的主站更新。避免强推或重置任一仓库，也不要清空用户浏览器存储。

本次切换前留存的主站运行是 [40640553498](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/40640553498)，提交 `80fee3da65c2c34975d99d69775d70083d8d5f55`，artifact ID `12795366450`。下载并验证后的文件及清单保存在站长的迁移证据目录，包含旧日报与主站全部资源；应在后续需要时重新确认备份可用及有效期。恢复出的产物已在本地浏览器演练旧日报阅读，尚未实际进行线上回滚。

出现关键故障时，先记录正在服务的 URL、部署和异常。可在独立仓库 Pages 设置中取消发布当前项目站点，再检查原地址实际返回哪个产物；GitHub 的文档没有保证此重叠路径的回退顺序。在 T6 清理主站之前，若主站 main 仍包含旧日报，可以从主站 Actions 的 `Deploy to GitHub Pages` 手动运行工作流重建并部署当前 main；它会构建整个主站，且依赖构建期取数，产物不等同于已保存的旧 artifact。

另一条可尝试路径是重跑上述旧运行的部署 job。先确认当前主站与整个旧产物的差异，并检查 artifact 仍未过期；该 artifact 当时的到期时间为 `2026-10-29T05:54:37Z`。以下命令选中的数据库 job ID 来自 `gh run view`，重跑会影响整个主站：

```powershell
gh api repos/CaiYan12/caiyan12.github.io/actions/artifacts/12795366450 --jq '{expired,expires_at,digest}'
gh run view 40640553498 --repo CaiYan12/caiyan12.github.io --json jobs --jq '.jobs[] | {name,databaseId}'
gh run rerun 40640553498 --repo CaiYan12/caiyan12.github.io --job 122657956807
gh run watch 40640553498 --repo CaiYan12/caiyan12.github.io
```

`gh run rerun --help` 说明指定 job 时包含依赖；是否复用原 artifact、是否重新构建及项目站点取消发布后实际路径如何回退，均须根据运行日志与线上结果确认，不能预先宣称此命令已完成恢复。GitHub 只允许在原运行后 30 天内重跑，artifact 也可能更早过期。保存在本地的 tar 和逐文件清单已完成本地恢复演练，但目前没有验证过直接将此本地 tar 重新上传部署的流程；它不能被当成已验证的线上恢复命令。

恢复后逐项验证主站、日报资源、旧详情直达和阅读交互，并记录缓存传播延迟及实际结果。项目站点可通过成功的 Actions 部署重新发布。上述线上切换和回滚的可用性必须以实际结果为准，不承诺零中断。

GitHub 官方说明：[自定义 Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[取消发布和重新发布](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site)、[重跑工作流与 job](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)。
