// 和暦・西暦の変換（10/22 しょーくん「昭和とか平成に直したりとか、いちいち調べてる」。王道）
// 元号のマス（古い順）と、西暦か和暦のあとから入れたほう（もう片方は点線の答えの欄）。西暦を入れると、その年の元号のマスに赤ペンの丸
// 結果は元号の年表（元号の長さで区切った帯に、その年の赤い線）と、大きな答え・六十干支・何年前。改元の年は前の元号の最後の日を添える
// ページに載せる計算例と早見表は tests/gakureki-wareki.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { warekiOfYear } from '../lib/hizuke.mjs';
import { ERA_TABLE, kanshiOf, wareki, nenpyoLayout, nenIfContinued } from '../lib/wareki.mjs';
import { printLink } from '../prints.mjs';
import { stair, zBox } from '../zukai.mjs';

const tool = toolBySlug('wareki');
const path = '/wareki/';
// 改元の日と、慶応4年を明治元年としたこと（国立天文台 暦Wiki の元号のページ）
const SRC_ERA = 'https://eco.mtk.nao.ac.jp/koyomi/wiki/CEF2BBCB2FB8B5B9E6.html';
const THIS_YEAR = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date()));

const TILES = ERA_TABLE.map((e) => `<button type="button" class="tile" data-era="${e.name}" aria-pressed="false"><b>${e.name}</b><small>${e.start.y}〜</small></button>`).join('');
// 和暦の欄：元号は欄の中の数字の前に（えらんだマスか、西暦から出した元号）
const WAREKI_FIELD = `<div class="field box-field" id="f-wareki"><label for="wareki">和暦</label><div class="input"><span class="era-pre" id="era-pre"></span><input id="wareki" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="10"><span class="unit">年</span></div></div>`;

// 元号の年表：1868年から（今年＋6年）まで、元号ごとに区切った帯（src/lib/wareki.mjs の nenpyoLayout）。src/client/wareki.js が、入れた年に合わせて描き直す
const NENPYO = `<svg class="nenpyo" viewBox="0 0 100 150" aria-hidden="true">${nenpyoLayout(THIS_YEAR + 6).map(
  (r, i) => `<rect class="np-era" id="np-${i}" x="0" y="${r.top.toFixed(1)}" width="100" height="${r.h.toFixed(1)}"/><text class="np-t" id="nt-${i}" x="10" y="${(r.top + r.h / 2).toFixed(1)}">${ERA_TABLE[i].name}</text>`,
).join('')}<g class="np-mark" id="np-mark" hidden><line id="np-line" x1="60" x2="100" y1="0" y2="0"/><circle id="np-dot" cx="60" cy="0" r="3.2"/></g></svg>`;

// 元号の表（はじまりの日・足す数・年数）
const ERA_ROWS = [...ERA_TABLE].reverse().map((e) => {
  const start = e.name === '明治' ? '1868年（慶応4年）' : `${e.start.y}年${e.start.m}月${e.start.d}日`;
  return `<tr><td>${e.name}</td><td>${start}</td><td class="num">${e.y0}</td><td class="num">${e.name === '令和' ? '—' : `${e.last}年`}</td></tr>`;
}).join('\n');

// 早見表：今年の4年後から1868年まで（西暦・和暦・干支）。改元の年は2つの元号を書く
const QUICK_ROWS = Array.from({ length: THIS_YEAR + 4 - 1868 + 1 }, (_, i) => THIS_YEAR + 4 - i).map((y) => {
  const w = warekiOfYear(y);
  const k = kanshiOf(y);
  return `<tr><td class="num">${y}年</td><td class="wrap">${w.before ? `${w.before}<br>` : ''}${w.text}</td><td>${k.kanji}（${k.yomi}）</td></tr>`;
}).join('\n');

const NOW = wareki({ from: 'seireki', seireki: THIS_YEAR, thisYear: THIS_YEAR });
const EX1 = wareki({ from: 'wareki', era: '平成', nen: 10, thisYear: THIS_YEAR });

// 図解（#82）：和暦 → 西暦の絵の式（年の答えなので帯の図はつけない）。数字は tests/zukai-kurashi.test.mjs
export const Z_WAREKI = { y: EX1.y, now: NOW.text };
const ZUKAI = stair(zBox('和暦', '平成10年'), { b: '10 ＋ 1988', small: '平成の足す数' }, zBox('西暦', `${EX1.y}年`, true), ['西暦 ＝ 和暦の年 ＋ 元号ごとの数', '和暦の年 ＝ 西暦 − 元号ごとの数', `例：平成10年は 10 ＋ 1988 ＝ ${EX1.y}年です。${THIS_YEAR}年は ${THIS_YEAR} − 2018 ＝ ${NOW.text}です。`], `${THIS_YEAR}年は ${THIS_YEAR} − 2018 ＝ <b class="fz-red">${NOW.text}</b>`);

// 本文の例（使う場面の例・よくある質問）。数字は tests/gakureki-wareki.test.mjs
const W = (era, nen) => wareki({ from: 'wareki', era, nen, thisYear: THIS_YEAR });
const agoText = (y) => (y < THIS_YEAR ? `今年から${THIS_YEAR - y}年前` : y > THIS_YEAR ? `今年から${y - THIS_YEAR}年後` : '今年');
const EX_S50 = W('昭和', 50);
const EX_1983 = wareki({ from: 'seireki', seireki: 1983, thisYear: THIS_YEAR });
const EX_R12 = W('令和', 12);
const EX_S15 = W('昭和', 15);
const EX_H20 = W('平成', 20);
const EX_S11 = W('昭和', 11);

const FAQS = [
  {
    q: '今年は令和何年ですか？',
    a: `<p>${THIS_YEAR}年は${NOW.text}です。令和元年は2019年なので、西暦から2018を引くと令和の年になります。</p>`,
  },
  {
    q: '今年は平成何年ですか？',
    a: `<p>平成は2019年4月30日で終わり、いまの元号は令和です。平成が続いていたとして数えると、${THIS_YEAR}年は平成${nenIfContinued('平成', THIS_YEAR)}年、昭和なら${nenIfContinued('昭和', THIS_YEAR)}年にあたります。</p>`,
  },
  {
    q: '平成20年は西暦何年ですか？',
    a: `<p>${EX_H20.y}年です。平成の年に1988を足すと西暦になります。</p>`,
  },
  {
    q: '昭和11年は西暦何年ですか？',
    a: `<p>${EX_S11.y}年です。昭和の年に1925を足します。</p>`,
  },
  {
    q: '元年とは何ですか？',
    a: '<p>元号が変わった最初の年のことで、1年とは書かずに元年と書きます。このツールでは、和暦の欄に1と入れてください。</p>',
  },
  {
    q: '昭和は何年までですか？',
    a: '<p>昭和64年（1989年）の1月7日までで、1月8日からが平成元年です。平成は31年（2019年）の4月30日までで、5月1日からが令和元年です。</p>',
  },
  {
    q: '明治元年はいつからですか？',
    a: `<p>明治の改元では、慶応4年を明治元年としました。明治5年までは旧暦なので、月日は西暦とずれます。くわしくは<a href="${SRC_ERA}">国立天文台の暦Wiki</a>にあります。</p>`,
  },
  {
    q: '干支は何を出していますか？',
    a: `<p>その年の六十干支です。${THIS_YEAR}年は${NOW.kanshi.kanji}（${NOW.kanshi.yomi}）です。年の区切りは1月1日で計算しています。</p>`,
  },
  {
    q: '来年より先の和暦は？',
    a: '<p>令和の次の元号は決まっていないので、令和が続いたときの年として出します。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">和暦と西暦を、どちらからでも変換します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="tiles tiles-5" role="group" aria-label="元号をえらぶ">${TILES}</div>
    <div class="pair">${boxField('seireki', '西暦', '年', '1998')}${WAREKI_FIELD}</div>
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title"><span>和暦と西暦</span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="pic-row">
      ${NENPYO}
      <div class="pic-side">
        <p class="slip-k" id="r-cap"></p>
        <p class="slip-v"><b id="r-num">？</b><small id="r-unit"></small></p>
        <p class="pc-say" id="r-say"></p>
      </div>
    </div>
    <table class="slip-table"><thead><tr><th>今年から</th><th>その年生まれ</th></tr></thead><tbody><tr><td id="d-ago">—</td><td id="d-age">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">西暦か和暦を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `${ZUKAI}<div class="tbl-wrap"><table>
<thead><tr><th>元号</th><th>はじまり</th><th class="num">足す数</th><th class="num">年数</th></tr></thead>
<tbody>
${ERA_ROWS}
</tbody>
</table></div>
<p>元号は改元した年を元年として数えるので、西暦からその元号がはじまる前の年を引くと、和暦の年になります。令和は2019年が元年なので2018を、平成は1989年が元年なので1988を使います。改元の年は、1年の中で2つの元号がまざります。例：昭和50年は 50 ＋ 1925 ＝ ${EX_S50.y}年です。</p>
<p>改元の日は<a href="${SRC_ERA}">国立天文台の暦Wiki</a>によります。</p>`,
)}

${section(
  'table',
  '和暦・西暦の早見表',
  `${printLink('nenrei', { label: '年齢・和暦の早見表のPDF' })}<div class="tbl-wrap"><table class="tbl-tight">
<thead><tr><th class="num">西暦</th><th>和暦</th><th>干支</th></tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">${THIS_YEAR + 1}年からは令和が続いたときの年です。</p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>書類に生まれた年を和暦で書くとき。1983年生まれなら${EX_1983.text}です。その年生まれの人の今の年齢は、誕生日まで入れると<a href="/nenrei/">年齢の計算</a>で出ます。</p>
<p>書類に「令和12年3月31日まで」と書かれていたら、令和12年は${EX_R12.y}年で、${agoText(EX_R12.y)}です。</p>
<p>古い書類に昭和15年とあれば${EX_S15.y}年で、${agoText(EX_S15.y)}です。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>改元の年は、月で元号がかわります</h3>
<p>昭和64年は1月7日までの7日間だけで、1989年はほとんどが平成元年です。2019年も4月30日までが平成31年、5月1日からが令和元年なので、2019年3月の卒業は平成31年3月と書きます。入学と卒業の年月は、<a href="/gakureki/">入学・卒業年の計算</a>で和暦でも出せます。</p>
<h3>引く数を、はじまりの年にしてしまう</h3>
<p>昭和は1926年にはじまりましたが、引くのは1925です。1975年から1926を引くと49で、正しい昭和50年より1年ずれます。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '和暦・西暦の変換｜令和・平成・昭和は西暦何年か（早見表）',
    description: `和暦と西暦を変換します。平成10年は${EX1.y}年、${THIS_YEAR}年は${NOW.text}です。昭和64年や平成31年のような改元の年と、干支・何年前かも出します。1868年〜${THIS_YEAR + 4}年の和暦・西暦の早見表つき。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '西暦と和暦（明治・大正・昭和・平成・令和）を年で変換して、干支と今年から何年前かを出すツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['wareki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

