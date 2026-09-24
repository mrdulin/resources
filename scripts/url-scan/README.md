# URL Security Scan（PR 链接安全扫描）

PR 收到或更新时，自动扫描**新增行**中的站点链接，结果以评论形式回写到 PR 会话；发现恶意链接时 check 失败，配合分支保护可阻止合并。

## 组成

- `.github/workflows/url-security-scan.yml` — workflow，`pull_request_target` 触发（opened / synchronize / reopened），job 名 `scan-urls`
- `scripts/url-scan/extract-urls.mjs` — 拉取 PR diff，提取新增行 URL（支持裸链接、markdown 链接、HTML href），去重、套白名单、单 PR 上限 20 个
- `scripts/url-scan/scan-urls.mjs` — 调 VirusTotal API v3（先查缓存报告，无则提交扫描并轮询），带 429 限流退避；扫描期间实时更新进度评论
- `scripts/url-scan/report.mjs` — 在 PR 上创建/更新报告评论（覆盖进度占位），有恶意链接时 `exit 1`
- `scripts/url-scan/lib/pr-comment.mjs` — PR 评论 upsert 共享逻辑（按隐藏标记定位同一条评论）
- `scripts/url-scan/lib/progress-comment.mjs` — "扫描进行中"进度评论渲染
- `.github/url-scan-allowlist.txt` — 白名单
- `CONTEXT.md` — 本模块术语表；`docs/adr/0001-*.md` — 进度承载方式的设计决策

## 实时进度

扫描期间 PR 上只有**一条**评论，形态随扫描演变（marker upsert，不刷屏）：

1. job 启动 -> "URL 安全扫描（进行中）"，表格列出全部链接为"待扫描"
2. 每扫完一个 URL -> 进度行 `N/20` 更新，完成的行显示判定（安全/可疑/恶意），当前扫描的显示"扫描中"
3. 扫描完成 -> 同一条评论被最终报告覆盖（结论 + 明细表 + 恶意检出引擎）

Checks tab 的实时日志同步输出 `[i/N] <url> -> 判定` 进度行。job 中途挂掉时评论停留在最后进度（带"最后更新时间"），下次 push 自动重写自愈。

## 判定规则

| 结果 | 条件 | 行为 |
|---|---|---|
| 恶意 | `malicious >= 2` 个引擎 | check 失败，阻止合并（需分支保护配合） |
| 可疑 | `malicious == 1` 或 `suspicious >= 1` | 评论警告，不阻止合并 |
| 安全 / 未扫描 | 其余 | 记录在评论中，不影响合并 |

## 必要配置

1. **Secret**：仓库 Settings > Secrets and variables > Actions，新建 `VIRUSTOTAL_API_KEY`（免费 key 配额约 4 次/分钟、500 次/天，脚本已做限流退避）。
2. **分支保护**（在 workflow 合入默认分支后配置）：Settings > Branches > 分支保护规则（`master`）> 勾选 *Require status checks to pass*，搜索并选中 `scan-urls`。

## 安全说明

workflow 使用 `pull_request_target` 以便 fork PR 也能写评论，但**不会执行 PR 引入的代码**：checkout 的是 base 分支，脚本只通过 API 读取 PR 的 diff 文本做分析。

## 本地调试

```bash
# 用本地 diff 文件测试提取（不访问网络）
node scripts/url-scan/extract-urls.mjs   # 先设置 URL_SCAN_DIFF_FILE=<diff文件>

# 测试评论渲染（不调用 GitHub API）
URL_SCAN_DRY_RUN=1 node scripts/url-scan/report.mjs
```
