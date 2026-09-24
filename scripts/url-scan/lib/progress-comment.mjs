/**
 * "扫描进行中"进度评论的渲染。
 * 与最终报告共用同一条评论（同 marker）：扫描开始时创建占位，逐 URL PATCH 更新，
 * 扫描完成后由 report.mjs 用最终报告整体覆盖。
 *
 * state: { total, done: [{url, verdict, malicious?, suspicious?, reason?, occurrences?}],
 *          pending: [{url, occurrences}], current?: {url, occurrences} }
 */
import { REPORT_MARKER } from './pr-comment.mjs';

const LABEL = {
  malicious: '**恶意**',
  suspicious: '**可疑**',
  clean: '安全',
  not_scanned: '未扫描',
  pending: '待扫描',
  scanning: '扫描中',
};

const reportLinkFor = (url) =>
  `https://www.virustotal.com/gui/url/${Buffer.from(url, 'utf8').toString('base64url')}`;

function fmtWhere(entry) {
  const occ = entry.occurrences || [];
  const shown = occ.slice(0, 2).map((o) => `\`${o.file}:${o.line}\``);
  const more = occ.length > 2 ? '<br>等' : '';
  const joined = shown.join('<br>') + more;
  return joined || '-';
}

export function buildProgressComment(state) {
  const { total, done = [], pending = [], current = null } = state;
  const now = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;
  const lines = [
    REPORT_MARKER,
    '## URL 安全扫描（进行中）',
    '',
    `**进度：${done.length}/${total}**（最后更新：${now}）`,
    '',
  ];

  const rows = [
    ...done.map((r) => {
      const link = `[${r.url}](${reportLinkFor(r.url)})`;
      const detail =
        r.verdict === 'not_scanned'
          ? r.reason || '未知原因'
          : `${r.malicious || 0} 恶意 / ${r.suspicious || 0} 可疑`;
      return `| ${LABEL[r.verdict] || r.verdict} | ${link} | ${fmtWhere(r)} | ${detail} |`;
    }),
    ...(current ? [`| ${LABEL.scanning} | ${current.url} | ${fmtWhere(current)} | - |`] : []),
    ...pending.map((r) => `| ${LABEL.pending} | ${r.url} | ${fmtWhere(r)} | - |`),
  ];
  if (rows.length) {
    lines.push('| 判定 | 链接 | 来源 | 详情 |', '|---|---|---|---|', ...rows, '');
  }
  lines.push('> 扫描进行中，本评论会随扫描实时更新；完成后将被最终报告替换。');
  return lines.join('\n');
}
