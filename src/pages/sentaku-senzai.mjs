// 洗濯洗剤の量の計算：洗剤のマス（メーカーの表示を確かめた洗剤）か、ボトルの表示「水◯Lに◯mL」と、水の量から1回の量
// 結果は計量キャップの写真（白い背景の写真を multiply で重ねて、中の洗剤を透かす。量で液の高さが変わる）と、いちばん大きな1回の量
// 洗剤の数字は src/data/senzai.mjs（出典つき）。ページに載せる計算例と早見表は tests/senzai.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { SENZAI, SENZAI_WATER } from '../data/senzai.mjs';
import { senzai } from '../lib/senzai.mjs';
import { fmt } from '../lib/number.mjs';

const tool = toolBySlug('sentaku-senzai');
const path = '/sentaku-senzai/';
const esc = (s) => s.replace(/&/g, '&amp;');
const one = (s, water, extra = {}) => senzai({ baseWater: s.water, baseAmount: s.amount, water, table: s.table ?? null, cap: s.cap ?? null, ...extra });
const ml = (x) => fmt(x, 1);

const BRAND_TILES = SENZAI.map(
  (s) => `<button type="button" class="tile tile-word${(s.short ?? s.name).length > 9 ? ' sz-long' : ''}" data-senzai="${s.id}" data-water="${s.water}" data-amount="${s.amount}"${s.table ? ` data-table="${s.table.map((r) => r.join(':')).join(' ')}"` : ''}${s.cap ? ` data-cap="${s.cap}"` : ''} aria-pressed="false"><b>${s.short ?? s.name}</b><small>${s.water}Lに${s.amount}mL</small></button>`,
).join('');

const WATER_TILES = `${SENZAI_WATER.map((w) => `<button type="button" class="tile" data-wl="${w}" aria-pressed="false"><b>${w}L</b></button>`).join('')}<div class="tile tile-input" id="f-water"><div class="tile-box"><input id="water" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="?" aria-label="水の量（L）"><span>L</span></div><label for="water">水の量</label></div>`;

// 早見表：水の量 × 洗剤（tests/senzai.test.mjs と同じ）
const QUICK_WATER = [30, 45, 55, 65];
const QUICK_ROWS = SENZAI.map(
  (s) => `<tr><td class="wrap">${s.name}</td>${QUICK_WATER.map((w) => `<td class="num">${ml(one(s, w).amount)}</td>`).join('')}</tr>`,
).join('\n');

const SRC_ROWS = SENZAI.map(
  (s) => `<tr><td class="wrap">${s.name}<br><small>${s.maker}</small></td><td class="wrap"><a href="${esc(s.url)}">水${s.water}Lに${s.amount}mL</a></td></tr>`,
).join('\n');

const ATK = SENZAI.find((s) => s.id === 'attack');
const NX = SENZAI.find((s) => s.id === 'nanox');
const EX = one(NX, 45, { price: 500, content: 600 });
const EX65 = one(ATK, 65);

const FAQS = [
  {
    q: 'ボトルの表示が g のときは？',
    a: '<p>液体洗剤は1gがほぼ1mLなので、g の数をそのまま mL の欄に入れてください。花王やライオンも「10g（約10mL）」のように書いています。</p>',
  },
  {
    q: 'ドラム式はどう入れますか？',
    a: `<p>ドラム式は水の量ではなく、洗濯物の重さで量が決まる洗剤が多いです。アタックZEROは洗濯物2kgに約10mLです。ボトルか洗濯機の表示を見てください。</p>`,
  },
  {
    q: '洗濯機の水の量はどこでわかりますか？',
    a: '<p>縦型の洗濯機は、洗いをはじめると水の量を画面に出すものが多いです。わからないときは、取扱説明書の「標準水量」を見てください。</p>',
  },
  {
    q: 'アタックZEROの65Lが25mLなのはなぜですか？',
    a: `<p>花王が水の量ごとの表を出しているので、その量にしています。表にない水の量は、近い水の量の目安です。65Lならキャップ約${EX65.caps}杯です。</p>`,
  },
  {
    q: '汚れが多いときは？',
    a: '<p>汗や皮脂の汚れが多いときは少し多めにするよう、花王は案内しています。すすぎ1回でよいかも、ボトルの表示を見てください。</p>',
  },
  {
    q: '1回いくらはどう出していますか？',
    a: `<p>1本の値段 × 1回の量 ÷ 内容量です。600gで500円の洗剤を45Lで${ml(EX.amount)}mL使うと、1回${fmt(EX.perWash, 1)}円で、1本で${EX.washes}回です。</p>`,
  },
  {
    q: 'ほかの洗剤はマスにないのですか？',
    a: '<p>メーカーのページで量を確かめられた洗剤だけをマスにしています。ほかの洗剤は、ボトルの「水◯Lに◯mL」を表示の欄に入れてください。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">洗剤と水の量から、1回の量を計算します。</p>

<div class="calc" id="calc">
  <div class="tiles tiles-2 sz-brands" role="group" aria-label="洗剤をえらぶ">${BRAND_TILES}</div>
  <div class="box-rows">
    <div class="pair">${boxField('base-water', '表示の水', 'L', '30', '', 'ボトルの「水◯Lに◯mL」の水')}${boxField('base-amount', '表示の洗剤', 'mL', '10', '', 'ボトルの「水◯Lに◯mL」の洗剤')}</div>
    <div class="tiles tiles-4" role="group" aria-label="水の量をえらぶ">${WATER_TILES}</div>
    <div class="pair">${boxField('price', '1本の値段', '円', '500')}${boxField('content', '内容量', 'g', '600', '', 'ボトルの内容量。mL でも同じ')}</div>
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title"><span>洗剤の量<small>目安</small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="pic-row">
      <div class="sz-cap" aria-hidden="true"><div class="sz-in"><div class="sz-liq" id="c-liq"></div></div></div>
      <div class="pic-side">
        <p class="slip-k" id="r-cap">1回</p>
        <p class="slip-v"><b id="r-num">？</b><small>mL</small></p>
        <p class="sz-caps" id="r-caps"></p>
      </div>
    </div>
    <table class="slip-table"><thead><tr><th>水の量</th><th>1回いくら</th><th>1本で</th></tr></thead><tbody><tr><td id="d-water">—</td><td id="d-yen">—</td><td id="d-times">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">洗剤をえらんでください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>1回の量 ＝ 水の量 ÷ 表示の水 × 表示の洗剤</span>
<span>1回いくら ＝ 1本の値段 × 1回の量 ÷ 内容量</span>
</div>
<p>例：「水30Lに10g」のナノックス ワンを45Lで使うと、1回は${ml(EX.amount)}mLです。600gで500円なら1回${fmt(EX.perWash, 1)}円で、1本で${EX.washes}回使えます。</p>`,
)}

${section(
  'quick',
  '水の量ごとの洗剤の量',
  `<div class="tbl-wrap"><table>
<thead><tr><th>洗剤</th>${QUICK_WATER.map((w) => `<th class="num">${w}L</th>`).join('')}</tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">単位は mL です。</p>
<p>アタックZEROは花王の水量ごとの表の量、ほかはボトルの表示の割合で出した量です。ドラム式や、すすぎ1回にするときは、ボトルの表示を優先してください。</p>`,
)}

${section(
  'sources',
  '洗剤の表示と出典',
  `<div class="tbl-wrap"><table>
<thead><tr><th>洗剤</th><th>使用量の目安</th></tr></thead>
<tbody>
${SRC_ROWS}
</tbody>
</table></div>
<p>メーカーの公式のページで確かめた量です。ナノックス ワンは PRO・洗浄プラス・ニオイ専用とも同じ量です。キャップの目もりは、花王が1杯の量を出しているアタックZEROだけ杯数を出します。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '洗濯洗剤の量の計算｜水の量から1回の量とキャップ何杯か',
    description: `洗濯洗剤の1回の量を、ボトルの表示と水の量から計算します。アタックZEROは65Lで${ml(EX65.amount)}mL・キャップ約${EX65.caps}杯、ナノックス ワンは45Lで${ml(EX.amount)}mLです。値段を入れると1回いくらも出ます。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '洗濯洗剤のボトルの表示（水◯Lに◯mL）と洗濯の水の量から、1回の洗剤の量とキャップ何杯か、1回いくらを出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['senzai.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
