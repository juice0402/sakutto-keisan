// 源泉徴収の計算（10/27 夜の作業 #62）：個人に払う原稿料・デザイン料・講演料などの報酬
// 報酬（税抜）か振り込まれる額のあとから入れたほう（もう片方は点線の答えの欄）と、請求書の消費税の書き方（分けて書く・税込で書く・消費税なし）、支払う日（はじめは今日）
// 結果は請求書（いちばん大きな源泉徴収税額、報酬・消費税・源泉徴収税額・差引ご請求額の表、内わけの率。2027年1月1日から防衛特別所得税）
// ページに載せる計算例・早見表は tests/gensen.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField, dateField } from '../fields.mjs';
import { gensenFromFee, gensenOf } from '../lib/gensen.mjs';
import { fmt } from '../lib/number.mjs';

const tool = toolBySlug('gensen-choshu');
const path = '/gensen-choshu/';
// 出典（国税庁。10/27 に本文を確かめた）
const SRC_2795 = 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2795.htm';
const SRC_2027 = 'https://www.nta.go.jp/publication/pamph/pdf/0026005-024_02.pdf';

const MODES = [
  ['sep', '消費税は別', '税抜にかける'],
  ['incl', '税込で請求', '税込にかける'],
  ['none', '消費税なし', '報酬にかける'],
];
const TILES = `<div class="tiles" role="group" aria-label="請求書の消費税">${MODES.map(
  ([m, name, sub]) => `<button type="button" class="tile tile-word" data-mode="${m}" aria-pressed="${m === 'sep'}"><b>${name}</b><small>${sub}</small></button>`,
).join('')}</div>`;

// 早見表（tests/gensen.test.mjs と同じ）
const QUICK = [10000, 30000, 50000, 100000, 300000, 500000, 1000000, 2000000];
const QUICK_ROWS = QUICK.map((f) => {
  const s = gensenFromFee(f, 'sep');
  return `<tr><td class="num">${fmt(f)}円</td><td class="num">${fmt(s.gensen)}</td><td class="num">${fmt(gensenFromFee(f, 'none').net)}</td><td class="num">${fmt(s.net)}</td></tr>`;
}).join('\n');
const EX = gensenFromFee(100000, 'sep');
const EX_INCL = gensenFromFee(100000, 'incl');

const FAQS = [
  {
    q: '10.21％はどこから来た数字ですか？',
    a: '<p>所得税の10％に、復興特別所得税（所得税の2.1％）を足した率です。10％ × 1.021 ＝ 10.21％で、100万円をこえる部分は20％ × 1.021 ＝ 20.42％です。</p>',
  },
  {
    q: '消費税にも源泉徴収はかかりますか？',
    a: `<p>請求書に報酬と消費税を分けて書けば、税抜の報酬にだけかかります。税込で書くと税込の額にかかり、10万円の報酬なら源泉は${fmt(EX.gensen)}円から${fmt(EX_INCL.gensen)}円になります。</p>`,
  },
  {
    q: '振り込まれた額から報酬はわかりますか？',
    a: '<p>「振り込まれる額」の欄に入れると、報酬を出します。1円未満の切り捨てで、ちょうどその額にならないときは1円ちがう額を出します。</p>',
  },
  {
    q: '司法書士や外交員の報酬も同じですか？',
    a: '<p>司法書士・外交員・ホステスなどは、1回の額から決まった額を引いてから税率をかけるので、このツールでは計算できません。</p>',
  },
  {
    q: '源泉徴収された分はどうなりますか？',
    a: '<p>前払いした所得税として、確定申告で精算します。払いすぎていれば戻ってきます。</p>',
  },
  {
    q: '会社に払うときも源泉徴収しますか？',
    a: '<p>この報酬の源泉徴収は、個人に払うときのものです。法人に払う原稿料やデザイン料には、ふつうかかりません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">報酬から引かれる源泉徴収の額を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="pair">${boxField('fee', '報酬（税抜）', '円', '100,000')}${boxField('net', '振り込まれる額', '円', '99,790')}</div>
    ${TILES}
    ${dateField('day', '支払う日', '2027年からは内わけが変わります')}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">請求書</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k">源泉徴収税額</span><span class="doc-sum-v"><b id="r-num">？</b>円</span></p>
    <table class="doc-table gs-table"><tbody>
      <tr><th scope="row">報酬</th><td id="d-fee">—</td></tr>
      <tr><th scope="row">消費税（10%）</th><td id="d-tax">—</td></tr>
      <tr><th scope="row">源泉徴収税額</th><td id="d-gensen">—</td></tr>
      <tr class="gs-total"><th scope="row">差引ご請求額</th><td id="d-net">—</td></tr>
    </tbody></table>
    <p class="doc-info" id="r-parts"></p>
    <p class="doc-foot"><span id="r-foot">報酬か振り込まれる額を入れてください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool, false)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>100万円まで ＝ 報酬 × 10.21％</span>
<span>100万円をこえるとき ＝（報酬 − 100万円）× 20.42％ ＋ 102,100円</span>
<span>差引ご請求額 ＝ 報酬 ＋ 消費税 − 源泉徴収税額</span>
</div>
<p>例：報酬10万円で消費税を分けて書くと、源泉は${fmt(EX.gensen)}円、振り込まれる額は${fmt(EX.net)}円です。1円未満は切り捨てます。</p>`,
)}

${section(
  'quick',
  '源泉徴収の早見表',
  `<div class="tbl-wrap"><table class="tbl-tight">
<thead><tr><th class="num">報酬</th><th class="num">源泉</th><th class="num">振込（消費税なし）</th><th class="num">振込（消費税を分ける）</th></tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">円です。1円未満は切り捨て。</p>
<p>消費税を分けるときの振込は、報酬に10％の消費税を足してから源泉を引いた額です。</p>
<p class="note">出典：<a href="${SRC_2795}">国税庁 No.2795 原稿料や講演料等</a></p>`,
)}

${section(
  'r2027',
  '2027年から何が変わる？',
  `<p>2027年1月1日から払う報酬は、防衛特別所得税（所得税の1％）が加わり、復興特別所得税が所得税の2.1％から1.1％になります。足した率は同じなので、10.21％と20.42％は変わりません。</p>
<p>源泉は内わけごとに出さず、合計の率をかけて1円未満を切り捨てます。このツールは、支払う日が2027年1月1日からなら内わけの名前を切りかえます。</p>
<p class="note">出典：<a href="${SRC_2027}">国税庁 令和9年1月以後の源泉徴収</a></p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '源泉徴収の計算｜報酬の10.21％・100万円超と振込額から逆算',
    description: `報酬から引かれる源泉徴収の額を10.21％で計算します。報酬10万円なら源泉${fmt(EX.gensen)}円、消費税を分けて書くと振込は${fmt(EX.net)}円です。100万円をこえると20.42％で、200万円なら${fmt(gensenOf(2000000))}円。振り込まれた額から報酬も出せます。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '原稿料・デザイン料・講演料などの報酬から、源泉徴収の額と差引の請求額を出す計算ツール。振り込まれる額からの逆算もできる。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['gensen-choshu.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
