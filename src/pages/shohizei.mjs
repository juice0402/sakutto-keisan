// 消費税の計算：税率（10％・8％のマス）と、税抜か税込のどちらか（あとから入れたほう。もう片方は点線の答えの欄）
// 結果はお店のレシート（税抜・消費税・税込の行と、いちばん大きな答え。8％のときは「軽減税率対象」の印）
// 消費税の1円未満は、端数があるときだけ「切り捨て・四捨五入・切り上げ」をレシートの下に出す（はじめは切り捨て）
// ページに載せる計算例は tests/shohizei.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, RECEIPT_EDGE, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { shohizei, TAX_RATES } from '../lib/shohizei.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, band, zReceipt } from '../zukai.mjs';

const tool = toolBySlug('shohizei');
const path = '/shohizei/';
// 税率と軽減税率の対象の出典（国税庁）。2027年4月からの飲食料品の税率の引き下げは、法案が成立したら直す（国税庁の特設サイト）
const SRC_RATE = 'https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/01.htm';
const SRC_CUT = 'https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/zeiritsuhikisage.htm';

const RATE_NOTE = { 10: 'ふつう', 8: '食品など' };
const TILES = TAX_RATES.map((r) => `<button type="button" class="tile" data-rate="${r}" aria-pressed="${r === 10}"><b>${r}%</b><small>${RATE_NOTE[r]}</small></button>`).join('');
const MODES = [['floor', '切り捨て'], ['round', '四捨五入'], ['ceil', '切り上げ']];
const MODE_ROW = `<div class="field unit-row" id="f-mode" hidden><p class="label" id="l-mode">1円未満</p><div class="seg" role="group" aria-labelledby="l-mode">${MODES.map(
  ([m, name]) => `<button type="button" class="seg-btn" data-mode="${m}" aria-pressed="${m === 'floor'}">${name}</button>`,
).join('')}</div></div>`;

// よくある値段の早見表（tests/shohizei.test.mjs と同じ。切り捨て）
const QUICK = [100, 298, 500, 980, 1000, 1980, 2980, 5000, 10000];
const QUICK_ROWS = QUICK.map(
  (p) => `<tr><td class="num">${fmt(p)}円</td>${TAX_RATES.map((r) => `<td class="num">${fmt(shohizei({ amount: p, from: 'net', rate: r }).gross)}</td>`).join('')}</tr>`,
).join('\n');
const EX = shohizei({ amount: 1000, from: 'gross', rate: 10 });

// 図解（#70）：レシートの式と、税込の帯（税抜1,980円・10％）
const ZX = shohizei({ amount: 1980, from: 'net', rate: 10 });
const ZX8 = shohizei({ amount: 1980, from: 'net', rate: 8 });
const ZUKAI = stair(zReceipt('税抜', `${fmt(ZX.net)}円`), { b: '×1.1', small: '消費税10％' }, zReceipt('税込', `${fmt(ZX.gross)}円`, true), ['消費税 ＝ 税抜 × 10％（8％）', '税込 ＝ 税抜 ＋ 消費税', '税込からの消費税 ＝ 税込 × 10 ÷ 110']);
const BAND = band({ head: `税込 ${fmt(ZX.gross)}円`, parts: [{ w: 91, text: `税抜 ${fmt(ZX.net)}円` }, { w: 9, kind: 'off', text: '' }], ruler: [[0, '0'], [100, '＋消費税10％', true]], ans: `消費税${fmt(ZX.tax)}円を足して → <b>${fmt(ZX.gross)}円</b>`, label: `税込${fmt(ZX.gross)}円の帯を、税抜${fmt(ZX.net)}円と消費税${fmt(ZX.tax)}円に分けた図` });

const FAQS = [
  {
    q: '8％になるのは何ですか？',
    a: '<p>お酒と外食をのぞく飲食料品と、週2回以上発行される定期購読の新聞です。持ち帰りのお弁当は8％で、お店の中で食べると10％です。</p>',
  },
  {
    q: '2027年4月から食品の消費税は変わりますか？',
    a: `<p>国税庁は、2027年4月1日から2年間、飲食料品の消費税率を引き下げる予定を<a href="${SRC_CUT}">特設サイト</a>で知らせています。法案が国会で成立した場合の話なので、決まったらこのツールも直します。</p>`,
  },
  {
    q: '税込から税抜はどう出しますか？',
    a: `<p>消費税は 税込 × 10 ÷ 110 で出して、税込から引きます。税込1,000円なら消費税は${EX.tax}円、税抜は${fmt(EX.net)}円です。</p>`,
  },
  {
    q: '1.1で割るのとはちがいますか？',
    a: '<p>1,000 ÷ 1.1 ＝ 909.09…なので、税抜を先に切り捨てると909円、消費税は91円になります。どちらを先に丸めるかで1円ずれることがあります。</p>',
  },
  {
    q: '1円未満はどうしますか？',
    a: '<p>切り捨て・四捨五入・切り上げのどれにするかは、お店や会社が決めます。このツールは切り捨てで計算して、端数があるときだけえらべるようにしています。</p>',
  },
  {
    q: '割引のあとの消費税は？',
    a: '<p>割引した税抜の値段に消費税をかけます。<a href="/waribiki/">割引計算</a>で割引後の値段を出してから、ここに入れてください。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">税込と税抜の値段、消費税を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="tiles tiles-2" role="group" aria-label="税率をえらぶ">${TILES}</div>
    <div class="pair">${boxField('net', '税抜', '円', '1,980')}${boxField('gross', '税込', '円', '2,178')}</div>
  </div>
  <div class="receipt" aria-live="polite">
    <p class="rc-title">お会計</p>
    <button type="button" class="clear-btn rc-clear" id="clear">クリア</button>
    <p class="rc-sum"><span class="rc-k" id="r-cap">税込</span><span class="rc-v"><b id="r-num">？</b><small>円</small></span></p>
    <dl class="rc-rows">
      <div><dt>税抜</dt><dd id="d-net">—</dd></div>
      <div><dt id="d-tax-k">消費税（10%）</dt><dd id="d-tax">—</dd></div>
      <div><dt>税込</dt><dd id="d-gross">—</dd></div>
    </dl>
    <p class="rc-host" id="r-reduced" hidden><span>軽減税率の対象</span><span>8%</span></p>
    <p class="rc-foot" id="r-foot">税抜か税込の値段を入れてください</p>
    ${RECEIPT_EDGE}
  </div>
  ${MODE_ROW}
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `${ZUKAI}${BAND}<p>8％なら、税抜1,980円の消費税は${fmt(ZX8.tax)}円で税込${fmt(ZX8.gross)}円です。</p>`,
)}

${section(
  'quick',
  'よくある値段の税込の早見表',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">税抜</th>${TAX_RATES.map((r) => `<th class="num">${r}％</th>`).join('')}</tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">税込（円）です。1円未満は切り捨て。</p>
<p>税率と軽減税率の対象は<a href="${SRC_RATE}">国税庁のページ</a>にあります。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '消費税の計算｜税込・税抜の値段と消費税（10％・8％）',
    description: `消費税を計算します。税抜${fmt(1980)}円は10％で税込${fmt(shohizei({ amount: 1980, from: 'net', rate: 10 }).gross)}円、8％で${fmt(shohizei({ amount: 1980, from: 'net', rate: 8 }).gross)}円です。税込${fmt(EX.gross)}円なら消費税は${fmt(EX.tax)}円で税抜${fmt(EX.net)}円。1円未満の端数の扱いも変えられ、よくある値段${QUICK.length}通りの早見表もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '税率（10％・8％）と税抜か税込の値段から、税込・税抜・消費税を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['shohizei.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
