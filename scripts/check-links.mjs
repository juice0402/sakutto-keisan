// 出典・外部リンクの点検（10/27 連絡 C-005。しくみは安全衛生の便利帳の check-sources.mjs を参考にした）
//   node scripts/check-links.mjs --all       … ビルドしたページ（dist）の外部リンクをぜんぶ開く＋確認日が近いもの（毎週）
//   node scripts/check-links.mjs --changed   … この PR で src に足した・変えたリンクだけ開く（HEAD^1 とくらべる）
// 先に npm run build をしておく。Markdown を出し、直すものがあれば終了コード1（毎週はワークフローが Issue にする）
// 403 など断られただけのものは、消えたとは限らないので「直すもの」に入れない。Claude の使用量は使わない
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { SITE } from '../src/site.mjs';
import { SPU_ITEMS, SPU_SOURCES, POINT_DAY } from '../src/data/spu.mjs';
import { AMAZON_SOURCES } from '../src/data/amazon.mjs';
import { POINT_COUNT_SOURCES } from '../src/data/point.mjs';
import { FURUSATO_SOURCES, FURUSATO_TETSUZUKI_SOURCES, FURUSATO_SEIDO_SOURCES, FURUSATO_FUUFU_SOURCES } from '../src/data/furusato.mjs';

const mode = process.argv.includes('--changed') ? 'changed' : 'all';
const self = new URL(SITE.url).host;
const skip = (u) => { try { const h = new URL(u).host; return h === self || h === 'schema.org' || u.includes('${'); } catch { return true; } };

// ページにあるリンク → どのページ・どんな字で出ているか
const where = new Map();
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) {
      const page = '/' + p.slice(5).replace(/index\.html$/, '').replace(/\.html$/, '');
      for (const m of readFileSync(p, 'utf8').matchAll(/<a\b[^>]*\bhref="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        const u = m[1].replace(/&amp;/g, '&');
        if (skip(u)) continue;
        const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
        const w = where.get(u) || { text, pages: new Set() };
        if (text.length > w.text.length) w.text = text; // 「54W」より製品名のほうがわかる
        w.pages.add(page);
        where.set(u, w);
      }
    }
  }
};
if (!existsSync('dist')) { console.log('dist がありません。先に npm run build をしてください。'); process.exit(2); }
walk('dist');

let urls;
if (mode === 'all') urls = [...where.keys()];
else {
  const diff = execFileSync('git', ['diff', '--unified=0', 'HEAD^1', 'HEAD', '--', 'src'], { encoding: 'utf8' });
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
  urls = [...new Set([...added.matchAll(/https?:\/\/[^\s'"`<>)]+/g)].map((m) => m[0].replace(/[.,;、。]+$/, '')))].filter((u) => !skip(u));
}

const UA = 'Mozilla/5.0 (compatible; sakutto-keisan-linkcheck; +https://sakutto-keisan.com/about/)';
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
// 消えた（404・410・ドメインがない）／飛ばされた（トップや404のページへ）／断られた（403など）／時間切れ
const open = async (u) => {
  let last;
  for (let i = 0; i < 2; i++) {
    if (i) await wait(5000);
    try {
      const r = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': UA, 'Accept-Language': 'ja' }, signal: AbortSignal.timeout(20000) });
      await r.body?.cancel();
      if (r.status === 404 || r.status === 410) { last = { kind: 'gone', why: `返事 ${r.status}` }; continue; }
      if (r.status >= 400) { last = { kind: 'refused', why: `返事 ${r.status}` }; continue; }
      const from = new URL(u), to = new URL(r.url);
      const top = (x) => x.pathname === '/' || /^\/index\.(html?|php)$/.test(x.pathname);
      if (r.redirected && !top(from) && (top(to) || /404|not[-_]?found|error/i.test(to.pathname + to.search))) return { kind: 'moved', why: `${to.host}${to.pathname} に飛ばされた` };
      return null;
    } catch (e) {
      const code = e.cause?.code || e.name;
      last = code === 'ENOTFOUND' ? { kind: 'gone', why: 'ドメインが見つからない' } : { kind: 'timeout', why: `つながらない（${code}）` };
    }
  }
  return last;
};

// 同じサイトは1つずつ間をあけて、ちがうサイトは4つまで同時に
const byHost = new Map();
for (const u of urls) { const h = new URL(u).host; byHost.set(h, [...(byHost.get(h) || []), u]); }
const hosts = [...byHost.values()];
const result = new Map();
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let list; (list = hosts.shift());) {
    for (const [i, u] of list.entries()) {
      if (i) await wait(1500);
      result.set(u, await open(u));
    }
  }
}));

const line = (u, r) => {
  const w = where.get(u);
  const name = w && /[^\d.,％%Wｗ円・ ]/.test(w.text) ? w.text : new URL(u).host; // 「2.75％」だけの字はサイトの名前に
  const pages = w ? [...w.pages].slice(0, 3).join('・') + (w.pages.size > 3 ? ` ほか${w.pages.size - 3}ページ` : '') : 'ページにはまだ出ていない';
  return `- [${name}](${u})（${pages}）：${r.why}`;
};
const pick = (...kinds) => urls.filter((u) => result.get(u) && kinds.includes(result.get(u).kind)).map((u) => line(u, result.get(u)));
const fix = pick('gone', 'moved');
const soft = pick('refused', 'timeout');

// 確認日：90日（ふるさと納税は11〜1月に30日）でテストが止まり、毎日の公開も止まる。残り14日から知らせる
const old = [];
if (mode === 'all') {
  const today = new Date(Date.now() + 9 * 3600e3);
  const m = today.getUTCMonth() + 1;
  const furusatoMax = m >= 11 || m === 1 ? 30 : 90;
  const groups = [
    [[...SPU_ITEMS, ...SPU_SOURCES, POINT_DAY], 90, 'src/data/spu.mjs'],
    [AMAZON_SOURCES, 90, 'src/data/amazon.mjs'],
    [POINT_COUNT_SOURCES, 90, 'src/data/point.mjs'],
    [[...FURUSATO_SOURCES, ...FURUSATO_TETSUZUKI_SOURCES, ...FURUSATO_SEIDO_SOURCES, ...FURUSATO_FUUFU_SOURCES], furusatoMax, 'src/data/furusato.mjs'],
  ];
  const seen = new Set();
  for (const [list, max, file] of groups) {
    for (const s of list) {
      const key = file + s.name + s.checked;
      if (seen.has(key)) continue;
      seen.add(key);
      const days = Math.floor((today - new Date(`${s.checked}T00:00:00+09:00`)) / 86400e3);
      if (max - days <= 14) old.push(`- ${s.name}（${file}）：確認日 ${s.checked} から ${days} 日。${max}日でテストが止まる`);
    }
  }
}

const what = mode === 'all' ? `外部リンク ${urls.length} 件` : `この PR で足した・変えたリンク ${urls.length} 件`;
console.log(`${what}を点検しました。${fix.length || old.length ? `直すもの ${fix.length + old.length} 件。` : '直すものはありません。'}${soft.length ? `断られた・つながらない ${soft.length} 件。` : ''}`);
if (fix.length) console.log(`\n### 開けない・移ったリンク（${fix.length}件）\n${fix.join('\n')}\n\n同じ発行元の新しいページを探して、データやページのリンクを差しかえてください。`);
if (old.length) console.log(`\n### 確認日が古くなる（${old.length}件）\n${old.join('\n')}\n\n公式を開いて中身を確かめ直し、checked を直してください。`);
if (soft.length) console.log(`\n### 断られた・つながらない（${soft.length}件・消えたとは限らない）\n${soft.join('\n')}\n\nGitHub からの点検を断るサイトがあるので、Issue にはしません。`);
process.exit(fix.length || old.length ? 1 : 0);
