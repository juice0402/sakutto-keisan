// パーセントの計算：もとの数・割合・その数のうち2つを入れると、残りの1つ（点線の答えの欄）が出る
// もとの数がわかっていることが多いので、もとの数が入っていれば割合かその数のどちらかを答えにする（掛け率・塩分濃度と同じ）
// 結果は方眼の100マス（割合の分だけ赤ペンでぬる）と、大きな答え、「200の15％は30」の1行、％・割・小数の表
// ページに載せる計算例は tests/percent.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { percent, wariOf, decimalOf } from '../lib/percent.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, zBox, hyakuMasu } from '../zukai.mjs';

const tool = toolBySlug('percent');
const path = '/percent/';

// 100マスの方眼（線だけ。ぬる所は src/client/percent.js が #pc-fill に描く）
const lines = Array.from({ length: 9 }, (_, i) => `M${(i + 1) * 10} 0V100M0 ${(i + 1) * 10}H100`).join('');
const GRID = `<svg class="pc-grid" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" class="pc-bg"/><path id="pc-fill" class="pc-fill" d=""/><path d="${lines}" class="pc-line"/><rect width="100" height="100" class="pc-frame"/></svg>`;

// 割合の言い方の表（tests/percent.test.mjs と同じ）
const WARI = [1, 5, 10, 15, 25, 30, 50, 75, 100];
const WARI_ROWS = WARI.map((p) => `<tr><td class="num">${p}％</td><td class="num">${fmt(wariOf(p), 1)}割</td><td class="num">${fmt(decimalOf(p), 2)}</td></tr>`).join('\n');

// よく使う数の早見表（もとの数 × 1〜50％）
const QUICK_BASE = [100, 1000, 3000, 5000];
const QUICK_PCT = [1, 5, 10, 20, 50];
const QUICK_ROWS = QUICK_BASE.map(
  (b) => `<tr><td class="num">${fmt(b)}</td>${QUICK_PCT.map((p) => `<td class="num">${fmt(percent({ base: b, pct: p, part: null, out: 'part' }).part)}</td>`).join('')}</tr>`,
).join('\n');

// 図解（#70）：箱の式と100マス（200の15％）
const ZX = percent({ base: 200, pct: 15, out: 'part' });
const ZUKAI = stair(zBox('もとの数', '200'), { b: '×15÷100', small: '15％' }, zBox('その数', `${fmt(ZX.part)}`, true), ['その数 ＝ もとの数 × 割合 ÷ 100', '割合 ＝ その数 ÷ もとの数 × 100', 'もとの数 ＝ その数 ÷ 割合 × 100'], `${hyakuMasu(15, '100マスのうち15マスをぬった図。15％は100のうち15')}200の15％は <b class="fz-red">${fmt(ZX.part)}</b>`);

const FAQS = [
  {
    q: '「AはBの何％」はどう計算しますか？',
    a: '<p>A ÷ B × 100 です。30は200の何％かなら、30 ÷ 200 × 100 ＝ 15％です。もとの数に200、その数に30を入れてください。</p>',
  },
  {
    q: '「Bの○％」はいくつですか？',
    a: '<p>B × ○ ÷ 100 です。1,980の10％は198です。もとの数と割合を入れると出ます。</p>',
  },
  {
    q: '○％にあたる数から、もとの数を出すには？',
    a: '<p>その数 ÷ 割合 × 100 です。50が25％なら、もとの数は200です。割合とその数を入れて、もとの数を空けてください。</p>',
  },
  {
    q: '1割は何％ですか？',
    a: '<p>1割は10％です。1.5割は15％、3割は30％です。下の表に、％・割・小数の言い方をまとめています。</p>',
  },
  {
    q: '100％より大きくてもいいですか？',
    a: '<p>入れられます。80の150％は120です。マスの絵は100マスぜんぶをぬって、何倍かを下に出します。</p>',
  },
  {
    q: '値段の割引や消費税も計算できますか？',
    a: '<p>割引は<a href="/waribiki/">割引計算</a>、消費税は<a href="/shohizei/">消費税の計算</a>で、払う値段まで出せます。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">何％か、15％はいくつかなどを計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('base', 'もとの数', '', '200')}
    <div class="pair">${boxField('pct', '割合', '％', '15')}${boxField('part', 'その数', '', '30', '', 'もとの数の○％にあたる数')}</div>
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title"><span>100マスでみると<small>1マス＝1％</small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="pic-row">
      <div class="pc-box">${GRID}</div>
      <div class="pic-side">
        <p class="slip-k" id="r-cap">その数</p>
        <p class="slip-v"><b id="r-num">？</b><small id="r-unit"></small></p>
        <p class="pc-say" id="r-say"></p>
      </div>
    </div>
    <table class="slip-table"><thead><tr><th>％</th><th>割</th><th>小数</th></tr></thead><tbody><tr><td id="d-pct">—</td><td id="d-wari">—</td><td id="d-dec">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">もとの数を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  ZUKAI,
)}

${section(
  'quick',
  'よく使う割合の早見表',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">数</th>${QUICK_PCT.map((p) => `<th class="num">${p}％</th>`).join('')}</tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>`,
)}

${section(
  'wari',
  '％・割・小数',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">％</th><th class="num">割</th><th class="num">小数</th></tr></thead>
<tbody>
${WARI_ROWS}
</tbody>
</table></div>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: 'パーセントの計算｜何％？○％はいくつ？割合を計算',
    description: `パーセント（割合）を計算します。200の15％は${fmt(percent({ base: 200, pct: 15, part: null, out: 'part' }).part)}のように、もとの数・割合・その数のうち2つから残りの1つを出します。％・割・小数の言い方と、${QUICK_BASE.map((b) => fmt(b)).join('・')}の早見表もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, 'もとの数・割合（％）・その数のうち2つから、残りの1つを出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['percent.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
