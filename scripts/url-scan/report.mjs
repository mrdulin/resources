#!/usr/bin/env node
/**
 * 汇总扫描结果，在 PR 上创建/更新扫描报告评论（带隐藏标记，避免每次 push 刷屏）。
 * 存在恶意链接时以退出码 1 结束 -> job 的 check 失败，
 * 配合分支保护 Required status check（"scan-urls"）即可阻止合并。
 *
 * 环境变量: GITHUB_TOKEN / PR_NUMBER / GITHUB_REPOSITORY
 * 本地调试: URL_SCAN_DRY_RUN=1 只打印评论内容，不调用 GitHub API
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.URL_SCAN_DATA_DIR || 'url-scan-data';
const API = 'https://api.github.com';
const MARKER = '<!-- url-scan-bot:v1 -->';
const MAX_TABLE_ROWS = 50;

const LABEL = {
  malicious: '**恶意**',
  suspicious: '**可疑**',
  clean: '安全',
  not_scanned: '未扫描',
};

function load(name) {
  const p = path.join(DATA_DIR, name);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

function fmtOccurrences(entry) {
  const occ = entry.occurrences || [];
  const shown = occ.slice(0, 3).map((o) => `\`${o.file}:${o.line}\``);
  const more = occ.length > 3 ? '<br>等' : '';
  return shown.join('<br>') + more;
}

function buildComment(extracted, scan) {
  const uniqueCount = extracted?.unique_count || 0;
  const lines = [MARKER, '## URL 安全扫描报告', ''];

  if (!scan) {
    lines.push(
      `本 PR 新增行中发现 ${uniqueCount} 个站点链接，但扫描结果缺失（scan 步骤可能失败），请查看 Actions 运行日志。`,
      '',
      '---',
      '> 由 `URL Security Scan` workflow 自动生成，评论会被后续扫描更新。'
    );
    return lines.join('\n');
  }

  const results = scan.results || [];
  const counts = {
    malicious: results.filter((r) => r.verdict === 'malicious').length,
    suspicious: results.filter((r) => r.verdict === 'suspicious').length,
    clean: results.filter((r) => r.verdict === 'clean').length,
    not_scanned: results.filter((r) => r.verdict === 'not_scanned').length,
  };

  if (uniqueCount === 0) {
    lines.push('本次 PR 的新增行中**未发现可扫描的站点链接**。');
    lines.push('', '---', '> 由 `URL Security Scan` workflow 自动生成，评论会被后续扫描更新。');
    return lines.join('\n');
  }

  if (counts.malicious > 0) {
    lines.push(
      `**结论：发现 ${counts.malicious} 个恶意链接，本 check 将失败并阻止合并。**`,
      '请移除相关链接；确认属于误报时，可将其加入 `.github/url-scan-allowlist.txt`。'
    );
  } else if (counts.suspicious > 0) {
    lines.push(`**结论：发现 ${counts.suspicious} 个可疑链接，仅作警告、不阻止合并。**请人工确认。`);
  } else {
    lines.push('**结论：全部扫描通过，未发现恶意或可疑链接。**');
  }
  lines.push('');

  const rows = results
    .filter((r) => r.verdict !== 'clean')
    .slice(0, MAX_TABLE_ROWS)
    .map((r) => {
      const link = r.reportLink ? `[${r.url}](${r.reportLink})` : r.url;
      const detail =
        r.verdict === 'not_scanned'
          ? r.reason || '未知原因'
          : `${r.malicious} 个引擎报毒 / ${r.suspicious} 个可疑`;
      return `| ${LABEL[r.verdict]} | ${link} | ${fmtOccurrences(r)} | ${detail} |`;
    });
  if (rows.length) {
    lines.push('| 判定 | 链接（指向 VirusTotal 报告） | 来源 | 详情 |', '|---|---|---|---|', ...rows, '');
  }

  const malicious = results.filter((r) => r.verdict === 'malicious' && r.engines?.length);
  if (malicious.length) {
    lines.push('<details>', '<summary>恶意链接检出明细</summary>', '');
    for (const r of malicious) {
      lines.push(`- \`${r.url}\``);
      for (const e of r.engines) lines.push(`  - ${e}`);
    }
    lines.push('', '</details>', '');
  }

  const notes = [];
  if (counts.clean > 0) notes.push(`安全 ${counts.clean} 个`);
  if (counts.not_scanned > 0) notes.push(`未能完成扫描 ${counts.not_scanned} 个（详见上表）`);
  if (extracted?.overflow?.length)
    notes.push(
      `超出单次上限未扫描 ${extracted.overflow.length} 个（${extracted.overflow.slice(0, 3).join(', ')}${
        extracted.overflow.length > 3 ? ' ...' : ''
      }）`
    );
  if (extracted?.allowlisted?.length) notes.push(`白名单跳过 ${extracted.allowlisted.length} 个`);
  if (notes.length) lines.push('', `> 说明：${notes.join('；')}。`);

  lines.push(
    '',
    '---',
    '> 判定规则：malicious >= 2 个引擎 -> 恶意（阻断合并）；malicious == 1 或 suspicious >= 1 -> 可疑（仅警告）。扫描引擎：VirusTotal。'
  );
  return lines.join('\n');
}

async function upsertComment(body) {
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !pr || !token) throw new Error('缺少 GITHUB_REPOSITORY / PR_NUMBER / GITHUB_TOKEN');
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'url-security-scan-bot',
    'Content-Type': 'application/json',
  };

  const listRes = await fetch(`${API}/repos/${repo}/issues/${pr}/comments?per_page=100`, { headers });
  if (!listRes.ok) throw new Error(`获取 PR 评论失败: HTTP ${listRes.status}`);
  const comments = await listRes.json();
  const existing = comments.find(
    (c) => c.body?.includes(MARKER) && c.user?.login === 'github-actions[bot]'
  );

  const payload = JSON.stringify({ body });
  if (existing) {
    const res = await fetch(`${API}/repos/${repo}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      headers,
      body: payload,
    });
    if (!res.ok) throw new Error(`更新评论失败: HTTP ${res.status}`);
    console.log(`已更新既有报告评论`);
  } else {
    const res = await fetch(`${API}/repos/${repo}/issues/${pr}/comments`, {
      method: 'POST',
      headers,
      body: payload,
    });
    if (!res.ok) throw new Error(`创建评论失败: HTTP ${res.status}`);
    console.log(`已创建报告评论`);
  }
}

async function main() {
  const extracted = load('extracted.json');
  const scan = load('scan-results.json');
  const body = buildComment(extracted, scan);

  if (process.env.URL_SCAN_DRY_RUN === '1') {
    console.log('--- DRY RUN 评论内容 ---');
    console.log(body);
  } else {
    await upsertComment(body);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, body.replace(MARKER, ''));
  }

  const malicious = scan?.results?.filter((r) => r.verdict === 'malicious').length || 0;
  if (malicious > 0) {
    console.error(`发现 ${malicious} 个恶意链接，任务失败以阻止合并。`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
