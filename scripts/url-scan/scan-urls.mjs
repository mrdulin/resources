#!/usr/bin/env node
/**
 * 用 VirusTotal API v3 扫描 extracted.json 中的 URL（顺序执行 + 429 限流退避）。
 * 判定规则: malicious >= 2 -> 恶意; malicious == 1 或 suspicious >= 1 -> 可疑; 其余 -> 安全。
 * 输出: ${URL_SCAN_DATA_DIR:-url-scan-data}/scan-results.json
 *
 * 环境变量: VT_API_KEY（必需，CI 中来自 repo secret VIRUSTOTAL_API_KEY）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.URL_SCAN_DATA_DIR || 'url-scan-data';
const VT = 'https://www.virustotal.com/api/v3';
const KEY = process.env.VT_API_KEY || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireKey() {
  if (!KEY) {
    console.error(
      '缺少 VT_API_KEY —— 请在仓库 Settings > Secrets and variables > Actions 配置 VIRUSTOTAL_API_KEY'
    );
    process.exit(1);
  }
}

/** 带 429 限流退避与网络错误重试的 VirusTotal 请求 */
async function vtFetch(pathname, init = {}, maxTries = 4) {
  let lastErr = null;
  for (let i = 1; i <= maxTries; i++) {
    let res;
    try {
      res = await fetch(`${VT}${pathname}`, {
        ...init,
        headers: { 'x-apikey': KEY, 'User-Agent': 'url-security-scan-bot', ...(init.headers || {}) },
      });
    } catch (err) {
      lastErr = err;
      await sleep(5000 * i);
      continue;
    }
    if (res.status === 429) {
      const wait = 20000 * i;
      console.log(`  429 限流，等待 ${wait / 1000}s 后重试 (${i}/${maxTries})`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  throw lastErr || new Error('VirusTotal 请求多次失败/限流');
}

function verdict(url, stats = {}, results = {}) {
  const malicious = Number(stats.malicious || 0);
  const suspicious = Number(stats.suspicious || 0);
  let v = 'clean';
  if (malicious >= 2) v = 'malicious';
  else if (malicious >= 1 || suspicious >= 1) v = 'suspicious';
  const engines = Object.values(results)
    .filter((r) => r && (r.category === 'malicious' || r.category === 'suspicious'))
    .map((r) => `${r.engine_name}: ${r.result} (${r.category})`);
  return { url, verdict: v, malicious, suspicious, engines };
}

const reportLinkFor = (url) =>
  `https://www.virustotal.com/gui/url/${Buffer.from(url, 'utf8').toString('base64url')}`;

async function scanOne(url) {
  const reportLink = reportLinkFor(url);
  const id = Buffer.from(url, 'utf8').toString('base64url');

  // 1) 先查已有报告（知名域名通常已有缓存结果，无需重新提交）
  const existing = await vtFetch(`/urls/${id}`);
  if (existing.status === 200) {
    const attrs = (await existing.json()).data.attributes;
    return { ...verdict(url, attrs.last_analysis_stats, attrs.last_analysis_results), reportLink };
  }
  if (existing.status !== 404) throw new Error(`GET /urls -> HTTP ${existing.status}`);

  // 2) 无报告则提交扫描
  const submit = await vtFetch('/urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ url }).toString(),
  });
  if (!submit.ok) throw new Error(`POST /urls -> HTTP ${submit.status}`);
  const analysisId = (await submit.json()).data.id;

  // 3) 轮询分析结果，最多约 2 分钟
  for (let i = 0; i < 12; i++) {
    await sleep(10000);
    const a = await vtFetch(`/analyses/${analysisId}`);
    if (!a.ok) continue;
    const attr = (await a.json()).data.attributes;
    if (attr.status === 'completed') {
      return { ...verdict(url, attr.stats, attr.results), reportLink };
    }
  }
  throw new Error('扫描超时（2 分钟内未完成）');
}

async function main() {
  requireKey();
  const inPath = path.join(DATA_DIR, 'extracted.json');
  if (!existsSync(inPath)) throw new Error(`找不到 ${inPath}，请先运行 extract-urls.mjs`);
  const extracted = JSON.parse(readFileSync(inPath, 'utf8'));

  const results = [];
  for (const entry of extracted.scanned) {
    process.stdout.write(`扫描 ${entry.url} ... `);
    try {
      const r = await scanOne(entry.url);
      results.push({ ...entry, ...r });
      console.log(r.verdict);
    } catch (err) {
      // 单个 URL 失败不阻断整体，标记为未扫描
      results.push({
        ...entry,
        verdict: 'not_scanned',
        reason: err.message,
        engines: [],
        reportLink: reportLinkFor(entry.url),
      });
      console.log(`未完成: ${err.message}`);
    }
    await sleep(1500);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path.join(DATA_DIR, 'scan-results.json'), JSON.stringify({ results }, null, 2));
  const n = (v) => results.filter((r) => r.verdict === v).length;
  console.log(`完成: 恶意 ${n('malicious')} / 可疑 ${n('suspicious')} / 安全 ${n('clean')} / 未完成 ${n('not_scanned')}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
