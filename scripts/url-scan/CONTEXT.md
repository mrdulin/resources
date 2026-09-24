# URL Security Scan

PR 新增链接安全扫描：从 PR diff 的新增行提取站点链接，用 VirusTotal 判定安全性，结果回写 PR 会话，恶意链接时通过 required check 阻断合并。

## Language

**扫描进度（Progress）**:
扫描进行中的中间反馈，逐 URL 更新（已完成判定、扫描中、待扫描），承载于占位评论；属于易逝状态，扫描完成后即被报告覆盖、不留存。
_Avoid_: 实时状态、中间报告

**扫描报告（Report）**:
扫描结束后的终态结论——恶意/可疑/安全判定、检出引擎明细与来源行号；覆盖占位评论，是唯一留存的扫描产出。
_Avoid_: 扫描结果（含糊，可能被理解为单 URL 判定）

**Check 状态**:
GitHub 平台对 Actions job 生命周期的展示（Expected / In progress / 通过 / 失败），出现在合并框与 Checks tab；由平台管理，文案不可定制。
_Avoid_: 扫描进度（check 状态与进度是两层东西，前者平台管、后者脚本管）

**占位评论（Placeholder comment）**:
扫描开始时创建、由进度逐次改写、最终被报告覆盖的那一条 PR 评论；全生命周期恒为一条，靠隐藏标记定位。
_Avoid_: 进度条

**阻断（Block）**:
required check（`scan-urls`）未通过时 GitHub 禁用合并按钮的机制；仅恶意判定触发，可疑只警告不阻断。
_Avoid_: 拦截

**白名单（Allowlist）**:
`.github/url-scan-allowlist.txt` 中的域名/URL 前缀规则，命中的链接不扫描、不告警，用于误报治理。
