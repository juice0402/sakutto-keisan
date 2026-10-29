// 率ごとの割引のページ（10/27 しょーくん「くらしノートに負けない」。検索候補「10 オフ いくら」「20 オフ 元の値段」「30 オフ 計算」）
// /waribiki/10/・15/・20/・30/・40/・50/（割引計算の下のページ）。元の値段か割引後の値段のあとから入れたほうから、もう片方
// 本文は、その率だけの早見表（元の値段→割引後・値引き）と、割引後の値段→元の値段の表。数字は tests/waribiki-off.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { calcDiscount, originalFrom, wariLabel } from '../lib/waribiki.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, band, zTag } from '../zukai.mjs';

export const OFF_RATES = [10, 15, 20, 30, 40, 50];
export const OFF_PRICES = [100, 300, 500, 800, 980, 1000, 1500, 1980, 2000, 2500, 3000, 4000, 5000, 8000, 10000, 20000, 30000, 50000];
export const OFF_SALES = [500, 1000, 1500, 2000, 3000, 5000, 10000];

const yen = (x) => `${fmt(x)}円`;
const pay = (r) => String((100 - r) / 100); // 0.7

// 図解（#81）：値札の式（2,000円 × 0.7）と、元の値段2,000円の帯。数字は tests/zukai-seikatsu.test.mjs
export const zOff = (r) => {
  const d = calcDiscount({ price: 2000, rate: r });
  return { final: d.final, off: d.off };
};
function zukaiOff(r, label) {
  const z = zOff(r);
  const narrow = r < 20; // 細い値引きの帯には字を入れず、目もりの100％を外す（重ならないように）
  return {
    stair: stair(zTag('元の値段', yen(2000)), { b: `×${pay(r)}`, small: label }, zTag(label, yen(z.final), true), [`${label}の値段 ＝ 元の値段 × ${pay(r)}`, `元の値段 ＝ ${label}の値段 ÷ ${pay(r)}`, `例：2,000円の${label}は${yen(z.final)}で、${yen(z.off)}安くなります。`]),
    band: band({ head: `元の値段 ${yen(2000)}`, parts: [{ w: 100 - r, text: `払う ${yen(z.final)}` }, { w: r, kind: 'off', text: narrow ? '' : `−${yen(z.off)}` }], ruler: narrow ? [[0, '0'], [100 - r, `${100 - r}％`, true]] : [[0, '0'], [100 - r, `${100 - r}％`, true], [100, '100％']], ans: `${100 - r}％を払う → <b>${yen(z.final)}</b>`, label: `元の値段2,000円の帯を、払う${yen(z.final)}と値引き${yen(z.off)}に分けた図` }),
  };
}

function renderOne(r) {
  const tool = toolBySlug(`waribiki-${r}`);
  const parent = toolBySlug('waribiki');
  const path = `/waribiki/${r}/`;
  const wari = wariLabel(r);
  const label = r === 50 ? '半額' : `${r}％オフ`;
  const ex = calcDiscount({ price: 2000, rate: r });
  const back = originalFrom(1000, r);
  const rows = OFF_PRICES.map((p) => {
    const d = calcDiscount({ price: p, rate: r });
    return `<tr><td class="num">${yen(p)}</td><td class="num">${yen(d.final)}</td><td class="num">${yen(d.off)}</td></tr>`;
  }).join('\n');
  const backRows = OFF_SALES.map((s) => {
    const o = originalFrom(s, r);
    return `<tr><td class="num">${yen(s)}</td><td class="num">${o.exact ? '' : '約'}${yen(o.price)}</td></tr>`;
  }).join('\n');
  const faqs = [
    { q: `${r}％オフは何割引きですか？`, a: `<p>${wari}です。払うのは元の値段の${pay(r)}倍です。</p>` },
    { q: `${label}を電卓で計算するには？`, a: `<p>元の値段に${pay(r)}をかけます。2,000円なら、2,000 × ${pay(r)} ＝ ${fmt(ex.final)}円です。</p>` },
    {
      q: `${label}の値段から元の値段を出すには？`,
      a: `<p>割引後の値段を${pay(r)}で割ります。1,000円なら、1,000 ÷ ${pay(r)} で${back.exact ? '' : '約'}${fmt(back.price)}円です。</p>`,
    },
    { q: '1円未満はどうなりますか？', a: '<p>切り捨てで計算しています。四捨五入や切り上げは、<a href="/waribiki/">割引計算</a>で変えられます。</p>' },
    ...(r === 50 ? [{ q: '半額と50％オフは同じですか？', a: '<p>同じです。5割引きとも言います。</p>' }] : []),
  ];
  const Z = zukaiOff(r, label);
  const others = OFF_RATES.filter((x) => x !== r).map((x) => `<a href="/waribiki/${x}/">${x === 50 ? '半額' : `${x}％オフ`}</a>`).join('・');
  const body = `
<h1>${tool.name}</h1>
<p class="lead">${r === 50 ? '半額の値段と、元の値段を出します。' : `${r}％オフ（${wari}）の値段を出します。`}</p>

<div class="calc" id="calc" data-rate="${r}">
  <div class="box-rows">
    <div class="pair">${boxField('price', '元の値段', '円', '2,000')}${boxField('sale', `${label}の値段`, '円', fmt(ex.final))}</div>
  </div>

  <div class="tag-stage" aria-live="polite">
    <button type="button" class="clear-btn stage-clear" id="clear">クリア</button>
    <div class="tag-wrap is-empty" id="tag">
      <div class="pricetag">
        <p class="tag-was" id="t-was" hidden></p>
        <p class="tag-price"><span id="t-price">？</span><small>円</small></p>
        <p class="tag-save" id="t-save">元の値段を入れてください</p>
      </div>
      <p class="tag-badge badge-left"><span>${r === 50 ? '半額' : `${r}%`}</span>${r === 50 ? '' : '<small>OFF</small>'}</p>
    </div>
    <p class="tag-note" id="t-note" hidden></p>
  </div>

  <div class="calc-tools"><a class="tool-btn tool-link span-3" href="/waribiki/">ほかの割引で計算</a></div>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  Z.stair,
)}

${section(
  'quick',
  `${label}の早見表`,
  `${Z.band}<div class="tbl-wrap"><table>
<thead><tr><th class="num">元の値段</th><th class="num">${label}</th><th class="num">値引き</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
<p class="note">1円未満は切り捨てです。</p>`,
)}

${section(
  'back',
  `${label}の値段から元の値段`,
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">${label}の値段</th><th class="num">元の値段</th></tr></thead>
<tbody>
${backRows}
</tbody>
</table></div>
<p>ほかの割引：${others}</p>`,
)}

${section('faq', 'よくある質問', faqHtml(faqs))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: `${tool.name}｜${r === 50 ? '5割引き' : wari}の値段と早見表、元の値段の出し方`,
    description: `${r === 50 ? '半額（50％オフ・5割引き）' : `${label}（${wari}）`}の値段を計算します。2,000円の${label}は${yen(ex.final)}で、${yen(ex.off)}安くなります。100円から5万円までの${OFF_PRICES.length}通りの早見表と、${label}の値段から元の値段を出す計算もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: '/waribiki/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, `元の値段から${label}の値段を、${label}の値段から元の値段を出す計算ツール。`), faqLd(faqs)],
    theme: themeOf(tool),
    ogImage: `/og/waribiki-${r}.png`,
    scripts: ['waribiki-off.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function render() {
  return OFF_RATES.map(renderOne);
}
