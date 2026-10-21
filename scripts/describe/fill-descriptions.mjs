#!/usr/bin/env node
/**
 * 补齐 README.md 缺失条目描述 —— 抓取脚本（零依赖，抓取引擎 = curl）
 *
 * grill 决策记录：
 * - 范围：README.md 全量缺描述条目（websites.md 已归档不动）
 * - 只补不修：损坏条目（缺协议 URL / 括号未闭合）单列报告，本次不改
 * - 提取链：meta[name=description] -> og:description -> twitter:description -> <title> 兜底
 * - 语言：保留原语言；长度：取第一句（上限 150 字符）
 * - 网络：先直连，失败的条目再用 http://127.0.0.1:7890 代理重试；仍失败则报告单列
 * - 流程：--pass=direct -> --pass=proxy -> 生成报告 -> 人工确认后 --write 写回
 *
 * 用法:
 *   node fill-descriptions.mjs --pass=direct          # 第一轮：直连抓取
 *   node fill-descriptions.mjs --pass=proxy           # 第二轮：失败条目走代理重试并出报告
 *   node fill-descriptions.mjs --pass=retry           # 第三轮：低并发 + consent cookie 重试
 *   node fill-descriptions.mjs --pass=report          # 仅重新生成报告
 *   node fill-descriptions.mjs --pass=diff            # 质检过滤后生成写回预览 diff（不改 README）
 *   node fill-descriptions.mjs --pass=write           # 确认后写回 README
 *   node fill-descriptions.mjs --limit=5              # 冒烟测试：只抓前 N 条
 */

// 质检排除：域名被接管 / 反爬页 title / Chrome 商店模板文案 —— 抓到的"描述"不可用
const JUNK_URL_PARTS = [
  'es6console.com',                                            // meta 是 NFL 赌博广告（域名被接管）
  'cmder.net',                                                 // meta 是 401k 理财广告（域名被接管）
  'developer.valvesoftware.com/wiki/Steam_Web_API',            // title 是反爬页 "Making sure you're not a bot"
  'community.workday.com/api',                                 // title 是无意义 "POST data"
  'padekgcemlokbadohgkifijomclgjgif',                          // SwitchyOmega：og 是 Chrome 商店模板文案
  'epejoicbhllgiimigokgjdoijnpaphdp',                          // Emmet Re:view：og 是 Chrome 商店模板文案
  'www.spotify.com',                                           // title "Web Player" 无信息量
];
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const README = path.join(ROOT, 'README.md');
const DATA_DIR = path.join(__dirname, 'data');
const PROXY = 'http://127.0.0.1:7890';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CONCURRENCY = 8;
const TIMEOUT_DIRECT = 12;
const TIMEOUT_PROXY = 25;
const DESC_CAP = 150;

// 人工处理清单：不抓取、不写回（超出自动化范围，由人工补充描述）
const MANUAL_SKIP = [
  'youtube.com/channel/UCIXOIjR2mp8tHz78DE0vj2A',
  'youtube.com/channel/UCv361SF6FKznoGPKEFG9Yhw',
  'youtube.com/channel/UCa6ERCDt3GzkvLye32ar89w',
  'youtube.com/channel/UCr_F4Y9iboUKlg_ZPm4jkVQ',
  'program-think.blogspot.com',
];

const arg = (name, def = '') => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : def;
};
const hasFlag = (name) => process.argv.includes(`--${name}`);

/* ---------------- README 解析 ---------------- */

const ENTRY_RE = /^(\s*-\s+)\[([^\]]*)\]\(([^()]*?)\)\s*(.*)$/;

function parseEntries() {
  const text = readFileSync(README, 'utf8');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  let section = '';
  const entries = [];
  const broken = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^##\s+(.+)$/);
    if (h) { section = h[1].trim(); continue; }
    const m = line.match(ENTRY_RE);
    if (!m) {
      const isBullet = /^\s*-\s+/.test(line);
      const hasLink = /\]\(/.test(line);
      if (isBullet && !hasLink && /\(/.test(line)) {
        broken.push({ line: i + 1, section, name: line.replace(/^\s*-\s+/, '').trim().slice(0, 60), url: '', reason: '纯文本条目，无链接' });
      } else if (/^\s*-\s+\[[^\]]*$/.test(line)) {
        broken.push({ line: i + 1, section, name: line.trim().slice(0, 60), url: '', reason: '链接括号未闭合，条目失效' });
      }
      continue;
    }
    const [, prefix, name, url, rest] = m;
    if (url.startsWith('#')) continue; // TOC 锚点，非资源条目
    const desc = rest.trim();
    if (!(desc === '' || desc === '-')) continue; // 已有描述，不动
    if (!/^https?:\/\//i.test(url)) {
      broken.push({ line: i + 1, section, name: name.trim(), url, reason: 'URL 缺少 http(s) 协议' });
      continue;
    }
    entries.push({ line: i + 1, prefix, name: name.trim(), url, section });
  }
  return { text, nl, lines, entries, broken };
}

/* ---------------- curl 抓取 ---------------- */

const CURL_EXIT = { 6: 'dns', 7: 'conn', 28: 'timeout', 35: 'tls', 45: 'tls', 51: 'tls', 60: 'tls', 66: 'tls', 3: 'url', 47: 'redirect-loop' };

function classifyErr(err, stderr) {
  const c = typeof err?.code === 'number' ? err.code : 0;
  if (err?.killed || c === 28) return 'timeout';
  if (CURL_EXIT[c]) return CURL_EXIT[c];
  return 'curl-' + (c || 'ERR');
}

function curlFetch(url, { proxy, timeout }) {
  const args = [
    '-sS', '-L', '--compressed', '--globoff', '--ssl-no-revoke',
    '--max-time', String(timeout),
    '--connect-timeout', String(proxy ? 12 : 8),
    '-A', UA,
    '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '-H', 'Accept-Language: en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja;q=0.6',
    '-w', '\n__CURL_META__%{http_code}\t%{url_effective}\t%{content_type}',
  ];
  // YouTube/Google 站点附带 consent 拒绝 cookie，避免被跳到 consent 页导致无 meta
  if (/^https?:\/\/([^/]*\.)?(youtube\.com|google\.com)\//i.test(url)) args.push('-b', 'SOCS=CAI');
  if (proxy) args.push('-x', PROXY);
  args.push(url);
  return new Promise((resolve) => {
    execFile('curl', args, { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, windowsHide: true, timeout: (timeout + 6) * 1000 }, (err, stdout, stderr) => {
      if (!stdout || stdout.length === 0) {
        const detail = (stderr ? stderr.toString().trim() : err?.message || 'no output').slice(0, 200);
        return resolve({ ok: false, kind: err ? classifyErr(err, stderr) : 'empty', detail });
      }
      const MARK = Buffer.from('__CURL_META__');
      const idx = stdout.lastIndexOf(MARK);
      if (idx < 0) return resolve({ ok: false, kind: 'no-meta', detail: '响应缺少元信息标记' });
      const meta = stdout.slice(idx + MARK.length).toString('latin1').replace(/^\r?\n/, '').trim();
      const [codeStr, finalUrl, ctype] = meta.split('\t');
      const code = Number(codeStr) || 0;
      const body = stdout.slice(0, idx);
      if (code < 200 || code >= 300) {
        const kind = code === 404 || code === 410 ? 'dead'
          : [401, 403, 405, 429, 503].includes(code) ? 'anti-bot'
          : code >= 500 ? 'server' : 'http-' + code;
        return resolve({ ok: false, kind, detail: `HTTP ${code} -> ${finalUrl || url}` });
      }
      if (body.length === 0) return resolve({ ok: false, kind: 'empty-body', detail: `HTTP ${code} 但响应体为空` });
      resolve({ ok: true, body, finalUrl: finalUrl || url, ctype: ctype || '' });
    });
  });
}

/* ---------------- HTML 解析 ---------------- */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–',
  hellip: '…', copy: '©', reg: '®', trade: '™', middot: '·', laquo: '«', raquo: '»',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', deg: '°', times: '×', euro: '€',
  yen: '¥', sect: '§', bull: '•', ensp: ' ', emsp: ' ', zwj: '', shy: '-',
};

function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, e) => {
    if (e[0] === '#') {
      const num = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isInteger(num) && num > 0 && num < 0x110000 ? String.fromCodePoint(num) : m;
    }
    const key = e.toLowerCase();
    return key in ENTITIES ? ENTITIES[key] : m;
  });
}

function decodeBody(body, ctype) {
  let charset = (/charset\s*=\s*["']?([\w-]+)/i.exec(ctype || '') || [])[1] || '';
  const tryDecode = (label) => { try { return new TextDecoder(label, { fatal: false }).decode(body); } catch { return null; } };
  if (!charset) {
    const head = body.slice(0, 4096).toString('latin1');
    charset = (/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head) || [])[1] || '';
  }
  charset = (charset || 'utf-8').toLowerCase();
  let html = (charset === 'utf-8' || charset === 'utf8') ? body.toString('utf8') : (tryDecode(charset) || body.toString('utf8'));
  if ((html.match(/\uFFFD/g) || []).length > 8) {
    const alt = ((/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(html) || [])[1] || '').toLowerCase();
    if (alt && alt !== charset && !/utf-?8/.test(alt)) {
      const retry = tryDecode(alt);
      if (retry) html = retry;
    }
  }
  return html;
}

// title 兜底清洗：按分隔符切段，剔除 Home/首页 等导航段，取最长段（多为 tagline）
const GENERIC_SEG = /^(home|homepage|index|welcome|official|site|官网|首页|主页|官方|github|youtube)$/i;
function cleanTitle(t) {
  const segs = t.split(/\s*[|·•—–]\s*|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
  const good = segs.filter((s) => !GENERIC_SEG.test(s));
  if (!good.length) return t;
  return good.slice().sort((a, b) => b.length - a.length)[0];
}

function extractDescription(html) {
  // 全文扫描：YouTube/Chrome 商店等大页面的 meta 可能位于 700KB+ 处，不可截断
  const head = html;
  const metas = [];
  for (const t of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {};
    for (const a of t[0].matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    }
    metas.push(attrs);
  }
  const norm = (s) => decodeEntities(String(s ?? '').replace(/\s+/g, ' ')).trim();
  const fromMetas = (test) => {
    for (const m of metas) if (test(m) && norm(m.content)) return norm(m.content);
    return '';
  };
  let desc = fromMetas((m) => (m.name || '').toLowerCase() === 'description');
  let source = desc ? 'meta' : '';
  if (!desc) { desc = fromMetas((m) => (m.property || '').toLowerCase() === 'og:description'); if (desc) source = 'og'; }
  if (!desc) { desc = fromMetas((m) => (m.name || m.property || '').toLowerCase() === 'twitter:description'); if (desc) source = 'twitter'; }
  if (!desc) {
    const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head);
    if (t && norm(t[1])) { desc = cleanTitle(norm(t[1])) || norm(t[1]); source = 'title'; }
  }
  return { desc, source };
}

function firstSentence(s, cap = DESC_CAP) {
  s = s.replace(/\s+/g, ' ').trim();
  let end = -1;
  const cjk = s.search(/[。！？]/);
  const lat = s.search(/[.!?](\s|$)/);
  if (cjk >= 0) end = cjk + 1;
  if (lat >= 0 && (end < 0 || lat + 1 < end)) end = lat + 1;
  let out = end > 0 ? s.slice(0, end) : s;
  out = out.replace(/[\s.。!！?？…、,，;；:：]+$/, '').trim();
  if (!out) out = s.slice(0, cap);
  if (out.length > cap) out = out.slice(0, cap).replace(/[\s,，;；:：-]+$/, '') + '…';
  return out;
}

const normKey = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
function isDupOfName(name, desc) {
  const a = normKey(name), b = normKey(desc);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return false;
}

/* ---------------- 流程 ---------------- */

async function runPool(items, worker, concurrency = CONCURRENCY) {
  const queue = [...items];
  const results = [];
  let done = 0;
  const run = async () => {
    while (queue.length) {
      const it = queue.shift();
      const r = await worker(it);
      results.push(r);
      done++;
      console.log(`[${done}/${items.length}] ${r.ok ? `OK(${r.source})` : `FAIL(${r.kind})`} ${it.url}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, run));
  return results;
}

async function fetchEntries(list, mode, concurrency = CONCURRENCY) {
  // 同一 URL 只抓一次，结果套用到所有同 URL 条目
  const byUrl = new Map();
  for (const e of list) if (!byUrl.has(e.url)) byUrl.set(e.url, e);
  const unique = [...byUrl.values()];
  const raw = await runPool(unique, async (e) => {
    const res = await curlFetch(e.url, mode === 'proxy'
      ? { proxy: true, timeout: TIMEOUT_PROXY }
      : { proxy: false, timeout: TIMEOUT_DIRECT });
    if (!res.ok) return { url: e.url, ok: false, kind: res.kind, detail: res.detail };
    const html = decodeBody(res.body, res.ctype);
    const { desc, source } = extractDescription(html);
    if (!desc) return { url: e.url, ok: false, kind: 'no-desc', detail: `HTTP 200（${res.finalUrl}）但未提取到描述` };
    return {
      url: e.url, ok: true, source,
      raw: desc.slice(0, 300),
      desc: firstSentence(desc),
      descFull: desc,
      truncated: firstSentence(desc) !== desc,
      finalUrl: res.finalUrl,
    };
  }, concurrency);
  const byUrlResult = new Map(raw.map((r) => [r.url, r]));
  return list.map((e) => {
    const r = byUrlResult.get(e.url);
    if (r.ok) return { ...e, ...r, url: e.url };
    return { ...e, url: e.url, ok: false, kind: r.kind, detail: r.detail };
  });
}

function recordShape(e) {
  return {
    line: e.line, prefix: e.prefix, section: e.section, name: e.name, url: e.url,
    ok: e.ok ?? false, source: e.source || '', desc: e.desc || '',
    truncated: !!e.truncated, titleDup: e.ok ? isDupOfName(e.name, e.desc) : false,
    kind: e.ok ? '' : (e.kind || 'unknown'), detail: e.detail || '',
    finalUrl: e.finalUrl || '', raw: e.raw || '',
  };
}

function generateReport(all, broken) {
  const ok = all.filter((r) => r.ok);
  const fail = all.filter((r) => !r.ok && r.kind !== 'manual');
  const manual = all.filter((r) => r.kind === 'manual');
  const fetchable = all.filter((r) => r.kind !== 'manual');
  const bySource = (s) => ok.filter((r) => r.source === s);
  const dupTitle = ok.filter((r) => r.titleDup);
  const groups = [['meta', 'meta description'], ['og', 'og:description'], ['twitter', 'twitter:description'], ['title', '<title> 兜底 ⚠️']];
  const dt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const L = [];
  L.push('# README 描述补齐 — 抓取报告');
  L.push('');
  L.push(`> 生成时间：${dt} ｜ 提取链：meta → og → twitter → title 兜底 ｜ 语言：保留原语言 ｜ 长度：取第一句（≤${DESC_CAP} 字符）`);
  L.push('');
  L.push('| 类别 | 数量 |');
  L.push('|---|---|');
  L.push(`| ✅ 可写回 | ${ok.length} |`);
  for (const [k, label] of groups) L.push(`| — 来源 ${label} | ${bySource(k).length} |`);
  L.push(`| ❌ 抓取失败（README 不动） | ${fail.length} |`);
  L.push(`| 🚫 人工处理 | ${manual.length} |`);
  L.push(`| 🔧 损坏条目（本次不碰） | ${broken.length} |`);
  L.push('');
  L.push('---');
  L.push('');
  L.push(`## ✅ 可写回（${ok.length} 条）`);
  L.push('');
  L.push('勾选 = 写回时采纳；去掉勾选 = 跳过该条（写回前把要排除的条目告诉我即可）。');
  for (const [k, label] of groups) {
    const items = bySource(k);
    if (!items.length) continue;
    L.push('');
    L.push(`### 来源：${label}（${items.length} 条）`);
    L.push('');
    for (const r of items) {
      const flags = [];
      if (r.truncated) flags.push('已截取首句');
      if (r.titleDup) flags.push('⚠️ 描述与链接名重复，建议人工改写');
      L.push(`- [ ] **${r.name}**（#${r.line}，${r.section}）`);
      L.push(`  - URL：${r.url}${r.finalUrl && r.finalUrl !== r.url ? ` → 重定向至 ${r.finalUrl}` : ''}`);
      L.push(`  - 描述：${r.desc}`);
      L.push(`  - 元信息：来源 ${r.source}${flags.length ? ' ｜ ' + flags.join(' ｜ ') : ''}`);
    }
  }
  L.push('');
  L.push(`## ❌ 抓取失败（${fail.length} 条，README 不动）`);
  L.push('');
  if (fail.length) {
    L.push('| 分类 | 条目 | URL | 详情 |');
    L.push('|---|---|---|---|');
    for (const r of fail) L.push(`| ${r.kind} | ${r.name} | ${r.url} | ${(r.detail || '').replace(/\|/g, '\\|').slice(0, 120)} |`);
  }
  L.push('');
  L.push(`## 🚫 人工处理（${manual.length} 条）`);
  L.push('');
  for (const r of manual) L.push(`- **${r.name}**（#${r.line}，${r.section}）— ${r.url}`);
  L.push('');
  L.push(`## 🔧 损坏条目（${broken.length} 条，本次不碰）`);
  L.push('');
  for (const b of broken) L.push(`- **${b.name}**（#${b.line}，${b.section}）— ${b.url || '（无 URL）'}：${b.reason}`);
  L.push('');
  const out = path.join(DATA_DIR, 'report.md');
  writeFileSync(out, L.join('\n'), 'utf8');
  console.log(`\n报告已写入 ${out}`);
  console.log(`可写回 ${ok.length}（title 兜底 ${bySource('title').length}），失败 ${fail.length}，人工 ${manual.length}，损坏 ${broken.length}`);
}

function loadJson(file) {
  const p = path.join(DATA_DIR, file);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

function saveJson(file, data) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

// 质检分类：可写回 / 垃圾（转人工） / 纯复读（跳过）。复用上方 isDupOfName
function classifyResults(results) {
  const write = [], junk = [], dup = [];
  for (const r of results) {
    if (!r.ok || !r.desc) continue;
    if (JUNK_URL_PARTS.some((s) => r.url.toLowerCase().includes(s.toLowerCase()))) { junk.push(r); continue; }
    if (r.source === 'title') {
      // title 天然易等于站名：双向包含即复读
      if (isDupOfName(r.name, r.desc)) { dup.push(r); continue; }
    } else if (normKey(r.desc) === normKey(r.name)) {
      // meta/og 有实质内容时可能合法包含站名，仅严格相等才判复读
      dup.push(r); continue;
    }
    write.push(r);
  }
  return { write, junk, dup };
}

function buildNewReadme() {
  const parsed = parseEntries();
  const results = loadJson('results.json');
  if (!results) { console.error('缺少 data/results.json，请先完成抓取'); process.exit(1); }
  const { write } = classifyResults(results);
  const byLine = new Map(write.map((r) => [r.line, r]));
  return parsed.lines.map((line, i) => {
    const r = byLine.get(i + 1);
    if (!r) return line;
    return `${r.prefix || '- '}[${r.name}](${r.url}) - ${r.desc}`;
  });
}

async function main() {
  const pass = arg('pass', '');
  const limit = Number(arg('limit', 0));
  const parsed = parseEntries();
  mkdirSync(DATA_DIR, { recursive: true });

  if (pass === 'diff' || pass === 'write') {
    const parsed = parseEntries();
    const results = loadJson('results.json');
    const { write, junk, dup } = classifyResults(results);
    // 质检决策同步回 results.json：垃圾 -> manual，复读 -> skip-dup，再重出报告保持一致
    const junkSet = new Set(junk.map((r) => r.line));
    const dupSet = new Set(dup.map((r) => r.line));
    const updated = results.map((r) => {
      if (junkSet.has(r.line) && r.ok) return { ...r, ok: false, kind: 'manual', detail: '质检排除：垃圾/模板文案，需人工改写' };
      if (dupSet.has(r.line) && r.ok) return { ...r, ok: false, kind: 'skip-dup', detail: 'title 与链接名重复，写回无增益，跳过' };
      return r;
    });
    saveJson('results.json', updated.map(recordShape));
    generateReport(updated, parsed.broken);
    console.log(`质检分类：写回 ${write.length}，垃圾转人工 ${junk.length}，复读跳过 ${dup.length}`);

    const newContent = buildNewReadme();
    if (pass === 'write') {
      writeFileSync(README, newContent.join(parsed.nl), 'utf8');
      console.log(`已写回 ${write.length} 条描述到 README.md`);
    } else {
      // 行级变更预览：按 section 分组，每条展示 旧行 -> 新行
      const L = ['# README 写回预览（未改动 README.md）', '',
        `> 写回 ${write.length} 条 ｜ 每条展示：原行 -> 新行 ｜ 确认后 --pass=write 落盘`, ''];
      let section = '(top)';
      for (let i = 0; i < parsed.lines.length; i++) {
        const oldLine = parsed.lines[i], newLine = newContent[i];
        const h = oldLine.match(/^##\s+(.+)$/);
        if (h) { section = h[1].trim(); continue; }
        if (oldLine === newLine) continue;
        const m = newLine.match(/^\s*-\s+\[([^\]]+)\]/);
        L.push(`### ${m ? m[1] : '(?)'}（L${i + 1}，${section}）`);
        L.push('- 旧：```' + oldLine.trim() + '```');
        L.push('- 新：```' + newLine.trim() + '```');
        L.push('');
      }
      const preview = path.join(DATA_DIR, 'preview.md');
      writeFileSync(preview, L.join('\n'), 'utf8');
      console.log(`写回预览已生成：${preview}（README 未改动，确认后 --pass=write）`);
    }
    return;
  }

  if (!pass || ['direct', 'proxy', 'retry'].includes(pass)) {
    const todo = parsed.entries.filter((e) => !MANUAL_SKIP.some((s) => e.url.toLowerCase().includes(s.toLowerCase())));
    const manual = parsed.entries.filter((e) => MANUAL_SKIP.some((s) => e.url.toLowerCase().includes(s.toLowerCase())))
      .map((e) => ({ ...e, ok: false, kind: 'manual', detail: '人工处理' }));
    const list = limit ? todo.slice(0, limit) : todo;

    if (pass === 'direct' || (!pass && !loadJson('results-direct.json'))) {
      console.log(`== 直连抓取 ${list.length} 条 ==`);
      const results = await fetchEntries(list, 'direct');
      saveJson('results-direct.json', results);
    }
    if (pass === 'proxy') {
      const prior = loadJson('results-direct.json');
      if (!prior) { console.error('缺少 data/results-direct.json，请先跑 --pass=direct'); process.exit(1); }
      const failed = prior.filter((r) => !r.ok).map((r) => ({ line: r.line, prefix: r.prefix, name: r.name, url: r.url, section: r.section }));
      const todoRetry = limit ? failed.slice(0, limit) : failed;
      console.log(`== 代理重试 ${todoRetry.length} 条（失败于直连） ==`);
      const retried = await fetchEntries(todoRetry, 'proxy');
      // 代理轮结果覆盖直连轮：成功合并结果字段，失败更新最终状态（不保留过时的 http-0）
      const retriedByUrl = new Map(retried.map((r) => [r.url, r]));
      const merged = prior.map((r) => {
        if (r.ok) return r;
        const better = retriedByUrl.get(r.url);
        if (!better) return r;
        return better.ok
          ? { ...r, ok: true, source: better.source, desc: better.desc, truncated: better.truncated, raw: better.raw, finalUrl: better.finalUrl }
          : { ...r, kind: better.kind, detail: better.detail };
      });
      saveJson('results.json', merged.map(recordShape).concat(manual.map(recordShape)));
    }
    if (pass === 'retry') {
      const prior = loadJson('results.json');
      if (!prior) { console.error('缺少 data/results.json，请先跑 --pass=proxy'); process.exit(1); }
      const pending = prior.filter((r) => !r.ok && r.kind !== 'manual')
        .map((r) => ({ line: r.line, prefix: r.prefix, name: r.name, url: r.url, section: r.section }));
      console.log(`== 低并发重试 ${pending.length} 条（含 consent cookie） ==`);
      const retried = await fetchEntries(pending, 'proxy', 3);
      const retriedByUrl = new Map(retried.map((r) => [r.url, r]));
      const merged = prior.map((r) => {
        if (r.ok || r.kind === 'manual') return r;
        const better = retriedByUrl.get(r.url);
        if (!better) return r;
        return better.ok
          ? { ...r, ok: true, source: better.source, desc: better.desc, truncated: better.truncated, raw: better.raw, finalUrl: better.finalUrl }
          : { ...r, kind: better.kind, detail: better.detail };
      });
      // manual 记录始终按最新 MANUAL_SKIP 重建，避免历史结果文件缺漏
      const nonManual = merged.filter((r) => r.kind !== 'manual');
      saveJson('results.json', nonManual.map(recordShape).concat(manual.map(recordShape)));
    }
    if (pass === 'direct') {
      const results = loadJson('results-direct.json');
      const okN = results.filter((r) => r.ok).length;
      console.log(`\n直连完成：成功 ${okN}，失败 ${results.length - okN}（下一轮 --pass=proxy 重试）`);
    }
  }

  if (pass === 'report' || loadJson('results.json')) {
    const all = loadJson('results.json');
    if (all) generateReport(all, parsed.broken);
  }
  if (!pass) console.log('提示：--pass=direct | proxy | retry | report | diff | write');
}

main().catch((e) => { console.error(e); process.exit(1); });
