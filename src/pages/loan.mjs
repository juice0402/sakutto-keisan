// ローンの計算（元利均等返済）：借りる額（万円）・金利（年）・返済の年数から、毎月の返済額・返済総額・利息
// 結果は返済予定表（大きな毎月の返済額、返済総額の帯を元金と利息に分けた絵、何年後に残りがいくらかの表）
// ページに載せる計算例は tests/loan-bmi.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { loan } from '../lib/loan.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, band, zBox } from '../zukai.mjs';

const tool = toolBySlug('loan');
const path = '/loan/';
// 元利均等・元金均等の言葉の出典（全国銀行協会）
const SRC_WORDS = 'https://www.zenginkyo.or.jp/article/tag-d/5215/';

const RATES = [0.5, 1, 1.5, 2];
const YEARS = [25, 35];
const QUICK_ROWS = RATES.map((r) => `<tr><td class="num">${r}％</td>${YEARS.map((y) => `<td class="num">${fmt(loan({ man: 3000, rate: r, years: y }).monthly)}</td>`).join('')}</tr>`).join('\n');
const EX = loan({ man: 3000, rate: 1, years: 35 });
// 図解（#83）：借りる額と金利から毎月の返済の絵の式と、返済総額の帯を元金と利息に分けた図。数字は tests/zukai-shigoto.test.mjs
const man = (x) => fmt(Math.round(x / 10000));
export const Z_LOAN = { monthly: EX.monthly, total: man(EX.total), interest: man(EX.interest) };
const ZUKAI = stair(zBox('3,000万円・35年（420回）', '金利 年1％'), { b: '元利均等', small: '毎月同じ額を返す' }, zBox('毎月の返済', `約${fmt(EX.monthly)}円`, true), ['毎月の返済 ＝ 借りる額 × 月利 × B', 'B ＝ A ÷（A − 1）', 'A ＝（1 ＋ 月利）を回数だけかけた数', '月利 ＝ 年利 ÷ 12', `例：3,000万円を金利1％・35年（420回）で借りると、毎月の返済は約${fmt(EX.monthly)}円、利息の合計は約${man(EX.interest)}万円です。`], `返済総額 <b class="fz-red">約${man(EX.total)}万円</b>`);
const lw = Number(((EX.principal / EX.total) * 100).toFixed(1));
const BAND = band({ head: `返済総額 約${man(EX.total)}万円`, parts: [{ w: lw, text: '元金 3,000万円' }, { w: Number((100 - lw).toFixed(1)), kind: 'off', text: '利息' }], ruler: [[0, '0'], [100, `${man(EX.total)}万`, true]], ans: `金利1％・35年の利息 → <b>約${man(EX.interest)}万円</b>`, label: `返済総額約${man(EX.total)}万円の帯を、元金3,000万円と利息約${man(EX.interest)}万円に分けた図` });

const FAQS = [
  {
    q: '元利均等返済とは何ですか？',
    a: '<p>毎月の返済額（元金と利息の合計）が同じになる返し方です。はじめは利息が多く、だんだん元金の分がふえていきます。このツールはこの返し方で計算します。</p>',
  },
  {
    q: '元金均等返済だとどうなりますか？',
    a: '<p>元金を毎月同じ額ずつ返して、利息を上乗せする返し方です。はじめの返済額が多く、だんだん減ります。利息の合計は元利均等より少なくなります。</p>',
  },
  {
    q: '金利は何を入れますか？',
    a: '<p>1年あたりの金利（年利）です。変動金利のときは、いまの金利で計算した目安になります。</p>',
  },
  {
    q: '毎月の返済額の1円未満は？',
    a: '<p>切り上げています。銀行によって端数の処理や、最後の回の調整がちがうので、実際の額とは数円ずれることがあります。</p>',
  },
  {
    q: 'ボーナス払いや手数料は入っていますか？',
    a: '<p>入っていません。毎月同じ額だけで返すときの計算です。保証料や手数料は、借りるところの案内で確かめてください。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">ローンの毎月の返済額と利息を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('man', '借りる額', '万円', '3,000')}
    <div class="pair">${boxField('rate', '金利（年）', '％', '1', '', '1年あたりの金利。変動ならいまの金利')}${boxField('years', '返済の年数', '年', '35')}</div>
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">返済予定表</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k">毎月の返済</span><span class="doc-sum-v"><b id="r-num">？</b>円</span></p>
    <p class="doc-info"><span id="r-total"></span><span id="r-interest"></span></p>
    <div class="rieki-bar" aria-hidden="true">
      <div class="rb-track"><div class="rb-cost" id="b-cost"></div><div class="rb-profit" id="b-profit"></div></div>
      <p class="rb-legend"><span id="b-left">元金</span><span id="b-right">利息</span></p>
    </div>
    <table class="doc-table"><thead><tr><th>経過</th><th>返した額</th><th>のこり</th></tr></thead><tbody id="r-rows"></tbody></table>
    <p class="doc-foot"><span id="r-foot">借りる額を入れてください</span></p>
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
  '3,000万円を借りたときの毎月の返済',
  `${BAND}<div class="tbl-wrap"><table>
<thead><tr><th class="num">金利</th>${YEARS.map((y) => `<th class="num">${y}年</th>`).join('')}</tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">毎月の返済（円）です。元利均等返済。</p>
<p>返し方の言葉は<a href="${SRC_WORDS}">全国銀行協会のページ</a>にあります。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: 'ローンの計算｜毎月の返済額と利息（住宅ローン・車のローン）',
    description: `ローンの毎月の返済額を、元利均等返済で計算します。3,000万円を金利1％・35年で借りると、毎月約${fmt(EX.monthly)}円で、利息の合計は約${fmt(Math.round(EX.interest / 10000))}万円です。金利${RATES[0]}〜${RATES.at(-1)}％・${YEARS.join('年と')}年の早見表もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '借りる額・年利・返済の年数から、元利均等返済の毎月の返済額・返済総額・利息を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['loan.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
