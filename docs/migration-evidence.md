# 迁移证据索引（2026-10-28）

迁移规格 [#1](https://github.com/CaiYan12/ai-news/issues/1) 的阶段文字保留其发布时状态；实际实施分别见 [T1 #2](https://github.com/CaiYan12/ai-news/issues/2)、[T2 #3](https://github.com/CaiYan12/ai-news/issues/3)、[T3 #4](https://github.com/CaiYan12/ai-news/issues/4)、[T4 #5](https://github.com/CaiYan12/ai-news/issues/5)、[T5 #6](https://github.com/CaiYan12/ai-news/issues/6)、[主站 T6 #109](https://github.com/CaiYan12/caiyan12.github.io/issues/109) 和 [交接 T7 #7](https://github.com/CaiYan12/ai-news/issues/7)。父规格不因子票完成自动关闭。来源基线与许可见 [SOURCES.md](../SOURCES.md)。

## 本地

- T1 独立阅读与生产构建；T2 同协议、主机、端口下实际旧→新→旧产物，含缓存有无、记录、设置及回写通过。存储键 `ai-daily:v1`、`version: 1` 与 GUID 保持兼容；这是本地实验，不是旧生产浏览器回滚的证明。
- T3 覆盖实时、刷新、缓存、快照回退、双失败、通用阅读及消毒。迁移有意修复旧版实时成功后刷新按钮持续禁用；T4 有意修复快速导航时旧回调覆盖新 URL 和重复目标被吞掉。两项是经过复现的行为修正，不称作零行为差异。
- T4 对五模板 × 亮暗 × 列表/详情 × 两视口进行了 40 对新旧截图及几何、文字核对；固定数据、时间和受控图片，不是实机手机，也不证明线上远程图片。刷新按钮和浏览器标题为已知差异；截图并非像素完全相同。动态测试记录状态、事件和帧，覆盖正常、减少动态及不支持过渡路径。

## CI 与线上

- 独立项目部署时远端 `main` 为 `9a1fd00f1564954946733aafa970f1bb3c9c3c5e`；[首次部署 40658567866](https://github.com/CaiYan12/ai-news/actions/runs/40658567866)、[恢复 40660203653](https://github.com/CaiYan12/ai-news/actions/runs/40660203653)、[最终恢复 40661911730](https://github.com/CaiYan12/ai-news/actions/runs/40661911730) 成功。
- 主站清理后远端 `main` 为 `e683da0ed62fcf5e1f54ee93d9db3d560e7ad926`；[Lint 40664176984](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/40664176984)、[Check 40664177171](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/40664177171)、[Deploy 40664177065](https://github.com/CaiYan12/caiyan12.github.io/actions/runs/40664177065) 成功。Check 的 Astro Build job 为 skipped；Deploy 实际完成完整构建。其 artifact 不含旧日报目录、保留 sitemap 原 URL；线上主站 HTML 与 artifact 字节一致。
- 清理后隔离 Chromium 在 1280×900、390×844 从真实主站导航进入日报，完成列表、详情、刷新、收藏重入及返回主站；线上应用资源哈希与发布前一致。实际 RSS 可用；另一次恢复后使用真实 RSS 和远程图片验证列表图片解码。这些是浏览器模拟视口，不是实际手机或所有网络条件。
- 两次演练中外部 GET 曾返回旧 HTML，但生产浏览器旧版本身份未通过，包括一次 CDP 禁用缓存；旧生产版本执行与回写未验证。重建独立 Pages 后的新项目恢复已验证。操作与余下限制见 [发布与恢复](deployment-and-recovery.md)。

## 证据位置与后续

公开 Issue 评论与上述 Actions 运行是可长期访问的索引。原始日志、响应头、浏览器记录和截图的本机归档为 `D:\pages\ai-news-migration-20261028\`：`T1-result.md`–`T6-result.md`、`T4-matrix-release/`、`T5-corrective-drill.json`、`T5-settled-media.json`、`T6-live.json` 和 `T6-hashes.json`。此归档是可选历史证据，日常安装、测试和发布不依赖它；其可用性不作长期保证。

旧版生产回滚与主站源码恢复仍未验证，归部署维护者；头像原始创作者及授权仍未知，归资产维护者，不能声明为 MIT。橘鸦内容与第三方资产各有权利人。拆仓没有证明性能改善；性能目标另行评估。
