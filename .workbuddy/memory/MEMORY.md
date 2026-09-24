# resources 仓库长期记忆

## 仓库约定

- GitHub 仓库 `mrdulin/resources`（public），默认分支 `master`，push 凭据在 git credential manager；环境变量 `GH_TOKEN` 无效（401），需要 GitHub API 时用 `git credential fill` 取 token。
- 仓库用 grill-with-docs 工作流推进特性；根 `CONTEXT.md` 是 glossary（收录标准 / 条目与分类 / 链接检查三组术语）；`docs/adr/` 有 ADR（0001 PR 评论承载进度、0002 链接检查跑 Actions）。
- 两个 CI 模块：`scripts/url-scan`（PR 新增链接**安全性**，VirusTotal，required check `scan-urls`）与 `scripts/link-check`（README 存量链接**有效性**，lychee，每周一北京 09:00 cron + 报告 issue label `link-check`）——安全与有效性是两条独立链路，勿混淆。

## link-check 术语口径（CONTEXT.md 已收录）

- 失效链接 = 服务器明确返回 HTTP 4xx/5xx（403/429 除外）——强信号；无法验证 = 403/429 反爬、超时、TLS 异常、HTTP/2、无效响应、**连接被关闭/拒绝/失败**（lychee JSON 不区分 DNS 与 TCP 失败，均为泛化 "Connection failed" 文案，故连接级失败整体不判失效）；格式异常 = URL 缺 http(s) 前缀。
- 连接级失败不判失效的依据：vpngate.net 一类站点对数据中心 IP 有连接级过滤（2026-09-24 用户实证浏览器可达、runner 被掐），探测点连不上 ≠ 资源死亡。
- 报告 issue 行为：有发现才开新单（标题带日期）、自动关闭旧单；全绿轮不开单并清掉遗留单。

## 技术坑（link-check 相关）

- lychee 0.24：`exclude_mail` 已废弃；`include_fragments` 是枚举（none/anchor-only/text-only/full）；超时在 `timeout_map` 与 error_map 分离；`span.line` 含 README 行号。
- lychee-action：args 禁写 `--output`（会报错）；`format: json` 必须显式（否则 markdown 尾注污染 JSON）。
- `peter-evans/create-issue-from-file` v5/v6 没有 close-previous-issue 输入（社区旧文有误），需手动按 label 收敛。
- 本机沙箱会拦截 80 端口明文 HTTP，本地 lychee 试跑结果含伪影（连接失败/超时虚高），以 runner 结果为准。
