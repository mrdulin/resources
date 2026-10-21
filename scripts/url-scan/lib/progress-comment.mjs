/**
 * "扫描进行中"进度评论的渲染（中英双语：中文块在前、英文块在后）。
 * 与最终报告共用同一条评论（同 marker）：扫描开始时创建占位，逐 URL PATCH 更新，
 * 扫描完成后由 report.mjs 用最终报告整体覆盖。
 *
 * state: { total, done: [{url, verdict, malicious?, suspicious?, reason?, occurrences?}],
 *          pending: [{url, occurrences}], current?: {url, occurrences} }
 */
import { REPORT_MARKER } from './pr-comment.mjs';

/**
 * 双语文案与术语。英文 label 是 canonical 名（与 CONTEXT.md「判定标签」一致），
 * 修改任一侧时须同步另一侧，避免中英漂移。
 */
const T = {
  zh: {
    title: '## URL 安全扫描（进行中）',
    progress: (done, total, now) => `**进度：${done}/${total}**（最后更新：${now}）`,
    thVerdict: '判定',
    thLink: '链接',
    thSource: '来源',
    thDetail: '详情',
    label: {
      malicious: '**恶意**',
      suspicious: '**可疑**',
      clean: '安全',
      not_scanned: '未扫描',
      pending: '待扫描',
      scanning: '扫描中',
    },
    detailCounts: (m, s) => `${m} 恶意 / ${s} 可疑`,
    unknownReason: '未知原因',
    more: '等',
    footer: '> 扫描进行中，本评论会随扫描实时更新；完成后将被最终报告替换。',
  },
  en: {
    title: '## URL Security Scan (in progress)',
    progress: (done, total, now) => `**Progress: ${done}/${total}** (last updated: ${now})`,
    thVerdict: 'Verdict',
    thLink: 'Link',
    thSource: 'Source',
    thDetail: 'Details',
    label: {
      malicious: '**Malicious**',
      suspicious: '**Suspicious**',
      clean: 'Clean',
      not_scanned: 'Not scanned',
      pending: 'Pending',
      scanning: 'Scanning',
    },
    detailCounts: (m, s) => `${m} malicious / ${s} suspicious`,
    unknownReason: 'unknown reason',
    more: '...',
    footer: '> Scan in progress; this comment updates live and will be replaced by the final report when done.',
  },
};

const reportLinkFor = (url) =>
  `https://www.virustotal.com/gui/url/${Buffer.from(url, 'utf8').toString('base64url')}`;

function fmtWhere(entry, t) {
  const occ = entry.occurrences || [];
  const shown = occ.slice(0, 2).map((o) => `\`${o.file}:${o.line}\``);
  const more = occ.length > 2 ? `<br>${t.more}` : '';
  const joined = shown.join('<br>') + more;
  return joined || '-';
}

/** 按给定语言渲染整段进度评论（不含隐藏 marker） */
function render(state, t) {
  const { total, done = [], pending = [], current = null } = state;
  const now = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;
  const lines = [t.title, '', t.progress(done.length, total, now), ''];

  const rows = [
    ...done.map((r) => {
      const link = `[${r.url}](${reportLinkFor(r.url)})`;
      const detail =
        r.verdict === 'not_scanned'
          ? r.reason || t.unknownReason
          : t.detailCounts(r.malicious || 0, r.suspicious || 0);
      return `| ${t.label[r.verdict] || r.verdict} | ${link} | ${fmtWhere(r, t)} | ${detail} |`;
    }),
    ...(current ? [`| ${t.label.scanning} | ${current.url} | ${fmtWhere(current, t)} | - |`] : []),
    ...pending.map((r) => `| ${t.label.pending} | ${r.url} | ${fmtWhere(r, t)} | - |`),
  ];
  if (rows.length) {
    lines.push(`| ${t.thVerdict} | ${t.thLink} | ${t.thSource} | ${t.thDetail} |`, '|---|---|---|---|', ...rows, '');
  }
  lines.push(t.footer);
  return lines;
}

export function buildProgressComment(state) {
  return [
    REPORT_MARKER,
    ...render(state, T.zh),
    '',
    '---',
    '',
    ...render(state, T.en),
  ].join('\n');
}
