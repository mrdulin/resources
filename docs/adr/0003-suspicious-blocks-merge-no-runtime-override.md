# 恶意与可疑链接均阻断合并，且运行期无人工放行

`url-scan` 此前仅对恶意链接（`malicious >= 2`）令 required check `scan-urls` 失败以阻止合并，可疑链接（`malicious == 1` 或 `suspicious >= 1`）仅作评论警告、不阻断。我们决定把可疑与恶意同等对待：任一命中即令 check 失败、禁止合并；且运行期不开放任何人工复核/放行通道，白名单（`.github/url-scan-allowlist.txt`）是唯一且须预先经 PR 合入配置的例外。理由：收录仓库的链接直接面向读者，可疑链接（哪怕仅单引擎标毒/可疑）属于不可接受的风险敞口；"人工确认"在实践中会退化为维护者随手放行，使扫描的意义落空。

## Considered Options

- **维持可疑仅警告（现状）**：与"可疑链接不能合并"的诉求直接相悖——拒绝。
- **收紧可疑为 `suspicious >= 2` 才阻断**：在噪声治理上更稳，但用户在 grill 中明确选择字面执行现有口径（可疑即 `suspicious >= 1` 或 `malicious == 1` 即阻断），优先覆盖而非降噪——拒绝。
- **保留维护者运行期人工复核后门**：用户选择绝对化，避免"可疑→人工放行"退化成实质不阻断——拒绝。

## Consequences

- 合法的新域名、短链、部分 CDN 被单引擎标可疑时会误伤；贡献者只能经"提 PR 将域名加入白名单"这一预先配置例外解锁，无法在运行期请求临时放行。
- 分支保护必须勾选 *Do not allow bypassing the above settings*，否则维护者仍可在 GitHub 上绕过 required check 强行合并，使本政策落空（已在 `scripts/url-scan/README.md` 配置说明中标注）。
- 实现：`report.mjs` 的失败判定从 `malicious > 0` 扩展为 `malicious > 0 || suspicious > 0`，并改写报告文案（去除"请人工确认"、可疑结论改为阻断、页脚规则与检出明细同步）。`scan-urls.mjs` 的 `verdict` 分类口径保持不变。
- 本决策仅作用于 `url-scan`（安全 / 阻断链路），不影响 `link-check`（存量有效性 / 报告 issue / 不阻断）的独立行为。

