// 見張り（Google からの訪問）。.github/workflows/mihari-google.yml が1日1回動かす。Node の標準だけ（依存なし）
// 全6サイトの「日本から・Google 経由の訪問」を Cloudflare Web Analytics で見て、急に落ちたらサイトごとに mihari の Issue を作る
//   直近3日（UTC のきのうまで）がどれも、その前の7日の1日平均の半分以下 → 落ちこみ。前の7日の1日平均が20未満のサイトは見ない
//   開いた Issue があり、きのうの数が Issue の baseline の70%以上 → 「戻った」で閉じる
//   鍵の権限が足りない → Issue「Cloudflare の鍵にアクセス解析を見る権限がない」（workflow は失敗にしない）。つながらない・5xx・429 → ログに1行だけ
// 環境変数：CLOUDFLARE_API_TOKEN・CLOUDFLARE_ACCOUNT_ID（deploy.yml と同じ Secrets）・GITHUB_TOKEN・DRY_RUN=true（Issue を作らず、題と本文と判定の表をログに出す）・TODAY=YYYY-MM-DD（UTC の日付を決めて試す）

import { pathToFileURL } from 'node:url';
import { addDays, jstDate, jaDate, footer, UA } from './mihari.mjs';

export const SITES = [
  { key: 'fanza', host: 'av-sale-guide.com', tag: 'e74bc9858497457d92b6a033003356f1' },
  { key: 'asobi', host: 'asobi-talk.com', tag: '732e475a18e142cd84ce5d6cbb7d94d2' },
  { key: 'sakutto', host: 'sakutto-keisan.com', tag: '4a0655bc415a4e198a14610649550653' },
  { key: 'oshi', host: 'nyuka-techo.com', tag: '8198b7153a0b48fb81c047c8cfb9fcd9' },
  { key: 'machi', host: 'machi-shakaika.com', tag: 'd186b09d580243f892ca824236ca61ce' },
  { key: 'anzen', host: 'anzen-benricho.com', tag: '3fa1e56390144d7ea50fec8203e5bc0b' },
];
export const MIN_AVG = 20; // 前の7日の1日平均がこれ未満のサイトは見ない
export const DROP = 0.5; // 直近3日がどれも平均のこの割合以下で落ちこみ
export const BACK = 0.7; // きのうが baseline のこの割合以上で戻った
const FILE = 'mihari-google.yml';
export const AUTH_TITLE = 'Cloudflare の鍵にアクセス解析を見る権限がない';
export const titleOf = (site) => `Google からの訪問が急に減った：${site.host}`;

// ---------- 判定（テストする所） ----------
// Google の検索：google.* と www.google.*（accounts・mail・docs などのサブドメインは入れない）
export const isGoogle = (host) => /^(www\.)?google(\.[a-z]{2,3}){1,2}$/.test(String(host || '').toLowerCase());

// today は UTC の日付。きょうは途中なので入れない
export function windows(today) {
  const y = addDays(today, -1);
  const recent = [addDays(y, -2), addDays(y, -1), y];
  const base = Array.from({ length: 7 }, (_, i) => addDays(y, -9 + i));
  return { recent, base };
}

// GraphQL の行 → { siteTag: { date: Google の訪問 } }。倍率（sampleInterval）はいちばん大きいもの
export function tally(rows) {
  const by = {};
  let rate = 1;
  for (const r of rows || []) {
    const d = r.dimensions || {};
    const s = r.avg?.sampleInterval;
    if (Number.isFinite(s) && s > rate) rate = s;
    if (!isGoogle(d.refererHost)) continue;
    const site = (by[d.siteTag] ||= {});
    site[d.date] = (site[d.date] || 0) + (r.sum?.visits || 0);
  }
  return { by, rate };
}

// baseDays・recentDays は日ごとの数（ない日は0）
export function judge(baseDays, recentDays) {
  const avg = baseDays.reduce((a, b) => a + b, 0) / 7;
  if (avg < MIN_AVG) return { status: 'skip', avg };
  const drop = recentDays.every((v) => v <= avg * DROP);
  return { status: drop ? 'drop' : 'ok', avg };
}

export const baselineOf = (body) => {
  const m = String(body || '').match(/<!-- baseline: ([\d.]+) -->/);
  return m ? Number(m[1]) : null;
};
export const recovered = (baseline, yesterday) => baseline > 0 && yesterday >= baseline * BACK;

// 鍵の権限が足りない：401・403、または GraphQL の errors に権限の言葉
export function authError(status, json) {
  if (status === 401 || status === 403) return true;
  const msgs = (json?.errors || []).map((e) => `${e.message || ''} ${e.extensions?.code || ''}`).join(' ');
  return /permission|authoriz|authenticat|not entitled|forbidden|unauthori[sz]ed|access denied/i.test(msgs);
}

const round = (n) => Math.round(n * 10) / 10;
const rateNote = (rate) => (rate > 1 ? `倍率 ${round(rate)}（サンプルから数えた目安）` : '倍率 1（全部数えた）');

export function issueBody(site, { avg, recent, rate }) {
  return [
    `${site.key}（${site.host}）で、日本から Google 経由の訪問が急に減りました。`,
    '',
    `- 前の7日の1日平均：${round(avg)}`,
    `- 直近3日：${recent.map(([d, v]) => `${jaDate(d)} ${v}`).join('・')}（日付は UTC）`,
    `- ${rateNote(rate)}`,
    '- Search Console で、このサイトの検索の表示とインデックスを確かめる',
    '',
    `<!-- baseline: ${round(avg)} -->`,
    footer(FILE),
    '',
  ].join('\n');
}

export const AUTH_BODY = [
  'Cloudflare の鍵（Secrets の CLOUDFLARE_API_TOKEN）に、アクセス解析を見る権限がありません。Google からの訪問の見張りが動けていません。',
  '',
  '- 鍵に「アカウント分析（Account Analytics）：読み取り」を足す必要がある',
  '- 足し方は司令塔のチャットで案内してもらう',
  '',
  footer(FILE),
  '',
].join('\n');

// 判定の表（ログ用）
export function table(results, { recent, base }, rate) {
  const head = `サイト | 前の7日（${jaDate(base[0])}〜${jaDate(base[6])}）の1日平均 | 直近3日（${recent.map(jaDate).join('・')}） | 判定`;
  const word = { skip: `見ない（平均${MIN_AVG}未満）`, ok: 'ふつう', drop: '落ちこみ' };
  const lines = results.map((r) => `${r.site.key} | ${round(r.avg)} | ${r.recent.map(([, v]) => v).join('・')} | ${word[r.status]}`);
  return [head, ...lines, rateNote(rate)].join('\n');
}

// ---------- Cloudflare（GraphQL） ----------
export const query = (account, from, to) => `{ viewer { accounts(filter: {accountTag: ${JSON.stringify(account)}}) { rumPageloadEventsAdaptiveGroups(filter: {date_geq: ${JSON.stringify(from)}, date_leq: ${JSON.stringify(to)}, siteTag_in: ${JSON.stringify(SITES.map((s) => s.tag))}, countryName: "JP"}, limit: 10000) { sum { visits } avg { sampleInterval } dimensions { date siteTag refererHost } } } } }`;

// 返り：{ rows } ／ { auth: true } ／ { skip: '理由' } ／ throw（そのほかの答え）
export async function askCloudflare(from, to, { token, account, fetchImpl = fetch } = {}) {
  let r;
  try {
    r = await fetchImpl('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify({ query: query(account, from, to) }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return { skip: `Cloudflare につながらない（${e.name}）` };
  }
  let json = null;
  try { json = await r.json(); } catch { /* 本文が JSON でない */ }
  if (authError(r.status, json)) return { auth: true };
  if (r.status >= 500 || r.status === 429) return { skip: `Cloudflare が HTTP ${r.status}` };
  if (!r.ok) throw new Error(`Cloudflare の GraphQL：HTTP ${r.status}`);
  if (json?.errors?.length) {
    const msg = json.errors.map((e) => e.message).join(' / ').slice(0, 200);
    if (/limit|quota|too many|timeout/i.test(msg)) return { skip: `Cloudflare に断られた（${msg}）` };
    throw new Error(`Cloudflare の GraphQL：${msg}`);
  }
  const v = json?.viewer || json?.data?.viewer;
  const acc = v?.accounts?.[0];
  if (!acc) throw new Error('Cloudflare の答えにアカウントがない');
  return { rows: acc.rumPageloadEventsAdaptiveGroups || [] };
}

// ---------- GitHub（GITHUB_TOKEN だけ） ----------
const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY || 'juice0402/sakutto-keisan';
const DRY = process.env.DRY_RUN === 'true';
const LABEL = { name: 'mihari', color: 'd93f0b', description: '見張りが見つけた。しょーくんに知らせるだけ' };

async function gh(path, { method = 'GET', body } = {}) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN がない');
  const r = await fetch(`${API}/repos/${REPO}/${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': UA, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (r.status === 404 && method === 'GET') return null;
  if (!r.ok) throw new Error(`GitHub API ${method} ${path.split('?')[0]}：HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}

let openCache;
async function openIssues() {
  if (openCache) return openCache;
  if (DRY && !process.env.GITHUB_TOKEN) return (openCache = []);
  const out = [];
  for (let p = 1; p <= 5; p++) {
    const list = await gh(`issues?state=open&labels=mihari&per_page=100&page=${p}`);
    if (!list) break;
    out.push(...list.filter((i) => !i.pull_request));
    if (list.length < 100) break;
  }
  return (openCache = out);
}
const findOpen = async (title) => (await openIssues()).find((i) => i.title === title);

async function create(title, body) {
  if (DRY) return console.log(`[dry_run] Issue を作るはず（ラベル mihari）\n題：${title}\n${body}---`);
  if (!(await gh(`labels/${LABEL.name}`))) {
    await gh('labels', { method: 'POST', body: LABEL }).catch((e) => console.log(`ラベル mihari を作れなかった（${e.message}）`));
  }
  const made = await gh('issues', { method: 'POST', body: { title, body, labels: [LABEL.name] } });
  console.log(`Issue #${made.number} を作った：${title}`);
}

// その日（日本時間）にまだなら「まだ続いている」を1つだけ
async function stillOnce(issue, text) {
  if (DRY) return console.log(`[dry_run] #${issue.number} に「${text}」とコメントするはず（今日まだなら）`);
  const since = new Date(Date.parse(`${jstDate(Date.now())}T00:00:00+09:00`)).toISOString();
  const today = (await gh(`issues/${issue.number}/comments?since=${since}&per_page=100`)) || [];
  if (today.some((c) => c.user?.type === 'Bot' && c.body.startsWith('まだ続いている'))) return console.log(`#${issue.number}：今日はもうコメントした`);
  await gh(`issues/${issue.number}/comments`, { method: 'POST', body: { body: text } });
  console.log(`#${issue.number} に「${text}」とコメントした`);
}

async function close(issue, text) {
  if (DRY) return console.log(`[dry_run] #${issue.number} に「${text}」とコメントして閉じるはず`);
  await gh(`issues/${issue.number}/comments`, { method: 'POST', body: { body: text } });
  await gh(`issues/${issue.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
  console.log(`#${issue.number} を閉じた：${issue.title}`);
}

// ---------- 本体 ----------
async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) return console.log('Cloudflare の鍵がない（Secrets）ので、この回は見ない');
  const today = process.env.TODAY || new Date().toISOString().slice(0, 10);
  const w = windows(today);

  // 7日をこえると倍率が1でなくなるので、「直近3日」と「その前の7日」の2回に分けて聞く
  const answers = [];
  for (const [from, to] of [[w.recent[0], w.recent[2]], [w.base[0], w.base[6]]]) {
    const a = await askCloudflare(from, to, { token, account });
    if (a.auth) {
      console.log('Cloudflare の鍵にアクセス解析を見る権限がない');
      const open = await findOpen(AUTH_TITLE);
      if (open) return console.log(`#${open.number} が開いているので作らない`);
      return create(AUTH_TITLE, AUTH_BODY);
    }
    if (a.skip) return console.log(`${a.skip}。この回は何もしない`);
    answers.push(a.rows);
  }
  const authOpen = await findOpen(AUTH_TITLE);
  if (authOpen) await close(authOpen, '直った（アクセス解析を読めた）');

  const recent = tally(answers[0]);
  const base = tally(answers[1]);
  const rate = Math.max(recent.rate, base.rate);
  const results = SITES.map((site) => {
    const days = (t, dates) => dates.map((d) => [d, t.by[site.tag]?.[d] || 0]);
    const r = days(recent, w.recent);
    return { site, recent: r, ...judge(days(base, w.base).map(([, v]) => v), r.map(([, v]) => v)) };
  });
  console.log(table(results, w, rate));

  for (const r of results) {
    const title = titleOf(r.site);
    const open = await findOpen(title);
    const [yDate, yVal] = r.recent[2];
    if (open) {
      const baseline = baselineOf(open.body);
      if (recovered(baseline, yVal)) await close(open, `戻った（${jaDate(yDate)}：${yVal}。前の7日の1日平均 ${baseline}）`);
      else await stillOnce(open, `まだ続いている（${jaDate(yDate)}：${yVal}）`);
      continue;
    }
    if (r.status === 'skip') console.log(`${r.site.key}：前の7日の1日平均が ${round(r.avg)} で${MIN_AVG}未満なので見ない`);
    if (r.status === 'drop') await create(title, issueBody(r.site, { avg: r.avg, recent: r.recent, rate }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`見張り（Google からの訪問）：${e.message}`);
    process.exitCode = 1;
  });
}
