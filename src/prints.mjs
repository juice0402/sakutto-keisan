// 印刷用の早見表（A4・1枚のPDF）。表の数字はサイトの計算（src/lib）とデータ（src/data）から作り、手で打ちこまない
// 見た目は「手帳のおまけのページ」（10/26 しょーくんが3案からえらんだ B）：明朝の題、細い罫線、元号が変わる所に黒い線、色は年の赤だけ。絵は入れない
// PDF は scripts/make-prints.py がこの HTML から作って public/print/ にコミットする。年が入るもの（年齢・学歴）は今年と来年のぶんを置き、
// ページは今年のPDFにリンクする（1月1日の毎日のビルドで自動で次の年に切りかわる）。毎年11月の予約タスクが次の年のPDFを足す
import { existsSync, readdirSync } from 'node:fs';
import { SITE } from './site.mjs';
import { ERA_TABLE } from './lib/wareki.mjs';
import { warekiOf, warekiOfYear, etoOf } from './lib/hizuke.mjs';
import { gakureki } from './lib/gakureki.mjs';
import { volumeText } from './lib/kishaku.mjs';
import { HYOHAKU_SRC, HYOHAKU_CAP, HYOHAKU_TARGETS, HYOHAKU_CAUTIONS, HYOHAKU_AMOUNT_SOURCES, HYOHAKU_CAUTION_SOURCES, hyohakuAmount } from './data/hyohakuzai.mjs';

export const THIS_YEAR = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date()));
const PRINT_DIR = new URL('../public/print/', import.meta.url);

export const PRINTS = {
  nenrei: { name: '年齢・和暦の早見表', path: '/nenrei/', yearly: true },
  gakureki: { name: '学歴早見表', path: '/gakureki/', yearly: true },
  hyohakuzai: { name: '消毒液の作り方', path: '/hyohakuzai/', yearly: false },
};
export const HYOHAKU_PRINT_WATERS = [500, 1000, 2000];

export const printFile = (kind, year) => (PRINTS[kind].yearly ? `${kind}-${year}.pdf` : `${kind}.pdf`);

/** ページに置く「印刷用のPDF」のリンク。今年のPDFがなければ、いちばん新しい年のPDF（年はリンクの字に出す） */
export function printLink(kind, { year = THIS_YEAR, label = '印刷用のPDF' } = {}) {
  const p = PRINTS[kind];
  let file = printFile(kind, year);
  let y = year;
  if (p.yearly && !existsSync(new URL(file, PRINT_DIR))) {
    const years = readdirSync(PRINT_DIR).map((f) => f.match(new RegExp(`^${kind}-(\\d{4})\\.pdf$`))).filter(Boolean).map((m) => Number(m[1])).filter((n) => n < year);
    if (!years.length) throw new Error(`public/print/${file} がない（python3 scripts/make-prints.py で作る）`);
    y = Math.max(...years);
    file = printFile(kind, y);
  }
  if (!existsSync(new URL(file, PRINT_DIR))) throw new Error(`public/print/${file} がない（python3 scripts/make-prints.py で作る）`);
  return `<p class="print-link"><a href="/print/${file}">${label}（A4・1枚${p.yearly ? `・${y}年` : ''}）</a></p>`;
}

const era = (text) => text.slice(0, 2);
const host = SITE.url.replace(/^https?:\/\//, '');
const split = (rows, sizes) => {
  let i = 0;
  return sizes.map((n) => rows.slice(i, (i += n)));
};

const CSS = `@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff;color:#222;font-family:'Noto Serif CJK JP','Noto Serif JP',serif}
.page{position:relative;width:210mm;height:297mm;overflow:hidden;padding:16mm 14mm 0}
header{display:flex;align-items:baseline;justify-content:space-between;border-bottom:.2mm solid #222;padding-bottom:2mm;margin-bottom:.7mm}
.rule2{border-top:.2mm solid #222;margin-bottom:5mm}
h1{margin:0;font-size:7.4mm;font-weight:600;letter-spacing:.6mm}
.ed{font-size:3.6mm}
.ed b{color:#b3262e;font-weight:600}
table{border-collapse:collapse;width:100%;table-layout:fixed}
th,td{padding:0;white-space:nowrap;line-height:1}
th{font-size:2.8mm;font-weight:500;text-align:left;border-bottom:.2mm solid #222;color:#444}
td{border-bottom:.12mm solid #c9c9c9}
tr.era td{border-top:.35mm solid #222}
.r{text-align:right}
.num{font-variant-numeric:tabular-nums}
.sans{font-family:'Noto Sans CJK JP','Noto Sans JP',sans-serif}
.note{font-size:3mm;color:#444;margin:0}
footer{position:absolute;left:14mm;right:14mm;bottom:9mm;font-size:2.8mm;color:#666;text-align:right}`;

const doc = (title, css, body, path) =>
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title}｜${SITE.name}</title><style>${CSS}\n${css}</style></head><body><div class="page">${body}<footer>${SITE.name}　${host}${path}</footer></div></body></html>`;

// 年齢・和暦：今年の0歳から100歳まで（101行を3列）。年齢は今年の誕生日のあと
function nenreiHtml(year) {
  const rows = Array.from({ length: 101 }, (_, age) => {
    const y = year - age;
    const w = warekiOfYear(y);
    return { y, age, wa: w.text, before: w.before, eto: etoOf(y).kanji };
  });
  const table = (part) => {
    let prev = null;
    const trs = part.map((r) => {
      const cls = prev && era(prev.wa) !== era(r.wa) ? ' class="era"' : '';
      prev = r;
      const wa = r.before ? `<span class="two">${r.before}<br>${r.wa}</span>` : r.wa;
      return `<tr${cls}><td class="num age sans r">${r.age}</td><td class="num">${r.y}</td><td>${wa}</td><td class="eto">${r.eto}</td></tr>`;
    });
    return `<table><colgroup><col style="width:17%"><col style="width:22%"><col style="width:45%"><col style="width:16%"></colgroup><thead><tr><th class="r">年齢</th><th>西暦</th><th>和暦</th><th>干支</th></tr></thead><tbody>${trs.join('')}</tbody></table>`;
  };
  const eras = ERA_TABLE.filter((e) => ['令和', '平成', '昭和'].includes(e.name))
    .reverse()
    .map((e) => `${e.name} ${e.start.y}年${e.start.m}月${e.start.d}日`)
    .join('　');
  const css = `.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:0 6mm}
th{height:6mm}
td{height:6.6mm;font-size:3.5mm}
td.age{font-weight:700;font-size:3.6mm;padding-right:2.2mm}
th.r{padding-right:2.2mm}
td.eto{color:#444}
.two{display:block;font-size:2.5mm;line-height:1.2}
.note{margin-top:4mm}`;
  const body = `<header><h1>年齢早見表</h1><div class="ed"><b>${year}年</b>（${warekiOfYear(year).text}）の誕生日のあとの年齢</div></header><div class="rule2"></div>
<div class="cols">${split(rows, [34, 34, 33]).map(table).join('')}</div>
<p class="note">元号のはじまり　${eras}</p>`;
  return doc(`年齢早見表 ${year}年（${warekiOfYear(year).text}）`, css, body, PRINTS.nenrei.path);
}

// 学歴：去年から66年分の生まれ年（33行を2列）。入学は4月、卒業は3月。小・中・高の卒業は次の学校に入る年と同じ
function gakurekiHtml(year) {
  // 生まれた年の和暦は、この行の人が生まれる4月2日〜12月31日のもの（2019年は平成31年と令和元年）
  const nen = (w) => `${w.era}${w.year === 1 ? '元' : w.year}`;
  const short = (w) => `${w.era[0]}${w.year === 1 ? '元' : w.year}`;
  const rows = Array.from({ length: 66 }, (_, i) => {
    const y = year - 1 - i;
    const g = gakureki({ birth: `${y}-06-01` }).rows;
    const a = warekiOf({ y, m: 4, d: 2 });
    const z = warekiOf({ y, m: 12, d: 31 });
    return { y, wa: z.era, birthWa: a.era === z.era ? nen(z) : `${short(a)}・${short(z)}`, cells: [0, 2, 4, 6, 7].map((k) => g[k]) };
  });
  const head = [['小学校', '入学'], ['小学校卒業', '中学校入学'], ['中学校卒業', '高校入学'], ['高校卒業', '大学入学'], ['大学', '卒業']];
  const table = (part) => {
    let prev = null;
    const trs = part.map((r) => {
      const cls = prev && era(prev.wa) !== era(r.wa) ? ' class="era"' : '';
      prev = r;
      return `<tr${cls}><td class="by"><div><span class="num">${r.y}</span><small>${r.birthWa}</small></div></td>${r.cells.map((c) => `<td><div><span class="num">${c.y}</span><small>${c.wareki}</small></div></td>`).join('')}</tr>`;
    });
    return `<table><colgroup><col style="width:17.5%">${'<col style="width:16.5%">'.repeat(5)}</colgroup><thead><tr><th>生まれた年</th>${head.map(([a, b]) => `<th>${a}<br>${b}</th>`).join('')}</tr></thead><tbody>${trs.join('')}</tbody></table>`;
  };
  const css = `.cols{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
th{height:8.6mm;font-size:2.3mm;line-height:1.25;vertical-align:bottom;padding-bottom:1mm}
.page{padding-top:11.5mm}
td{height:6.9mm;font-size:3.2mm}
td div{display:flex;flex-direction:column;justify-content:center;height:6.9mm;line-height:1.05}
td small{font-size:2.1mm;color:#555;margin-top:.45mm}
td.by .num{font-weight:700}
.note{margin-top:3mm}`;
  const body = `<header><h1>学歴早見表</h1><div class="ed">履歴書の入学と卒業の年　入学は4月・卒業は3月</div></header><div class="rule2"></div>
<div class="cols">${split(rows, [33, 33]).map(table).join('')}</div>
<p class="note">4月2日〜12月31日生まれの年です。1月1日〜4月1日生まれは前の年の行を見てください。浪人・留年なしの年です。</p>`;
  return doc(`学歴早見表 ${year}年`, css, body, PRINTS.gakureki.path);
}

// 消毒液：作る濃度ごとに、水500ml・1L・2Lに入れる漂白剤の量
function hyohakuzaiHtml() {
  const trs = HYOHAKU_TARGETS.map(
    (t) => `<tr><td class="pct"><span class="num">${t.pct}％</span><small>${t.ppm}</small></td><td class="use">${t.use}</td>${HYOHAKU_PRINT_WATERS.map((w) => `<td class="ml num sans r">${volumeText(hyohakuAmount(t.pct, w))}</td>`).join('')}</tr>`,
  ).join('');
  const css = `table{margin-top:2mm}
th{height:9mm;font-size:3.4mm;vertical-align:bottom;padding-bottom:1.6mm}
th.r{padding-right:3mm}
td{height:28mm;font-size:4.4mm;vertical-align:middle}
td.pct .num{font-size:7mm;font-weight:600}
td.pct small{display:block;font-size:3mm;color:#555;margin-top:1.4mm}
td.use{white-space:normal;line-height:1.5;padding-right:4mm}
td.ml{font-size:7.4mm;font-weight:700;padding-right:3mm}
.cap{font-size:3.6mm;margin:4mm 0 0;line-height:1.7}
h2{font-size:5.4mm;font-weight:600;margin:16mm 0 3mm;padding-bottom:1.6mm;border-bottom:.2mm solid #222}
ul{margin:0;padding:0;list-style:none;font-size:5mm;line-height:2.2}
li::before{content:"・"}
.src{margin-top:12mm}`;
  const names = [...new Set([...HYOHAKU_AMOUNT_SOURCES, ...HYOHAKU_CAUTION_SOURCES].map(([n]) => n))].join('・');
  const body = `<header><h1>消毒液の作り方</h1><div class="ed">塩素系漂白剤（<b>${HYOHAKU_SRC}％</b>）を水で薄める</div></header><div class="rule2"></div>
<table><colgroup><col style="width:18%"><col style="width:34%"><col style="width:16%"><col style="width:16%"><col style="width:16%"></colgroup>
<thead><tr><th>作る濃度</th><th>使いみちの例</th>${HYOHAKU_PRINT_WATERS.map((w) => `<th class="r">水${volumeText(w)}に</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table>
<p class="cap">表の量は、水に入れる漂白剤の量です。ハイターのキャップ1杯は約${HYOHAKU_CAP}mlです。<br>古い漂白剤は濃度が下がっています。</p>
<h2>使うときの注意</h2>
<ul>${HYOHAKU_CAUTIONS.map((c) => `<li>${c}</li>`).join('')}</ul>
<p class="note src">出典：${names}</p>`;
  return doc('消毒液の作り方（塩素系漂白剤）', css, body, PRINTS.hyohakuzai.path);
}

/** 印刷用のHTML（scripts/make-prints.py がPDFにする。tests/prints.test.mjs が作り直し忘れを見張る） */
export function printHtml(kind, year) {
  if (kind === 'nenrei') return nenreiHtml(year);
  if (kind === 'gakureki') return gakurekiHtml(year);
  if (kind === 'hyohakuzai') return hyohakuzaiHtml();
  throw new Error(`知らない早見表：${kind}`);
}
