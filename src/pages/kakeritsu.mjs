// 掛け率の計算：上代・掛け率・下代のうち2つを入れると、残りの1つ（点線の答えの欄）と粗利が出る（利益率の計算と同じ形）
// 掛け率は5〜8掛けのマスでもえらべる。「6掛け」は60でも6でも入れられる（src/lib/kakeritsu.mjs の kakePct）
// 結果は納品書（大きな答え、何掛けのはんこ、上代・掛率・下代・粗利の表、上代の帯を下代と粗利に分けた絵）。ページに載せる計算例は tests/kakeritsu.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { kakeritsu, kakeText, KAKE_TILES } from '../lib/kakeritsu.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, band, zBox } from '../zukai.mjs';

const tool = toolBySlug('kakeritsu');
const path = '/kakeritsu/';
// 言葉の意味（上代・下代・掛け率）の出典
const SRC_WORDS = 'https://biz.moneyforward.com/accounting/basic/78527/';

const TILES = KAKE_TILES.map((p) => `<button type="button" class="tile tile-long" data-rate="${p}" aria-pressed="false"><b>${kakeText(p)}掛け</b><small>${p}%</small></button>`).join('');

// 早見表：上代 × 5〜8掛け（tests/kakeritsu.test.mjs と同じ）
const QUICK = [1000, 2000, 3000, 5000, 10000, 1980, 2980, 4980];
const QUICK_ROWS = QUICK.map(
  (j) => `<tr><td class="num">${fmt(j)}円</td>${KAKE_TILES.map((p) => `<td class="num">${fmt(kakeritsu({ jodai: j, rate: p, gedai: null, out: 'gedai' }).gedai)}</td>`).join('')}</tr>`,
).join('\n');

// 図解（#83）：上代と掛け率から下代の絵の式と、上代の帯を下代と粗利に分けた図。数字は tests/zukai-shigoto.test.mjs
const ZK = kakeritsu({ jodai: 1980, rate: 65, gedai: null, out: 'gedai' });
export const Z_KAKE = { gedai: ZK.gedai, profit: ZK.profit };
const ZUKAI = stair(zBox('上代', '1,980円'), { b: '× 0.65', small: '6.5掛け' }, zBox('下代', `${fmt(ZK.gedai)}円`, true), ['下代 ＝ 上代 × 掛け率', '掛け率 ＝ 下代 ÷ 上代 × 100', '粗利 ＝ 上代 − 下代', `例：上代1,980円の6.5掛けは、1,980 × 0.65 ＝ ${fmt(ZK.gedai)}円です。上代で売ると、粗利は${fmt(ZK.profit)}円です。`], `上代で売ると粗利 <b class="fz-red">${fmt(ZK.profit)}円</b>`);
const BAND = band({ head: '上代 1,980円', parts: [{ w: 65, text: `下代 ${fmt(ZK.gedai)}円` }, { w: 35, kind: 'alt', text: `粗利 ${ZK.profit}円` }], ruler: [[0, '0'], [65, fmt(ZK.gedai)], [100, '1,980']], ans: `6.5掛けの粗利率 → <b>35％</b>`, label: `上代1,980円の帯を、6.5掛けの下代${fmt(ZK.gedai)}円と粗利${ZK.profit}円に分けた図` });

const FAQS = [
  {
    q: '6掛けとは何ですか？',
    a: '<p>上代の60％の値段で仕入れることです。上代3,000円の6掛けは1,800円で、6.5掛けなら65％の1,950円です。</p>',
  },
  {
    q: '上代と下代とは何ですか？',
    a: '<p>上代は、お店で売るときの定価です。下代は、お店がメーカーや問屋から仕入れる値段（卸値）です。</p>',
  },
  {
    q: '掛け率はどう出しますか？',
    a: '<p>下代を上代で割って、100をかけます。上代2,000円・下代1,300円なら、1,300 ÷ 2,000 × 100 ＝ 65％で、6.5掛けです。</p>',
  },
  {
    q: '掛け率と粗利率の関係は？',
    a: '<p>上代で売ったときの粗利率は、100から掛け率を引いた数です。6掛けで仕入れて上代で売ると、粗利率は40％です。</p>',
  },
  {
    q: '掛け率が低いほど、仕入れは安くなりますか？',
    a: '<p>安くなります。上代3,000円なら、5掛けは1,500円、8掛けは2,400円です。</p>',
  },
  {
    q: '1円未満はどうしますか？',
    a: '<p>このツールは小数2けたまでそのまま出します。切り捨てか四捨五入かは、取引先との決まりに合わせてください。</p>',
  },
  {
    q: '税込みと税抜き、どちらで入れますか？',
    a: '<p>上代と下代をどちらかにそろえれば、掛け率は同じです。粗利の金額を見るときは、税抜きで入れてください。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">上代・下代・掛け率のどれでも計算できます。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('jodai', '上代', '円', '3,000', '', 'お店で売るときの定価')}
    <div class="tiles tiles-4" role="group" aria-label="掛け率をえらぶ">${TILES}</div>
    <div class="pair">${boxField('rate', '掛け率', '％', '60', '', '6掛けなら60か6と入れます')}${boxField('gedai', '下代', '円', '1,800', '', '仕入れの値段（卸値）')}</div>
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">納品書</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum" id="r-sum"><span class="doc-sum-k" id="r-cap">下代</span><span class="doc-sum-v"><b id="r-num">？</b><span id="r-unit">円</span></span><span class="stamp" id="r-stamp" hidden><b id="r-kake"></b>掛け</span></p>
    <table class="doc-table"><thead><tr><th>上代</th><th>掛率</th><th>下代</th><th>粗利</th></tr></thead><tbody><tr id="r-row"><td>—</td><td>—</td><td>—</td><td>—</td></tr></tbody></table>
    <div class="rieki-bar" aria-hidden="true">
      <div class="rb-track"><div class="rb-cost" id="b-cost"></div><div class="rb-profit" id="b-profit"></div><div class="rb-loss" id="b-loss"></div></div>
      <p class="rb-legend"><span id="b-left">下代</span><span id="b-right">粗利</span></p>
    </div>
    <p class="doc-foot"><span id="r-foot">上代を入れてください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `${ZUKAI}
<p>掛け率は、上代を10としたとき、下代がいくつにあたるかを表します。6掛けは上代の6割、つまり60％なので、上代に0.6をかけると下代です。上代で売れば、残りの4割がお店の粗利になります。例：上代4,500円の7掛けは、4,500 × 0.7 ＝ 3,150円で、粗利は1,350円です。</p>`,
)}

${section(
  'examples',
  '上代と掛け率の早見表',
  `${BAND}<div class="tbl-wrap"><table>
<thead><tr><th class="num">上代</th>${KAKE_TILES.map((p) => `<th class="num">${kakeText(p)}掛け</th>`).join('')}</tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">下代（円）です。</p>
<p>上代で売ったときの粗利率は、5掛けで50％、8掛けで20％です。</p>
<p class="note">言葉の意味の出典：<a href="${SRC_WORDS}">マネーフォワード</a></p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>上代3,800円の雑貨を、メーカーから6.5掛けで仕入れるとき。下代は2,470円で、上代で売ると粗利は1,330円です。</p>
<p>上代2,500円の商品に、下代1,625円の見積もりが来たとき。1,625 ÷ 2,500 × 100 ＝ 65％で、6.5掛けです。上代と下代を入れると、掛け率の欄に出ます。</p>
<p>下代840円で仕入れた商品を、7掛けになる上代で売りたいときは、上代を空けて掛け率と下代を入れます。840 ÷ 0.7 ＝ 1,200円です。売値と原価から利益率を出すなら、<a href="/rieki-ritsu/">利益率の計算</a>も使えます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>下代に上乗せしても、上代にはもどりません</h3>
<p>6掛けの下代1,800円に40％を上乗せすると、1,800 × 1.4 ＝ 2,520円で、上代の3,000円になりません。上代は 1,800 ÷ 0.6 で出します。</p>
<h3>電卓で「× 6％」と打つ</h3>
<p>6掛けを6％と取りちがえると、上代3,000円の下代が180円になります。正しくは60％の1,800円です。このツールでは、掛け率の欄に6と入れても6掛けとして計算します。</p>
<h3>税込みと税抜きがまざる</h3>
<p>税抜き3,000円の上代を税込みの3,300円で入れ、下代は税抜きの1,800円のままにすると、掛け率は約54.5％になり、本当の6掛けとずれます。税込みと税抜きの直しは<a href="/shohizei/">消費税の計算</a>でできます。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '掛け率の計算｜6掛けはいくら？上代・下代から掛け率を出す',
    description:
      '掛け率を、上代（定価）と下代（仕入れの値段）から計算します。上代1,980円の6.5掛けは下代1,287円で、粗利は693円です。下代と掛け率から上代も出せて、上代ごとの5〜8掛けの早見表もあります。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '上代・掛け率・下代のうち2つから、残りの1つと粗利を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['kakeritsu.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
