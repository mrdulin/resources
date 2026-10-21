/**
 * PR 评论 upsert 共享逻辑。
 * 进度占位与最终报告共用同一条评论：按隐藏标记定位，存在则 PATCH、不存在则 POST。
 */
const API = 'https://api.github.com';

export const REPORT_MARKER = '<!-- url-scan-bot:v1 -->';

/** 评论所需的 CI 环境变量是否齐备（本地调试缺失时优雅跳过） */
export function canComment() {
  return Boolean(
    process.env.GITHUB_TOKEN && process.env.PR_NUMBER && process.env.GITHUB_REPOSITORY
  );
}

/**
 * 创建或更新 PR 上带 marker 的机器人评论。
 * 返回 'updated' | 'created'；环境不齐备时返回 'skipped'（进度是尽力而为，不抛错）。
 * API 调用失败时抛错，由调用方决定是否容忍。
 */
export async function upsertPrComment(body, { marker = REPORT_MARKER } = {}) {
  if (!canComment()) return 'skipped';
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'url-security-scan-bot',
    'Content-Type': 'application/json',
  };

  const listRes = await fetch(`${API}/repos/${repo}/issues/${pr}/comments?per_page=100`, { headers });
  if (!listRes.ok) throw new Error(`获取 PR 评论失败: HTTP ${listRes.status}`);
  const comments = await listRes.json();
  const existing = comments.find(
    (c) => c.body?.includes(marker) && c.user?.login === 'github-actions[bot]'
  );
  const payload = JSON.stringify({ body });

  if (existing) {
    const res = await fetch(`${API}/repos/${repo}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      headers,
      body: payload,
    });
    if (!res.ok) throw new Error(`更新评论失败: HTTP ${res.status}`);
    return 'updated';
  }
  const res = await fetch(`${API}/repos/${repo}/issues/${pr}/comments`, {
    method: 'POST',
    headers,
    body: payload,
  });
  if (!res.ok) throw new Error(`创建评论失败: HTTP ${res.status}`);
  return 'created';
}
