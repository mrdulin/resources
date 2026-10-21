#!/usr/bin/env node
/**
 * 从 PR diff 的新增行中提取 URL。
 * 输出: ${URL_SCAN_DATA_DIR:-url-scan-data}/extracted.json
 *
 * 环境变量:
 *   GITHUB_TOKEN / PR_NUMBER / GITHUB_REPOSITORY   CI 环境（通过 API 拉取 diff）
 *   URL_SCAN_DIFF_FILE                             本地调试: 直接读取本地 diff 文件
 *   URL_SCAN_MAX_URLS                              单 PR 最多扫描链接数，默认 20
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.URL_SCAN_DATA_DIR || 'url-scan-data';
const MAX_URLS = Number(process.env.URL_SCAN_MAX_URLS || 20);
const API = 'https://api.github.com';

async function fetchDiff() {
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !pr || !token) {
    throw new Error('缺少 GITHUB_REPOSITORY / PR_NUMBER / GITHUB_TOKEN（或用 URL_SCAN_DIFF_FILE 指定本地 diff）');
  }
  const res = await fetch(`${API}/repos/${repo}/pulls/${pr}`, {
    headers: {
      Accept: 'application/vnd.github.diff',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'url-security-scan-bot',
    },
  });
  if (!res.ok) throw new Error(`获取 PR diff 失败: HTTP ${res.status}`);
  return res.text();
}

// 不含 ) ] > 引号 空白 —— 覆盖 markdown [t](url)、href="url"、裸链接等常见写法
const URL_RE = /https?:\/\/[^\s<>"'`\\)\]]+/gi;

function cleanUrl(raw) {
  return raw
    .replace(/[)\]}'"]+$/g, '')
    .replace(/[.,;:!?。．，；：！？…、」』）】》]+$/g, '');
}

/** 解析 unified diff，返回新增行的 { url, file, line } 列表（line 为新文件行号） */
function parseAddedLines(diffText) {
  const out = [];
  let file = null;
  let line = 0;
  for (const raw of diffText.split(/\r?\n/)) {
    if (raw.startsWith('+++ ')) {
      const m = raw.match(/^\+\+\+ b\/(.+?)(?:\t.*)?$/);
      file = m ? m[1] : null;
      continue;
    }
    if (raw.startsWith('@@')) {
      const m = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) line = Number(m[1]);
      continue;
    }
    if (file == null) continue;
    if (raw.startsWith('+')) {
      for (const match of raw.slice(1).matchAll(URL_RE)) {
        const url = cleanUrl(match[0]);
        if (url.length > 8) out.push({ url, file, line });
      }
      line += 1;
    } else if (raw.startsWith('-') || raw.startsWith('\\')) {
      // 删除行 / "\ No newline" 标记，不影响新文件行号
    } else {
      line += 1;
    }
  }
  return out;
}

function loadAllowlist() {
  const p = '.github/url-scan-allowlist.txt';
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function isAllowlisted(url, rules) {
  let host;
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    return false;
  }
  return rules.some((rule) => {
    const r = rule.toLowerCase().replace(/\/+$/, '');
    if (/^https?:\/\//.test(r)) return url.toLowerCase().startsWith(r);
    return host === r || host.endsWith('.' + r);
  });
}

async function main() {
  const diffText = process.env.URL_SCAN_DIFF_FILE
    ? readFileSync(process.env.URL_SCAN_DIFF_FILE, 'utf8')
    : await fetchDiff();

  const allowlist = loadAllowlist();
  const added = parseAddedLines(diffText);

  const allowlisted = [];
  const unique = new Map();
  for (const { url, file, line } of added) {
    if (isAllowlisted(url, allowlist)) {
      if (!allowlisted.includes(url)) allowlisted.push(url);
      continue;
    }
    if (!unique.has(url)) unique.set(url, { url, occurrences: [] });
    unique.get(url).occurrences.push({ file, line });
  }

  const all = [...unique.values()];
  const scanned = all.slice(0, MAX_URLS);
  const overflow = all.slice(MAX_URLS);

  const result = {
    added_line_urls: added.length,
    unique_count: all.length,
    allowlisted,
    scanned,
    overflow: overflow.map((e) => e.url),
  };

  mkdirSync(DATA_DIR, { recursive: true });
  const out = path.join(DATA_DIR, 'extracted.json');
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(
    `新增行共提取 URL ${added.length} 个，去重 ${all.length} 个，` +
      `白名单跳过 ${allowlisted.length} 个，待扫描 ${scanned.length} 个，超出上限 ${overflow.length} 个`
  );
  console.log(`结果已写入 ${out}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
