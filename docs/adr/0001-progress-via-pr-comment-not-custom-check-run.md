# 扫描进度通过 PR 评论承载，而非自建 check run

GitHub 合并框对 Actions job 产生的 check run 不支持自定义文案，扫描期间只能显示平台的固定状态（Expected / In progress），无法在其中展示逐 URL 进度；而自建 GitHub App 或 PAT 创建的 check run 虽可写合并框 output，却要求"Actions job 恒成功、由自建 check 控制阻断"的双 check 结构与额外凭证。我们决定保留 Actions 内建 check（`scan-urls`）作为唯一 required check，实时进度改由一条 PR 评论承载：扫描开始创建占位、逐 URL PATCH 更新、终态报告整体覆盖（同隐藏标记 upsert）。

## Considered Options

- **自建 check run 写合并框 output**：进度可见性最好（合并框内直接更新），但需要 PAT（checks:write）作为 secret、required check 语义拆成两半、失败路径复杂，对个人仓库维护成本不成比例——拒绝。
- **仅 Checks tab 实时日志**：零成本但入口太深，不主动呈现——保留为辅助观测，日志输出已带 `[i/N]` 序号。
