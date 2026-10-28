// 偏差値の計算（10/27 しょーくん「くらしノートに負けない」。検索候補「偏差値 パーセント 一覧」「偏差値 上位何パーセント」「偏差値 計算 高校」）
// 偏差値の欄か、得点・平均点・標準偏差（あとから入れたほう）から、上位何％と100人中何番くらいか。得点からのときは偏差値の欄に点線の答え
// 結果はテストの山（正規分布。自分より上の分を赤でぬる）。計算は src/lib/hensachi.mjs（ページの数は tests/hensachi.test.mjs）
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { hsFromDev, hsCurve, hsX, HS_LO, HS_HI } from '../lib/hensachi.mjs';

const tool = toolBySlug('hensachi');
const path = '/hensachi/';
const DEVS = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
const ROWS = DEVS.map((d) => {
  const r = hsFromDev(d);
  return `<tr><td class="num">${d}</td><td class="num">${r.up.num}${r.up.unit}</td><td class="num">${r.rank}番</td></tr>`;
}).join('\n');
const E60 = hsFromDev(60);
const E70 = hsFromDev(70);
const SRC = [
  { name: '東京大学「確率と統計」講義 正規分布と偏差値', url: 'https://www.ms.u-tokyo.ac.jp/tambara/docs/l4h20160723-2miyamoto.pdf' },
  { name: '総務省統計局 なるほど統計学園「データの散らばりを見る」', url: 'https://www.stat.go.jp/naruhodo/10_tokucho/chirabari.html' },
];
const TICKS = [30, 40, 50, 60, 70].map((d) => `<line x1="${hsX(d)}" y1="60" x2="${hsX(d)}" y2="63"/><text x="${hsX(d)}" y="71">${d}</text>`).join('');

const FAQS = [
  { q: '偏差値の求め方は？', a: '<p>偏差値 ＝ 50 ＋ 10 ×（得点 − 平均点）÷ 標準偏差 です。平均点と同じ得点なら偏差値は50です。</p>' },
  { q: '標準偏差とは？', a: '<p>みんなの点が平均点からどのくらいちらばっているかの数です。模試やテストの結果の表に書いてあることが多いです。</p>' },
  { q: '上位何％はどう出しますか？', a: `<p>点がふつうの山の形に近いとして、自分より上にいる人の割合を出します。偏差値60なら上位${E60.up.num}％、70なら上位${E70.up.num}％です。</p>` },
  { q: '偏差値50は真ん中ですか？', a: '<p>平均点と同じで、山の形なら上位50％のまん中です。</p>' },
  { q: 'なぜ目安なのですか？', a: '<p>テストの点がきれいな山の形になるとは限らないからです。受けた人が少ないテストでは、ずれが大きくなります。</p>' },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">偏差値から上位何％かを出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('dev', '偏差値', '', '60')}
    <div class="trio">${boxField('score', '得点', '点', '72')}${boxField('mean', '平均点', '点', '60')}${boxField('sd', '標準偏差', '', '12', '', 'テストの結果の表にある数')}</div>
  </div>
  <div class="slip" aria-live="polite">
    <p class="slip-title"><span>テストの山<small>目安</small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <p class="slip-sum"><span class="slip-k">上位</span><span class="slip-v"><b id="r-num">？</b><small id="r-unit">％</small></span></p>
    <p class="pc-say" id="r-say"></p>
    <svg class="hs-mount" viewBox="0 0 200 74" aria-hidden="true"><path class="hs-area" id="hs-area" d=""/><path class="hs-curve" d="${hsCurve(HS_LO, HS_HI)}"/><line class="hs-base" x1="0" y1="60" x2="200" y2="60"/>${TICKS}<line class="hs-me" id="hs-me" x1="0" y1="4" x2="0" y2="60" visibility="hidden"/></svg>
    <table class="slip-table"><thead><tr><th>偏差値</th><th>上位</th><th>下位</th></tr></thead><tbody><tr><td id="d-dev">—</td><td id="d-up">—</td><td id="d-low">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">偏差値か得点を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool, false)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>偏差値 ＝ 50 ＋ 10 ×（得点 − 平均点）÷ 標準偏差</span>
</div>
<p>例：平均点60点・標準偏差12のテストで72点なら、偏差値は60で、上位${E60.up.num}％です。</p>`,
)}

${section(
  'table',
  '偏差値と上位何％の早見表',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">偏差値</th><th class="num">上位</th><th class="num">100人中</th></tr></thead>
<tbody>
${ROWS}
</tbody>
</table></div>
<p class="note">点が山の形に近いときの目安です。</p>
`,
)}

${section('sources', '出典', `<ul class="src-list">${SRC.map((s) => `<li><a href="${s.url}" rel="noopener">${s.name}</a></li>`).join('')}</ul>`)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '偏差値の計算｜上位何パーセントか（偏差値の求め方と早見表）',
    description: `偏差値から上位何％かを計算します。偏差値60は上位${E60.up.num}％で100人中${E60.rank}番くらい、70は上位${E70.up.num}％です。得点・平均点・標準偏差から偏差値も出し、偏差値30〜75の早見表もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '偏差値か、得点・平均点・標準偏差から、上位何パーセントと100人中何番くらいかを出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['hensachi.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
