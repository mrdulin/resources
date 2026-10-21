# 链接检查跑在 GitHub Actions 定时 workflow，报告以 issue 承载

README 存量条目链接的周期性有效性检查由 lychee（经官方 `lychee-action`）在 Actions cron（每周一 UTC 01:00，北京时间 09:00）执行；有失效或无法验证条目时经 `create-issue-from-file` 新建标题带日期的报告 issue 并收敛旧 issue，全绿轮不开 issue 且自动关闭遗留报告 issue。检查引擎采用成熟开源 lychee 而非自写脚本；三态判定（失效 / 无法验证 / 格式异常，口径见 CONTEXT.md）由仓库内 `format-report.mjs` 对 lychee JSON 结果做分类渲染。

## Considered Options

- **本机定时自动化 + 直连失败后走代理重试**：README 内 YouTube 等被墙站点直连必超时误报，代理重试只为一小撮链接引入一整层故障面（代理不可用则全军覆没），且依赖本机开机与本地工具链——拒绝。GitHub runner 无墙，被墙误报从根上消失。
- **报告写仓库文件（reports/ 目录）**：留痕在仓库但入口深、无提醒，读者不会主动翻报告；issue 主动呈现在 GitHub 首页且自带关单生命周期——拒绝。
