// 割引の2つのページ：割引計算（割引後の値段。もとのページ）と、割引率の計算（何％オフか。その下のページ）
// 「何％オフ？」は割引計算の下の3つのボタンの1つだったが、10/21 しょーくんの「窮屈なものはメインとサブに」で別のページにした。
// 割引計算の「何％オフ？」のボタンと、割引率の計算の「割引後の値段を出す」のボタンで行き来する
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { calcDiscount, calcRate, QUICK_PRICES, QUICK_RATES } from '../lib/waribiki.mjs';
import { printLink } from '../prints.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, band, zTag } from '../zukai.mjs';

// よくある値段の割引の早見表（値段と率は src/lib/waribiki.mjs。印刷用のPDFも同じ表）
// 図解（#70）：値札の式と、元の値段の帯（5,000円の30％オフ）
const ZX = calcDiscount({ price: 5000, rate: 30 });
const ZUKAI = stair(zTag('元の値段', `${fmt(5000)}円`), { b: '×0.7', small: '30％オフ' }, zTag('割引後', `${fmt(ZX.final)}円`, true), ['割引後の値段 ＝ 元の値段 ×（100 − 割引率）÷ 100', `例：5,000円の30％オフは、5,000 × 70 ÷ 100 ＝ ${fmt(ZX.final)}円`]);
const BAND = band({ head: `元の値段 ${fmt(5000)}円`, parts: [{ w: 70, text: `払う ${fmt(ZX.final)}円` }, { w: 30, kind: 'off', text: `−${fmt(ZX.off)}円` }], ruler: [[0, '0'], [70, '70％', true], [100, '100％']], ans: `30％オフは7割を払う → <b>${fmt(ZX.final)}円</b>`, label: `元の値段5,000円の帯を、払う${fmt(ZX.final)}円と値引き${fmt(ZX.off)}円に分けた図` });
// 図解（#81）：割引率の計算の値札の式（2,000円が1,700円）と、元の値段の帯
const ZR = calcRate({ price: 2000, sale: 1700 });
export const Z_RITSU = { off: ZR.off, rate: ZR.rate };
const ZUKAI_RATE = stair(zTag('元の値段', `${fmt(2000)}円`), { b: `${fmt(ZR.off)}÷${fmt(2000)}`, small: `値引き ${fmt(ZR.off)}円` }, zTag('割引率', `${fmt(ZR.rate)}％オフ`, true), ['割引率 ＝（元の値段 − 割引後の値段）÷ 元の値段 × 100', '割引率 ＝ 値引きの額 ÷ 元の値段 × 100', `例：2,000円が1,700円なら、${fmt(ZR.off)} ÷ 2,000 × 100 ＝ ${fmt(ZR.rate)}％オフです。`]);
const BAND_RATE = band({ head: `元の値段 ${fmt(2000)}円`, parts: [{ w: 100 - ZR.rate, text: `払う ${fmt(ZR.sale)}円` }, { w: ZR.rate, kind: 'off', text: '' }], ruler: [[0, '0'], [100 - ZR.rate, `${100 - ZR.rate}％`, true]], ans: `${fmt(ZR.off)}円の値引きは → <b>${fmt(ZR.rate)}％オフ</b>`, label: `元の値段2,000円の帯を、払う${fmt(ZR.sale)}円と値引き${fmt(ZR.off)}円に分けた図。${fmt(ZR.rate)}％オフ` });
const DESC_EX = { price: 1980, final: calcDiscount({ price: 1980, rate: 30 }).final }; // 説明文（meta description）の例
const QUICK_ROWS = QUICK_PRICES.map(
  (p) => `<tr><td class="num">${fmt(p)}円</td>${QUICK_RATES.map((r) => `<td class="num">${fmt(calcDiscount({ price: p, rate: r }).final)}</td>`).join('')}</tr>`,
).join('\n');

// 元の値段は、Enter でキーボードを閉じる（次は下のタイルをえらぶので）
const input = (id, unit, placeholder, key = 'next') =>
  `<div class="input"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="${key}" placeholder="${placeholder}"><span class="unit">${unit}</span></div>`;

const field = (id, label, unit, placeholder, attrs = '') =>
  `<div class="field" id="f-${id}"${attrs}><label for="${id}">${label}</label>${input(id, unit, placeholder)}</div>`;

// 割引のタイル：「30%」と「3割引き」を両方書いて、％と割のまちがいを防ぐ。最後のマスは自分で入力
const TILES = `<div class="tiles" role="group" aria-labelledby="l-rate">${[10, 20, 30, 40, 50]
  .map((v) =>
    v === 50
      ? `<button type="button" class="tile" data-pct="50" aria-pressed="false"><b>半額</b><small>5割・50%</small></button>`
      : `<button type="button" class="tile" data-pct="${v}" aria-pressed="false"><b>${v}%</b><small>${v / 10}割引き</small></button>`,
  )
  .join('')}<div class="tile tile-input" id="f-rate"><div class="tile-box"><input id="rate" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="?" aria-describedby="l-rate"><span>%</span></div><label for="rate">その他（％）</label></div></div>`;

const toolBtn = (id, label) => `<button type="button" class="tool-btn" id="${id}" aria-pressed="false"><span>${label}</span></button>`;

const miniTag = (k) =>
  `<div class="cmp-item" id="cmp-${k}" data-item="${k}"><p class="cmp-label" id="cl-${k}">${k.toUpperCase()}</p><div class="tag-wrap tag-mini"><div class="pricetag"><p class="tag-was" id="cw-${k}"></p><p class="tag-price"><span id="cp-${k}">？</span><small>円</small></p><p class="tag-save" id="cs-${k}"></p></div><p class="tag-badge" id="cb-${k}" hidden><span id="cr-${k}"></span><small>OFF</small></p></div></div>`;

const cmpTab = (k) =>
  `<button type="button" class="cmp-tab" data-item="${k}" aria-pressed="${k === 'a'}"><span class="cmp-tab-k">${k.toUpperCase()}</span><span class="cmp-tab-v" id="tab-${k}">まだ入っていません</span></button>`;

const FAQS = [
  {
    q: '2,000円の3割引きと1,500円の20％オフ、どっちが安いですか？',
    a: '<p>1,500円の20％オフです。1,200円で、2,000円の3割引き（1,400円）より200円安くなります。</p>',
  },
  {
    q: '30％オフのあと、さらに20％オフにすると50％オフになりますか？',
    a: '<p>なりません。0.7×0.8＝0.56なので、合わせて44％オフです。</p>',
  },
  {
    q: '2,980円の3割引きはいくらですか？',
    a: '<p>2,086円で、894円安くなります。880円の3割引きは616円、540円の3割引きは378円です。</p>',
  },
  {
    q: '1円未満の端数はどうなりますか？',
    a: '<p>切り捨てで計算します。端数が出たときは、値札の下で四捨五入や切り上げに変えられます。</p>',
  },
  {
    q: '税込と税抜、どちらの値段を入れればいいですか？',
    a: '<p>知りたいほうの値段を入れてください。どちらで計算しても、差は1円ほどです。</p>',
  },
  {
    q: '「三割引」と「3割引き」は同じですか？',
    a: '<p>同じです。どちらも30％オフで、値段の0.7倍になります。</p>',
  },
  {
    q: '「2割引き」と「20％オフ」は同じですか？',
    a: '<p>同じです。1割が10％なので、2割5分引きは25％オフです。</p>',
  },
  {
    q: '割引後の値段から、何％オフかを出せますか？',
    a: '<p>「何％オフ？」のボタンから、<a href="/waribiki-ritsu/">割引率の計算</a>で出せます。値引きの額からも出せます。</p>',
  },
];

function renderMain() {
  const tool = toolBySlug('waribiki');
  const path = '/waribiki/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">割引後の値段と、安くなる額を計算します。</p>

<div class="calc" id="calc">
  <div class="cmp-tabs" data-mode="compare" hidden role="group" aria-label="入力する商品">${cmpTab('a')}${cmpTab('b')}</div>

  <div class="field" id="f-price">
    <div class="field-head"><label for="price" id="l-price">元の値段</label><button type="button" class="clear-btn" id="clear">クリア</button></div>
    ${input('price', '円', '2,000', 'done')}
  </div>
  <div class="field" data-mode="off compare">
    <p class="label" id="l-rate">値引きをえらぶ</p>
    ${TILES}
  </div>
  ${field('rate2', 'さらに割引（クーポンなど）', '％オフ', '10', ' hidden')}

  <div class="tag-stage" aria-live="polite">
    <div class="tag-wrap" id="tag" data-mode="off">
      <div class="pricetag">
        <p class="tag-was" id="t-was" hidden></p>
        <p class="tag-price"><span id="t-price">？</span><small>円</small></p>
        <p class="tag-save" id="t-save">元の値段を入れてください</p>
        <p class="tag-conv" id="t-conv" hidden></p>
      </div>
      <p class="tag-badge" id="t-badge" hidden><span id="t-rate"></span><small>OFF</small></p>
    </div>
    <div class="cmp" data-mode="compare" hidden>${miniTag('a')}${miniTag('b')}</div>
    <p class="cmp-verdict" id="cmp-verdict" data-mode="compare" hidden></p>
    <p class="tag-note" id="t-note" hidden></p>
    <label class="select tag-round" id="t-round" hidden>1円未満は<select id="rounding"><option value="floor">切り捨て</option><option value="round">四捨五入</option><option value="ceil">切り上げ</option></select></label>
  </div>

  <div class="calc-tools">
    ${toolBtn('more', 'さらに割引')}
    ${toolBtn('to-cmp', '2つくらべる')}
    <a class="tool-btn tool-link" href="/waribiki-ritsu/">何％オフ？</a>
  </div>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `${ZUKAI}
<p>30％オフは、元の値段から30％ぶんを引くことです。残るのは70％なので、元の値段に0.7をかけても同じ答えになります。何％オフでも、100から割引率を引いた数が、払う割合です。例：2,480円の15％オフは、2,480 × 0.85 ＝ 2,108円です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `${BAND}<div class="tbl-wrap"><table>
<thead><tr><th class="num">元の値段</th><th>割引</th><th class="num">割引後</th><th class="num">値引き</th></tr></thead>
<tbody>
<tr><td class="num">3,980円</td><td>20％オフ</td><td class="num">3,184円</td><td class="num">796円</td></tr>
<tr><td class="num">12,800円</td><td>35％オフ</td><td class="num">8,320円</td><td class="num">4,480円</td></tr>
<tr><td class="num">1,980円</td><td>3割引き</td><td class="num">1,386円</td><td class="num">594円</td></tr>
<tr><td class="num">2,000円</td><td class="wrap"><span class="nw">30％オフ＋</span><wbr><span class="nw">さらに</span><wbr><span class="nw">20％オフ</span></td><td class="num">1,120円</td><td class="num">880円</td></tr>
<tr><td class="num">999円</td><td>15％オフ</td><td class="num">849円</td><td class="num">150円</td></tr>
</tbody>
</table></div>
<p class="note">1円未満は切り捨て（849.15円 → 849円）。</p>
<p>30％オフのあとの20％オフは、合わせて44％オフです。</p>`,
)}

${section(
  'quick',
  '値段ごとの割引の早見表',
  `${printLink('waribiki')}<div class="tbl-wrap"><table>
<thead><tr><th class="num">元の値段</th><th class="num">1割引</th><th class="num">2割引</th><th class="num">3割引</th><th class="num">半額</th></tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">割引後の値段（円）です。</p>
<p>率ごとの早見表：<a href="/waribiki/10/">10％オフ</a>・<a href="/waribiki/15/">15％オフ</a>・<a href="/waribiki/20/">20％オフ</a>・<a href="/waribiki/30/">30％オフ</a>・<a href="/waribiki/40/">40％オフ</a>・<a href="/waribiki/50/">半額</a></p>`,
)}

${section(
  'wari',
  '割と％',
  `<div class="tbl-wrap"><table>
<thead><tr><th>割</th><th>％</th><th>支払う割合</th></tr></thead>
<tbody>
<tr><td>1割引き</td><td>10％オフ</td><td>0.9倍</td></tr>
<tr><td>2割5分引き</td><td>25％オフ</td><td>0.75倍</td></tr>
<tr><td>3割引き</td><td>30％オフ</td><td>0.7倍</td></tr>
<tr><td>半額</td><td>50％オフ</td><td>0.5倍</td></tr>
</tbody>
</table></div>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>閉店前のお総菜に「2割引」のシールがあるとき。498円なら 498 × 0.8 ＝ 398.4 で、1円未満を切り捨てると398円です。</p>
<p>5,990円のコートがセールで3割引きになり、レジで10％オフのクーポンも使うときは、「さらに割引」で計算します。3割引きで4,193円、そこから10％オフで3,773円です。合わせて約37％オフで、何％オフになったかは<a href="/waribiki-ritsu/">割引率の計算</a>でも確かめられます。</p>
<p>3,980円の3割引きと、2,980円の1割引きでは、「2つくらべる」を使うと2,786円と2,682円で、1割引きのほうが104円安くなります。値引きの額は3割引きのほうが1,194円と大きいので、率だけで決めないほうがよい例です。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>割引を重ねても、率は足し算になりません</h3>
<p>30％オフのあとに20％オフをすると、0.7 × 0.8 ＝ 0.56 で、払うのは元の値段の56％です。10,000円なら、50％オフの5,000円ではなく5,600円になります。</p>
<h3>「3割引き」は3％オフではありません</h3>
<p>1割は10％なので、3割引きは30％オフです。2,000円の3割引きを3％オフで計算すると1,940円になり、正しい1,400円と540円ずれます。</p>
<h3>割引後の値段に、同じ率を足しても元にもどりません</h3>
<p>1,400円は2,000円の3割引きですが、1,400円の3割増しは1,820円です。元の値段は 1,400 ÷ 0.7 で出します。割引後の値段から元の値段を出す表は、<a href="/waribiki/30/">30％オフの計算</a>のページにあります。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '割引計算｜3割引・20％オフはいくら？値段を計算',
    description: `「3割引き」「20％オフ」の割引後の値段と、いくら安くなるかを計算します。${fmt(DESC_EX.price)}円の3割引きは${fmt(DESC_EX.final)}円で、${fmt(DESC_EX.price - DESC_EX.final)}円安くなります。よくある値段${QUICK_PRICES.length}通りの早見表と、二重割引の計算もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '元の値段と割引率から、割引後の値段と値引きの額を計算するツール。2つの割引の比較と二重割引に対応。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['waribiki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

// 割引率の計算（何％オフか）：元の値段と、割引後の値段か値引きの額。あとから入れたほうから、もう片方の欄（点線の枠）と何％オフかを出す
// 結果は「◯％オフ」の値札と、元の値段の帯を払う分と値引きの分に分けた絵
const RATE_FAQS = [
  {
    q: '「300円引き」は何％オフですか？',
    a: '<p>値引きの額の欄に300と入れてください。2,000円の商品なら15％オフです。</p>',
  },
  {
    q: '何割引きかもわかりますか？',
    a: '<p>わかります。15％オフなら「1割5分引き」のように出します。</p>',
  },
  {
    q: '割引率に小数が出るときは？',
    a: '<p>値札には0.1％まで出して、正確な数字は下に出します。</p>',
  },
  {
    q: '割引後のほうが高いときは？',
    a: '<p>元の値段より何％高いかを出します。</p>',
  },
];

function renderRate() {
  const tool = toolBySlug('waribiki-ritsu');
  const parent = toolBySlug('waribiki');
  const path = '/waribiki-ritsu/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">割引後の値段から、何％オフか計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('price', '元の値段', '円', '2,000')}
    <div class="pair">${boxField('sale', '割引後の値段', '円', '1,700')}${boxField('off', '値引きの額', '円', '300')}</div>
  </div>

  <div class="tag-stage" aria-live="polite">
    <button type="button" class="clear-btn stage-clear" id="clear">クリア</button>
    <div class="tag-wrap is-empty" id="tag">
      <div class="pricetag">
        <p class="tag-was" id="t-was" hidden></p>
        <p class="tag-price"><span id="t-price">？</span><small id="t-unit">％オフ</small></p>
        <p class="tag-save" id="t-save">元の値段を入れてください</p>
        <p class="tag-conv" id="t-conv" hidden></p>
      </div>
    </div>
    <div class="rieki-bar" aria-hidden="true"><div class="rb-track"><div class="rb-cost" id="b-pay"></div><div class="rb-profit" id="b-off"></div><div class="rb-loss" id="b-up"></div></div><p class="rb-legend"><span id="b-left">払う</span><span id="b-right">値引き</span></p></div>
    <p class="tag-note" id="t-note" hidden></p>
  </div>

  <div class="calc-tools"><a class="tool-btn tool-link span-3" href="/waribiki/">割引後の値段を出す</a></div>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  ZUKAI_RATE,
)}

${section(
  'examples',
  '計算例',
  `${BAND_RATE}<div class="tbl-wrap"><table>
<thead><tr><th>元の値段</th><th class="num">割引後</th><th class="num">割引率</th></tr></thead>
<tbody>
<tr><td>2,000円</td><td class="num">1,700円</td><td class="num">15％オフ</td></tr>
<tr><td>5,000円</td><td class="num">3,500円</td><td class="num">30％オフ</td></tr>
<tr><td>1,280円</td><td class="num">980円</td><td class="num">約23.4％オフ</td></tr>
<tr><td>3,980円</td><td class="num">2,980円</td><td class="num">約25.1％オフ</td></tr>
</tbody>
</table></div>
<p>15％オフは1割5分引き、30％オフは3割引きです。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(RATE_FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '割引率の計算｜何％オフか・何割引きかを計算',
    description: `元の値段と割引後の値段から、何％オフかを計算します。${fmt(2000)}円が${fmt(1700)}円なら${calcRate({ price: 2000, sale: 1700 }).rate}％オフで、${calcRate({ price: 2000, sale: 1700 }).rate / 10}割引きです。「300円引き」のような値引きの額からも出せて、割引後のほうが高いときは何％高いかを出します。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: `/${parent.slug}/` },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '元の値段と割引後の値段か値引きの額から、何％オフか・何割引きかを出す計算ツール。'), faqLd(RATE_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['waribiki-ritsu.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function render() {
  return [renderMain(), renderRate()];
}
