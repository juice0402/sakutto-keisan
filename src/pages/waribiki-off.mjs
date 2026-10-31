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
    stair: stair(zTag('元の値段', yen(2000)), { b: `×${pay(r)}`, small: r === 50 ? '5割引き' : wariLabel(r) }, zTag(label, yen(z.final), true), [`${label}の値段 ＝ 元の値段 × ${pay(r)}`, `元の値段 ＝ ${label}の値段 ÷ ${pay(r)}`, `例：2,000円の${label}は${yen(z.final)}で、${yen(z.off)}安くなります。`]),
    band: band({ head: `元の値段 ${yen(2000)}`, parts: [{ w: 100 - r, text: `払う ${yen(z.final)}` }, { w: r, kind: 'off', text: narrow ? '' : `−${yen(z.off)}` }], ruler: narrow ? [[0, '0'], [100 - r, `${100 - r}％`, true]] : [[0, '0'], [100 - r, `${100 - r}％`, true], [100, '100％']], ans: `${100 - r}％を払う → <b>${yen(z.final)}</b>`, label: `元の値段2,000円の帯を、払う${yen(z.final)}と値引き${yen(z.off)}に分けた図` }),
  };
}

// 1画面めの下の中身（10/31 AdSense の再審査 #98）：率ごとに、しくみ・使う場面の例・まちがえやすいところ・検索で出た言葉の問い。
// 同じ形のページでも、場面とまちがえやすいところは率ごとにちがう中身にする。数字はすべて calcDiscount で出し、tests/waribiki-off.test.mjs で確かめる
const off = (p, r) => calcDiscount({ price: p, rate: r }).final;
const cut = (p, r) => p - off(p, r);
// しくみの文（どの率も同じ考え方なので形はそろえ、例の値段は率ごとに変える）
const SHIKUMI_EX = { 10: 3480, 15: 2980, 20: 598, 30: 1980, 40: 780, 50: 398 };
function shikumiHtml(r, label) {
  const p = SHIKUMI_EX[r];
  return `<p>${r === 50 ? '半額は' : `${r}％オフは、`}元の値段を100としたとき、${r}を引いた${100 - r}を払うということです。そのため、元の値段に${pay(r)}をかけると${label}の値段になり、値引きの額は元の値段の${r / 100}倍です。払う額と値引きを足すと、元の値段にもどります。</p>
<p>上の表にない値段の例です。${yen(p)}の${label}は、${fmt(p)} × ${pay(r)} で${yen(off(p, r))}になり、${yen(cut(p, r))}安くなります。</p>`;
}
const EXTRA = {
  10: () => ({
    scenes: `<p>会員証や学生証を見せると10％引きになるお店で、${yen(3480)}の会計なら、払うのは${yen(off(3480, 10))}で、${yen(cut(3480, 10))}安くなります。</p>
<p>10％オフのクーポンと、10％のポイント還元は、同じ10％でも払う額がちがいます。${yen(5000)}の買い物なら、10％オフはその場で${yen(off(5000, 10))}を払います。ポイント還元は${yen(5000)}を払って500円分のポイントがつくので、次の買い物でポイントを使うところまでふくめると、${yen(5500)}分の買い物に${yen(5000)}を払ったことになり、割引は約9.1％です。</p>`,
    mistakes: `<p>10％オフを2回くり返すと、20％オフではなく19％オフです。${yen(1000)}が1回目で${yen(off(1000, 10))}、2回目は${yen(off(1000, 10))}の10％を引くので${yen(off(off(1000, 10), 10))}になります。</p>
<p>税込の値段から10％引いても、税抜の値段にはなりません。税抜${yen(1000)}・税込${yen(1100)}の品物を10％オフにすると${yen(off(1100, 10))}です。税抜の値段は、税込の値段を1.1で割って出します。くわしくは<a href="/shohizei/">消費税の計算</a>で出せます。</p>`,
    faqs: [{ q: '10％オフと10％ポイント還元は、どちらが安いですか？', a: '<p>その場で払う額が少ないのは10％オフです。ポイント還元は、ついたポイントを次の買い物で使って、はじめて値引きと同じ働きになります。</p>' }],
  }),
  15: () => ({
    scenes: `<p>誕生月の15％引きのクーポンで${yen(2980)}の服を買うと、${yen(off(2980, 15))}で、${yen(cut(2980, 15))}安くなります。</p>
<p>3点まとめて15％オフのお店で、合わせて${yen(4500)}なら、払うのは${yen(off(4500, 15))}です。1点ずつ15％を引いて足しても、1円未満の切り捨ての分で数円ずれることがあります。</p>`,
    mistakes: `<p>元の値段に0.15をかけて出るのは、値引きの額です。${yen(2000)} × 0.15 ＝ ${yen(cut(2000, 15))}は引かれる分で、払うのは${yen(2000)}に0.85をかけた${yen(off(2000, 15))}です。</p>
<p>15％オフの値段から元の値段にもどすとき、1.15をかけるとずれます。${yen(1700)}の元の値段は、1,700 ÷ 0.85 ＝ ${yen(2000)}です。1,700 × 1.15 だと${yen(1955)}になり、45円たりません。</p>
<p>15％は「1割5分引き」と言います。「1.5割引き」と書くこともありますが、どちらも同じ15％オフです。</p>`,
    faqs: [{ q: '1割5分引きは何％オフですか？', a: '<p>15％オフです。元の値段に0.85をかけると、割引後の値段になります。</p>' }],
  }),
  20: () => ({
    scenes: `<p>夕方の総菜の「2割引き」のシールは20％オフです。${yen(598)}の総菜なら、${fmt(598)} × 0.8 ＝ 478.4で、1円未満を切り捨てて${yen(off(598, 20))}です。</p>
<p>冬物の20％オフのセールで、${yen(12800)}のコートは${yen(off(12800, 20))}になり、${yen(cut(12800, 20))}安くなります。</p>`,
    mistakes: `<p>20％オフのあと、レジでさらに10％オフになるときは、30％オフではなく28％オフです。${yen(10000)}が${yen(off(10000, 20))}になり、その10％を引いて${yen(off(off(10000, 20), 10))}です。2つの割引を重ねる計算は<a href="/waribiki/">割引計算</a>の「さらに割引」でできます。</p>
<p>20％オフの値段に20％を足しても、元の値段にはもどりません。${yen(8000)}に20％を足すと${yen(9600)}で、元の${yen(10000)}より400円少なくなります。もとにもどすには、0.8で割ります。</p>
<p>「2割引き」と「2割の値段」は別のものです。2割引きは元の値段の8割を払い、2割の値段は元の値段の0.2倍です。</p>`,
    faqs: [{ q: '20％オフのあとに10％オフは、何％オフですか？', a: `<p>28％オフです。${yen(10000)}なら${yen(off(off(10000, 20), 10))}になります。</p>` }],
  }),
  30: () => ({
    scenes: `<p>3割引きのシールが貼られた${yen(540)}のお弁当は、${fmt(540)} × 0.7 で${yen(off(540, 30))}です。${yen(880)}なら${yen(off(880, 30))}、${yen(1980)}なら${yen(off(1980, 30))}になります。</p>
<p>${yen(2980)}の服の3割引きは${yen(off(2980, 30))}で、${yen(cut(2980, 30))}安くなります。値段が10円単位なら、0.7をかけた答えに1円未満は出ないので、どのお店でも同じ値段になります。</p>`,
    mistakes: `<p>「3割引きの3割引き」は、6割引きではなく51％オフです。${yen(1000)}が${yen(off(1000, 30))}になり、さらに3割を引いて${yen(off(off(1000, 30), 30))}です。払うのは0.7 × 0.7 ＝ 0.49で、元の値段の49％です。</p>
<p>1円未満の扱いはお店でちがいます。${yen(298)}の3割引きは208.6円で、このページのように切り捨てると${yen(off(298, 30))}、四捨五入するお店では209円になります。</p>`,
    faqs: [
      { q: '2980円の3割引はいくらですか？', a: `<p>${yen(off(2980, 30))}です。${yen(cut(2980, 30))}安くなります。</p>` },
      { q: '「さん割引」とは何％オフですか？', a: '<p>3割引きのことで、30％オフです。元の値段に0.7をかけると、割引後の値段になります。</p>' },
    ],
  }),
  40: () => ({
    scenes: `<p>閉店前の4割引きで、${yen(780)}のお寿司は${yen(off(780, 40))}になります。払うのは元の値段の6割です。</p>
<p>型落ちの家電が${yen(39800)}から40％オフなら、${yen(off(39800, 40))}で、${yen(cut(39800, 40))}安くなります。</p>`,
    mistakes: `<p>20％オフを2回重ねても、40％オフにはなりません。${yen(1000)}の20％オフを2回くり返すと${yen(off(off(1000, 20), 20))}で36％オフ、40％オフなら${yen(off(1000, 40))}です。</p>
<p>40％オフは、半額より少し高い値段です。${yen(2000)}なら40％オフは${yen(off(2000, 40))}、半額は${yen(off(2000, 50))}で、ちがいは元の値段の10％にあたる200円です。</p>
<p>40％オフの値段から元の値段は、0.6で割って出します。${yen(1200)} ÷ 0.6 ＝ ${yen(2000)}です。1.4をかけると${yen(1680)}になり、ずれます。</p>`,
    faqs: [{ q: '20％オフを2回と40％オフは、どちらが安いですか？', a: '<p>40％オフのほうが安くなります。20％オフを2回くり返すと、36％オフです。</p>' }],
  }),
  50: () => ({
    scenes: `<p>${yen(250)}の半額は${yen(off(250, 50))}です。半額シールの${yen(398)}のパンなら${yen(off(398, 50))}になります。</p>
<p>「2個目半額」は、1個あたりで見ると25％オフです。${yen(600)}の品物を2個買うと、${yen(600)}と${yen(off(600, 50))}で${yen(900)}になり、1個あたり${yen(450)}です。1個だけ買うときは値引きがありません。</p>`,
    mistakes: `<p>「半額の半額」は、0円ではなく75％オフです。${yen(1000)}の半額が${yen(off(1000, 50))}、その半額で${yen(off(off(1000, 50), 50))}です。</p>
<p>値段が奇数のときは1円未満が出ます。${yen(399)}の半額は199.5円で、このページのように切り捨てると${yen(off(399, 50))}、四捨五入するお店では200円になります。</p>
<p>半額の値段から元の値段は、2倍にして出します。${yen(125)}なら${yen(250)}です。</p>`,
    faqs: [
      { q: '250円の半額はいくらですか？', a: `<p>${yen(off(250, 50))}です。</p>` },
      { q: '「2個目半額」は何％オフですか？', a: '<p>2個まとめて見ると、25％オフです。1個あたりの値段は、元の値段の75％になります。</p>' },
    ],
  }),
};

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
  const X = EXTRA[r]();
  const faqs = [
    { q: `${r}％オフは何割引きですか？`, a: `<p>${wari}です。払うのは元の値段の${pay(r)}倍です。</p>` },
    { q: `${label}を電卓で計算するには？`, a: `<p>元の値段に${pay(r)}をかけます。2,000円なら、2,000 × ${pay(r)} ＝ ${fmt(ex.final)}円です。</p>` },
    {
      q: `${label}の値段から元の値段を出すには？`,
      a: `<p>割引後の値段を${pay(r)}で割ります。1,000円なら、1,000 ÷ ${pay(r)} で${back.exact ? '' : '約'}${fmt(back.price)}円です。</p>`,
    },
    { q: '1円未満はどうなりますか？', a: '<p>切り捨てで計算しています。四捨五入や切り上げは、<a href="/waribiki/">割引計算</a>で変えられます。</p>' },
    ...(r === 50 ? [{ q: '半額と50％オフは同じですか？', a: '<p>同じです。5割引きとも言います。</p>' }] : []),
    ...X.faqs,
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
  `${Z.stair}${shikumiHtml(r, label)}`,
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

${section('scenes', '使う場面の例', X.scenes)}

${section('mistakes', 'まちがえやすいところ', X.mistakes)}

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
