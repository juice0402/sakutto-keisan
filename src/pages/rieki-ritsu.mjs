// 利益率の計算：売値・原価・利益率のうち2つを入れると、残りの1つ（点線の答えの欄）と利益が出る
// 結果は利益計算書（大きな利益、粗利率のはんこ、売値・原価・利益の表、売値の帯を原価と利益に分けた絵）。ページに載せる計算例は tests/rieki.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';

const tool = toolBySlug('rieki-ritsu');
const path = '/rieki-ritsu/';

const FAQS = [
  {
    q: '原価に30％をのせると、利益率は30％になりますか？',
    a: '<p>なりません。原価1,000円に30％をのせた1,300円だと、利益率は約23％です。利益率30％にするには、1,000 ÷ 0.7 で1,429円にします。</p>',
  },
  {
    q: '利益率と原価率のちがいは何ですか？',
    a: '<p>どちらも売値に対する割合で、利益率は利益の割合、原価率は原価の割合です。2つを足すと100％になります。</p>',
  },
  {
    q: '税込みと税抜き、どちらで入れますか？',
    a: '<p>売値と原価をどちらかにそろえれば、利益率は同じです。利益の金額を見るときは、税抜きで入れてください。</p>',
  },
  {
    q: '送料や手数料はどう入れますか？',
    a: '<p>1つあたりの送料や手数料を、原価に足して入れてください。売値の何％かかる手数料は、その金額を足します。</p>',
  },
  {
    q: '粗利とは何ですか？',
    a: '<p>売値から原価を引いた利益のことです。このツールの利益は粗利で、人件費や家賃は入っていません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">利益率や、利益率から売値を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="pair">${boxField('price', '売値', '円', '1,500')}${boxField('cost', '原価', '円', '1,000')}</div>
    ${boxField('rate', '利益率', '％', '30')}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">利益計算書</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum" id="r-sum"><span class="doc-sum-k" id="r-cap">利益</span><span class="doc-sum-v"><b id="r-num">？</b>円</span><span class="stamp" id="r-stamp" hidden>粗利率<b id="r-rate"></b></span></p>
    <table class="doc-table"><thead><tr><th>項目</th><th>金額</th><th>売値に対して</th></tr></thead><tbody id="r-rows"></tbody></table>
    <div class="rieki-bar" aria-hidden="true">
      <div class="rb-track"><div class="rb-cost" id="b-cost"></div><div class="rb-profit" id="b-profit"></div><div class="rb-loss" id="b-loss"></div></div>
      <p class="rb-legend"><span id="b-left">原価</span><span id="b-right">利益</span></p>
    </div>
    <p class="doc-foot"><span id="r-foot">3つのうち2つを入れてください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>利益 ＝ 売値 − 原価</span>
<span>利益率 ＝ 利益 ÷ 売値 × 100</span>
<span>売値 ＝ 原価 ÷（1 − 利益率）</span>
</div>
<p>例：原価1,000円で利益率30％にしたいときの売値は、1,000 ÷ 0.7 ＝ 1,428.5… で、1円未満を切り上げて1,429円です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>原価</th><th class="num">利益率</th><th class="num">売値</th></tr></thead>
<tbody>
<tr><td>1,000円</td><td class="num">20％</td><td class="num">1,250円</td></tr>
<tr><td>1,000円</td><td class="num">30％</td><td class="num">1,429円</td></tr>
<tr><td>1,000円</td><td class="num">40％</td><td class="num">1,667円</td></tr>
<tr><td>1,000円</td><td class="num">50％</td><td class="num">2,000円</td></tr>
</tbody>
</table></div>
<h3>原価の何倍の値段にすると、利益率は何％か</h3>
<div class="tbl-wrap"><table>
<thead><tr><th>売値</th><th class="num">利益率</th></tr></thead>
<tbody>
<tr><td>原価の1.2倍</td><td class="num">16.6％</td></tr>
<tr><td>原価の1.3倍</td><td class="num">23％</td></tr>
<tr><td>原価の1.5倍</td><td class="num">33.3％</td></tr>
<tr><td>原価の2倍</td><td class="num">50％</td></tr>
<tr><td>原価の3倍</td><td class="num">66.6％</td></tr>
</tbody>
</table></div>
<p>利益率は0.1％未満を切り捨てています。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '利益率の計算｜売値と原価から利益率・売値を出す',
    description:
      '売値と原価から利益と利益率を計算します。原価と目標の利益率から売値、売値と利益率から原価の上限も出せます。売値・原価・利益率のうち2つを入れると、残りがわかります。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '売値・原価・利益率のうち2つから、残りと利益を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['rieki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
