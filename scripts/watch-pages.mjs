// 公式のページの見張り（GitHub Actions の .github/workflows/watch.yml から。10/22 統合の設計「見張りは Actions → Issue」）
//   node scripts/watch-pages.mjs point     … お買い物マラソンの公式のページ（3時間おき）：日付・時刻・「◯ポイント」「◯倍」の数字だけを前回とくらべる
//   node scripts/watch-pages.mjs spu       … SPU の公式のページ（毎日）：日付・「◯ポイント」「◯pt」「◯円」「◯倍」の数字だけを前回とくらべる
//   node scripts/watch-pages.mjs furusato  … ふるさと納税の出典のページ（週1回）：本文の指紋（ハッシュ）だけを前回とくらべる
// 前回の数字と指紋は .watch/state.json（Actions のキャッシュ。リポジトリには入れない）。公式の文は保存しない・Issue にも貼らない
// 変わったページがあれば watch-report.md を書く（Issue の本文）。はじめて見るページは覚えるだけ。読む前に robots.txt を確かめる
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { POINT_SOURCES, MARATHON } from '../src/data/point.mjs';
import { SPU_SOURCES, POINT_DAY } from '../src/data/spu.mjs';
import { AMAZON_SOURCES } from '../src/data/amazon.mjs';
import { FURUSATO_SOURCES, FURUSATO_TETSUZUKI_SOURCES, FURUSATO_SEIDO_SOURCES, FURUSATO_FUUFU_SOURCES } from '../src/data/furusato.mjs';

const GROUP = process.argv[2];
const UA = 'sakutto-keisan-watch (+https://sakutto-keisan.com/about/)';
const STATE = '.watch/state.json';
const PAGES = {
  point: [{ name: '楽天市場「お買い物マラソン」', url: MARATHON }, ...POINT_SOURCES],
  spu: [...SPU_SOURCES, POINT_DAY, ...AMAZON_SOURCES],
  furusato: [...FURUSATO_SOURCES, ...FURUSATO_TETSUZUKI_SOURCES, ...FURUSATO_SEIDO_SOURCES, ...FURUSATO_FUUFU_SOURCES],
}[GROUP]
  ?.map(({ name, url }) => ({ name, url }))
  .filter((p, i, all) => all.findIndex((q) => q.url === p.url) === i); // 同じページは1回だけ読む
if (!PAGES) {
  console.error('使い方: node scripts/watch-pages.mjs point|spu|furusato');
  process.exit(2);
}

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const uniq = (list) => [...new Set(list)];

/** HTML から見える文字だけ（script・style・タグを取る） */
const textOf = (html) =>
  html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** お買い物マラソンの数字（日付・時刻・ポイント・倍）。SPU は倍率の小数と「pt」も見る */
const tokensOf = (text) => uniq(text.match(/\d{4}年|\d{1,2}月\d{1,2}日|\d{1,2}:\d{2}|[\d,]{3,}ポイント|\d{1,2}倍/g) || []).sort();
const spuTokensOf = (text) => uniq(text.match(/\d{4}年|\d{1,2}月\d{1,2}日|[\d,]{3,}(?:ポイント|pt|円)|\d{1,2}(?:\.\d)?倍/g) || []).sort();

const robotsCache = new Map();
async function allowed(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) {
    let rules = [];
    try {
      const r = await fetch(`${u.origin}/robots.txt`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) });
      if (r.ok) {
        let mine = false;
        for (const line of (await r.text()).split(/\r?\n/)) {
          const [k, ...rest] = line.split(':');
          const v = rest.join(':').trim();
          if (/^user-agent$/i.test(k.trim())) mine = v === '*';
          else if (mine && /^disallow$/i.test(k.trim()) && v) rules.push(v);
        }
      }
    } catch {
      rules = [];
    }
    robotsCache.set(u.host, rules);
  }
  return !robotsCache.get(u.host).some((p) => u.pathname.startsWith(p.replace(/\*.*$/, '')));
}

let state = {};
try {
  state = JSON.parse(readFileSync(STATE, 'utf8'));
} catch {
  state = {};
}

const changes = [];
const errors = [];
for (const p of PAGES) {
  if (!(await allowed(p.url))) {
    errors.push(`${p.name}：robots.txt で止められているので読まない`);
    continue;
  }
  let body;
  try {
    const r = await fetch(p.url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    body = p.url.endsWith('.pdf') ? Buffer.from(await r.arrayBuffer()).toString('base64') : await r.text();
  } catch (e) {
    errors.push(`${p.name}：読めなかった（${e.message}）`);
    continue;
  }
  const prev = state[p.url];
  if (GROUP === 'point' || GROUP === 'spu') {
    const tokens = (GROUP === 'spu' ? spuTokensOf : tokensOf)(textOf(body));
    const now = { hash: sha(tokens.join('|')), tokens };
    if (prev && prev.hash !== now.hash) {
      const added = tokens.filter((t) => !prev.tokens.includes(t));
      const removed = prev.tokens.filter((t) => !tokens.includes(t));
      changes.push(`- [${p.name}](${p.url})\n  - ふえた数字：${added.join('・') || 'なし'}\n  - なくなった数字：${removed.join('・') || 'なし'}`);
    }
    state[p.url] = now;
  } else {
    const now = { hash: sha(p.url.endsWith('.pdf') ? body : textOf(body)) };
    if (prev && prev.hash !== now.hash) changes.push(`- [${p.name}](${p.url})：本文が変わった`);
    state[p.url] = now;
  }
}

mkdirSync('.watch', { recursive: true });
writeFileSync(STATE, JSON.stringify(state, null, 1));
const what = { point: 'お買い物マラソンの公式のページ', spu: 'SPUの公式のページ', furusato: 'ふるさと納税の出典のページ' }[GROUP];
if (changes.length) {
  const next = {
    point: '公式のページを開いて、期間と上限を確かめてください。新しい回なら src/data/point.mjs に足します（チャットで Claude に「マラソンの数字を更新して」）。',
    spu: '公式のページを開いて、倍率・上限・条件が変わっていないか確かめてください。変わっていたら src/data/spu.mjs を直します（チャットで Claude に「SPUの数字を確かめて」）。',
    furusato: '本文を開いて、計算や手続きの決まりが変わっていないか確かめてください（チャットで Claude に「ふるさと納税の出典を確かめて」）。',
  }[GROUP];
  writeFileSync('watch-report.md', `${what}が前回とくらべて変わりました。\n\n${changes.join('\n')}\n\n${next}\n`);
}
const summary = `${PAGES.length}ページ、変わった ${changes.length}、読めない ${errors.length}`;
console.log(`${what}：${summary}`);
for (const e of errors) console.log(`  ${e}`);
// Actions の注意書き（実行の画面と API の annotations で、ログを開かずに結果がわかる）。公式の文は入れない
if (process.env.GITHUB_ACTIONS) {
  console.log(`::${changes.length ? 'warning' : 'notice'} title=見張り（${what}）::${summary}`);
  for (const e of errors) console.log(`::warning title=見張り（読めない）::${e}`);
}
