#!/usr/bin/env node
/**
 * 三态报告格式化：lychee JSON 结果 -> Markdown 报告（stdout）
 *
 * 用法: node format-report.mjs <lychee.json> [readme.md]
 * 分类口径见仓库 CONTEXT.md「链接检查」：失效 / 无法验证 / 格式异常。
 * 检查引擎是 lychee，本脚本只做结果分类与渲染。
 */
import fs from 'node:fs';

const [jsonPath, readmePath = 'README.md'] = process.argv.slice(2);
if (!jsonPath) {
  console.error('usage: node format-report.mjs <lychee.json> [readme.md]');
  process.exit(2);
}
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// lychee 0.24：HTTP 失败在 error_map，超时独立在 timeout_map，条目均含 span.line（README 行号）
const failures = [
  ...Object.values(data.error_map ?? {}).flat(),
  ...Object.values(data.timeout_map ?? {}).flat(),
];

const statusText = (e) =>
  typeof e.status === 'string' ? e.status : e.status?.text ?? '';
const statusCode = (e) => (typeof e.status === 'object' ? e.status?.code : undefined);
const lineOf = (e) => e.span?.line ?? 0;

function classify(e) {
  const code = statusCode(e);
  const text = statusText(e);
  if (code === 403 || code === 429) return 'unverifiable'; // 反爬
  if (/timed?\s*out/i.test(text)) return 'unverifiable'; // 超时
  if (/\b(ssl|tls)\b|certificat|http\/2|invalid response/i.test(text)) return 'unverifiable';
  return 'broken'; // 其余 4xx/5xx、DNS 解析失败、连接拒绝等
}

// 状态列精简文案
function label(e) {
  const code = statusCode(e);
  if (code) return `HTTP ${code}`;
  const text = statusText(e);
  const map = [
    [/timed?\s*out/i, '超时'],
    [/file not found/i, '被当作本地路径解析'],
    [/connection failed|name.*resolv|no such host/i, '连接失败 / DNS 解析失败'],
    [/connection closed|reset|aborted/i, '连接被关闭'],
    [/http\/2/i, 'HTTP/2 协议错误'],
    [/invalid response/i, '无效响应'],
    [/\b(ssl|tls)\b|certificat/i, 'TLS 异常'],
  ];
  for (const [re, s] of map) if (re.test(text)) return s;
  return text.slice(0, 60) || '未知错误';
}

// 格式异常：README 中缺 http(s) 前缀的条目 URL（TOC 锚点 # 开头不算）。
// lychee 会把这类 URL 当相对路径产出 file:// 伪记录，从失效/无法验证中剔除避免双报。
const malformed = [
  ...new Set(
    (fs.readFileSync(readmePath, 'utf8').match(/\[[^\]]*\]\(([^)\s]+)/g) ?? [])
      .map((m) => m.slice(m.indexOf('](') + 2))
      .filter((u) => !u.startsWith('#') && !/^https?:\/\//i.test(u)),
  ),
];
const isMalformed = (url) => malformed.some((m) => url.includes(m));
const checked = failures.filter((e) => !isMalformed(e.url));

const broken = checked.filter((e) => classify(e) === 'broken').sort((a, b) => lineOf(a) - lineOf(b));
const unverifiable = checked.filter((e) => classify(e) === 'unverifiable').sort((a, b) => lineOf(a) - lineOf(b));

const table = (list) => [
  '| URL | 状态 | README 行号 |',
  '|---|---|---|',
  ...list.map((e) => `| ${String(e.url).replaceAll('|', '\\|')} | ${label(e)} | ${lineOf(e)} |`),
  '',
];

const lines = [
  `# Link Check Report - ${new Date().toISOString().slice(0, 10)}`,
  '',
  `来源：\`README.md\` · 引擎：lychee · 唯一链接 ${data.unique ?? '?'} 个 · 有效 ${data.successful ?? '?'} / 失效 ${broken.length} / 无法验证 ${unverifiable.length} / 格式异常 ${malformed.length}`,
  '',
];

if (broken.length > 0) {
  lines.push(
    `## 失效链接（${broken.length}）`,
    '',
    '判定：HTTP 4xx/5xx（403、429 除外）、DNS 解析失败、连接拒绝。按「渐进清理」顺手移除或修复条目。',
    '',
    ...table(broken),
  );
}
if (unverifiable.length > 0) {
  lines.push(
    `## 无法验证（${unverifiable.length}）`,
    '',
    '判定：403/429 反爬拦截、超时、TLS 异常。站点可能存活，需人工复核，不计入失效。',
    '',
    ...table(unverifiable),
  );
}
if (malformed.length > 0) {
  lines.push(
    `## 格式异常（${malformed.length}）`,
    '',
    '条目 URL 缺少 `http(s)://` 前缀，未参与检查。',
    '',
    ...malformed.map((u) => `- \`${u}\``),
    '',
  );
}
if (broken.length === 0 && unverifiable.length === 0 && malformed.length === 0) {
  lines.push('全部链接有效。', '');
}
console.log(lines.join('\n'));
