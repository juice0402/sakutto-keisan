// 灯油の値段を資源エネルギー庁「石油製品価格調査」から取って .touyu/price.json に置く（GitHub Actions のビルドの前に）
// 結果のページから給油所の週の時系列（xlsx/<公表日6けた>s5.xlsx）のリンクを探す。ファイル名は毎週変わるので URL を決め打ちしない
// 読むのは灯油・店頭・全国の18Lの値段（1Lあたりだけなら×18）。.touyu/ はコミットしない・成果物に上げない。ログは件数と最新の週だけ
// 取れなかったときはビルドを止めない（ページは src/data/touyu.mjs の TOUYU_PRICE のまま）。TOUYU_DUMP=1 でシートの形をログに出す
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readXlsx, excelDate } from './xlsx.mjs';

export const RESULTS_URL = 'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/results.html';

const say = (level, msg) => {
  console.log(`灯油：${msg}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=灯油::${msg}`);
};

// 結果のページの HTML から、いちばん新しい時系列の xlsx の URL
export function findSeriesUrl(html, base = RESULTS_URL) {
  const links = [...html.matchAll(/href="([^"]*?(\d{6})s5\.xlsx)"/gi)].map((m) => ({ url: new URL(m[1], base).href, n: m[2] }));
  if (!links.length) return null;
  links.sort((a, b) => b.n.localeCompare(a.n));
  return links[0].url;
}

// セルの値 → 'YYYY-MM-DD'（Excel の日付の数・「2026/11/16」「2026年11月16日」）。日付でなければ null
export function toDay(v) {
  if (typeof v === 'number') return v > 30000 && v < 80000 ? excelDate(v) : null;
  const m = /^\s*(\d{4})\s*[/年.-]\s*(\d{1,2})\s*[/月.-]\s*(\d{1,2})/.exec(String(v));
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}

const num = (v) => (typeof v === 'number' ? v : /^\s*[\d,]+(\.\d+)?\s*$/.test(String(v)) ? Number(String(v).replace(/,/g, '')) : NaN);
const s = (v) => String(v ?? '').replace(/\s/g, '');

// シートたちから、灯油・店頭・全国の週ごとの値段 → { sheet, unit: '18L'|'1L', weeks: [{ date, can }] }。読めなければ Error
export function pickTouyu(sheets) {
  const has = (sh, re) => [...sh.rows.values()].some((r) => [...r.values()].some((v) => re.test(s(v))));
  let cands = sheets.filter((sh) => /灯油/.test(sh.name));
  if (!cands.length) cands = sheets.filter((sh) => has(sh, /灯油/));
  if (!cands.length) throw new Error('灯油のシートがありません');
  const score = (sh) => (/店頭/.test(sh.name) ? 2 : 0) + (/配達/.test(sh.name) ? -3 : 0) + (/現金/.test(sh.name) ? 1 : 0);
  cands.sort((a, b) => score(b) - score(a));
  for (const sh of cands) {
    const rowNums = [...sh.rows.keys()].sort((a, b) => a - b);
    // 全国の列：見出しに「全国」。2つ以上なら、その列の上の見出しに店頭・現金があって配達がないもの
    const zenkoku = [];
    for (const r of rowNums) for (const [c, v] of sh.rows.get(r)) if (/^全国/.test(s(v))) zenkoku.push({ r, c });
    if (!zenkoku.length) continue;
    const above = (z) => rowNums.filter((r) => r <= z.r).map((r) => s(sh.rows.get(r).get(z.c) ?? '')).join('');
    const near = (z) => above(z) + rowNums.filter((r) => r <= z.r).map((r) => { const row = sh.rows.get(r); let t = ''; for (let c = z.c; c >= 1 && c > z.c - 12; c--) if (row.has(c)) { t = s(row.get(c)); if (/店頭|配達|現金|灯油/.test(t)) break; } return t; }).join('');
    const zs = zenkoku.map((z) => ({ ...z, t: near(z) }));
    const zsK = zs.filter((z) => !/配達/.test(z.t));
    const pick = (zsK.find((z) => /店頭|現金/.test(z.t)) || zsK[0]);
    if (!pick) continue;
    // 調査日の列：見出しより下で、日付が多い列
    const below = rowNums.filter((r) => r > pick.r);
    const cnt = new Map();
    for (const r of below) for (const [c, v] of sh.rows.get(r)) if (toDay(v)) cnt.set(c, (cnt.get(c) || 0) + 1);
    const dateCol = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
    if (!dateCol) continue;
    const weeks = [];
    for (const r of below) {
      const row = sh.rows.get(r);
      const date = toDay(row.get(dateCol));
      const v = num(row.get(pick.c));
      if (date && Number.isFinite(v) && v > 0) weeks.push({ date, v });
    }
    if (!weeks.length) continue;
    weeks.sort((a, b) => a.date.localeCompare(b.date));
    const last = weeks[weeks.length - 1].v;
    const unit = last >= 500 ? '18L' : '1L';
    return { sheet: sh.name, unit, weeks: weeks.map((w) => ({ date: w.date, can: Math.round(unit === '18L' ? w.v : w.v * 18) })) };
  }
  throw new Error('灯油の全国の列が見つかりません');
}

// シートの形をログに出す（TOUYU_DUMP=1 か、読めなかったとき）。公表された統計の見出しだけ
function dump(sheets) {
  for (const sh of sheets) {
    const rowNums = [...sh.rows.keys()].sort((a, b) => a - b);
    console.log(`シート「${sh.name}」 ${rowNums.length}行`);
    const show = (r) => console.log(`  ${r}: ${[...sh.rows.get(r)].slice(0, 16).map(([c, v]) => `${c}=${String(v).slice(0, 14)}`).join(' | ')}`);
    rowNums.slice(0, 12).forEach(show);
    console.log('  …');
    rowNums.slice(-2).forEach(show);
  }
}

async function main() {
  const ua = { 'user-agent': 'Mozilla/5.0 (compatible; site-build)' };
  try {
    const res = await fetch(RESULTS_URL, { headers: ua, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`結果のページが ${res.status}`);
    const url = findSeriesUrl(await res.text());
    if (!url) throw new Error('結果のページに時系列の xlsx のリンクがありません');
    const x = await fetch(url, { headers: ua, signal: AbortSignal.timeout(60000) });
    if (!x.ok) throw new Error(`xlsx が ${x.status}`);
    const sheets = readXlsx(Buffer.from(await x.arrayBuffer()));
    if (process.env.TOUYU_DUMP) dump(sheets);
    let got;
    try {
      got = pickTouyu(sheets);
    } catch (e) {
      dump(sheets);
      throw e;
    }
    const latest = got.weeks[got.weeks.length - 1];
    if (latest.can < 500 || latest.can > 10000) throw new Error(`最新の値段が ${latest.can}円で、18Lの値段に見えません`);
    mkdirSync('.touyu', { recursive: true });
    writeFileSync('.touyu/price.json', JSON.stringify({ fetchedAt: new Date().toISOString(), file: url.split('/').pop(), sheet: got.sheet, unit: got.unit, weeks: got.weeks }));
    const [, m, d] = latest.date.split('-').map(Number);
    say('notice', `${m}月${d}日調査 ${latest.can.toLocaleString('ja-JP')}円（${got.weeks.length}週${got.unit === '1L' ? '・1Lの値段の18倍' : ''}）`);
  } catch (e) {
    say('warning', `取れなかったので、src/data/touyu.mjs の値のままにします（${e.message}）`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
