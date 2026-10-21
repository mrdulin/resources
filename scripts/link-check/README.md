# Link Check（README 存量链接有效性检查）

定时检查 README.md 全部条目 URL 是否可达，失效/无法验证时自动开 GitHub issue 报告；全部有效则自动关闭上一条报告 issue。引擎用成熟开源 [lychee](https://github.com/lycheeverse/lychee)（官方 `lychee-action`），本模块不含检查逻辑，只含配置与结果格式化。

## 组成

- `.github/workflows/link-check.yml` — 定时 workflow，`schedule` cron 周一 UTC 01:00（北京时间 09:00）+ `workflow_dispatch` 手动触发
- `scripts/link-check/lychee.toml` — lychee 配置（GET + 浏览器 UA、8 并发、20s 超时、重试 2 次）
- `scripts/link-check/format-report.mjs` — 三态分类格式化（lychee JSON → Markdown 报告）
- `CONTEXT.md`（仓库根）— 「失效 / 无法验证」判定口径
- `docs/adr/0002-*.md` — 运行位置与报告载体的设计决策

## 判定口径（三态）

| 结果 | 条件 | 处理 |
|---|---|---|
| 失效 | 服务器明确返回 HTTP 4xx/5xx（403、429 除外）——强信号 | 写入 issue，按「渐进清理」移除或修复条目 |
| 无法验证 | 403/429 反爬、超时、TLS 异常、HTTP/2、无效响应、连接被关闭/拒绝/失败——未能完成 HTTP 校验，结果依赖探测出口 | 单独列出，人工复核，不计入失效 |
| 格式异常 | 条目 URL 缺少 `http(s)://` 前缀 | 未参与检查，写入 issue 备注 |

> 连接级失败（被关闭/拒绝/失败）不判失效：vpngate.net 一类站点对数据中心 IP 有连接级过滤，探测点连不上 ≠ 资源死亡（浏览器经正常出口可达）。

## Issue 行为

- 有失效或无法验证条目 → 新建标题带日期的报告 issue（label `link-check`），并自动关闭上一条同类 issue（`close-previous-issue`）
- 全部有效 → 不开新 issue，自动关闭遗留的报告 issue
- 全绿周不会产生空报告 issue

## 本地调试

```bash
# 本地全量跑一遍（383 个链接，约 3~8 分钟；github.com 链接需 GITHUB_TOKEN 防限流）
GITHUB_TOKEN=<token> lychee --config scripts/link-check/lychee.toml --format json --output out.json README.md

# 只做格式化（离线）
node scripts/link-check/format-report.mjs out.json README.md
```
