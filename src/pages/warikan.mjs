// 割り勘の2つのページ：割り勘の計算（みんな同じ額。もとのページ）と、傾斜割り勘の計算（多め・ふつう・少なめ。その下のページ）
// 結果は、お会計のレシート（答えの1人の額をいちばん大きく、下は人数分の券）。集める単位はレシートの下で変えられる（はじめは100円）
// 結果は画像にして、LINE などへ送れる（画像は端末の中で作る。src/client/warikan-ui.mjs）
// ページに載せる計算例は tests/warikan.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, RECEIPT_EDGE, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { WARIKAN_UNITS, WARIKAN_GROUPS, warikan, warikanKeisha } from '../lib/warikan.mjs';
import { stair, band, zReceipt, zTickets, zTks } from '../zukai.mjs';

// 合計と人数の早見表（100円単位で集める1人の額。「1万円 3人 割り勘」のような検索で来る人が、表を見ればわかるように）
export const QUICK_TOTALS = [5000, 10000, 15000, 20000, 25000, 30000, 50000];
export const QUICK_PEOPLE = [3, 4, 5, 6];
const yenNum = (x) => x.toLocaleString('ja-JP');
const QUICK_ROWS = QUICK_TOTALS.map(
  (t) => `<tr><td class="num">${yenNum(t)}</td>${QUICK_PEOPLE.map((n) => `<td class="num">${yenNum(warikan({ total: t, people: n, unit: 100 }).each)}</td>`).join('')}</tr>`,
).join('\n');

const NOSCRIPT = '<noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>';

const EDGE = RECEIPT_EDGE;

// 合計・集める・おつりの行と、券（人数分）
const ROWS = `<dl class="rc-rows">
      <div><dt>合計</dt><dd id="rc-total">—</dd></div>
      <div><dt id="rc-collect-k">集める</dt><dd id="rc-collect">—</dd></div>
      <div><dt>おつり</dt><dd id="rc-change">—</dd></div>
    </dl>`;

// 集める単位（レシートの下。はじめは100円）
const UNIT_ROW = `<div class="field unit-row" id="f-unit"><p class="label" id="l-unit">単位</p><div class="seg seg-4" role="group" aria-labelledby="l-unit">${WARIKAN_UNITS.map(
  (u) => `<button type="button" class="seg-btn" data-unit="${u}" aria-pressed="${u === 100}">${u}円</button>`,
).join('')}</div></div>`;


// 人数：大きな −／＋ と、名前を中に書いたまん中の欄（ほかの欄と左右のはしをそろえる）
const STEPPER = `<div class="stepper box-stepper">
    <button type="button" class="step-btn" id="people-minus" aria-label="人数を1人へらす">${icon('<path d="M5 12h14"/>')}</button>
    <div class="field box-field" id="f-people"><label for="people">人数</label><div class="input"><input id="people" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="4"><span class="unit">人</span></div></div>
    <button type="button" class="step-btn" id="people-plus" aria-label="人数を1人ふやす">${icon('<path d="M5 12h14M12 5v14"/>')}</button>
  </div>`;

// 図解（#70）：レシートから人数分の券へ（10,000円を3人・100円単位）と、合計の帯
const ZX = warikan({ total: 10000, people: 3, unit: 100 });
const ZUKAI = stair(zReceipt('合計', `${ZX.total.toLocaleString('ja-JP')}円`), { b: '÷3', small: '100円単位に切り上げ' }, zTickets(`${ZX.each.toLocaleString('ja-JP')}円`, 3), ['1人の額 ＝ 合計 ÷ 人数（切り上げ）', 'おつり ＝ 1人の額 × 人数 − 合計', `例：10,000円を3人で、100円単位なら3,333.3…円が${ZX.each.toLocaleString('ja-JP')}円。集めると${ZX.collect.toLocaleString('ja-JP')}円で、おつりは${ZX.change}円です。`]);
const third = `${Math.floor(ZX.exact).toLocaleString('ja-JP')}円`;
const BAND = band({ head: `合計 ${ZX.total.toLocaleString('ja-JP')}円`, parts: [{ w: 33.34, text: third }, { w: 33.33, text: third }, { w: 33.33, text: third }], ans: `100円単位に切り上げ → <b>${ZX.each.toLocaleString('ja-JP')}円</b>`, label: `合計${ZX.total.toLocaleString('ja-JP')}円の帯を3人で3つに分けた図` });

const FAQS = [
  {
    q: '端数はどうなりますか？',
    a: '<p>1人の額を、えらんだ単位に切り上げます。集めて余った分がおつりです。端数を幹事が払うときの額も出します。</p>',
  },
  {
    q: '「100円単位」とは何ですか？',
    a: '<p>1人の額を、100円で割り切れる額にします。3,334円なら3,400円です。</p>',
  },
  {
    q: '多めに払う人がいるときは？',
    a: '<p><a href="/warikan-keisha/">傾斜割り勘の計算</a>で、多めの人と少なめの人の額を出せます。</p>',
  },
  {
    q: '消費税やサービス料は？',
    a: '<p>お会計の合計（税込）を入れてください。</p>',
  },
  {
    q: '画像で送るとき、数字はどこかに送られますか？',
    a: '<p>画像はこの端末のブラウザの中で作り、サイトには送りません。LINEなどの送り先は、自分でえらびます。</p>',
  },
  {
    q: '合計に1円未満がある金額は入れられますか？',
    a: '<p>入れられません。合計は、お会計の金額を1円単位で入れてください。</p>',
  },
];

// 割り勘：計算式のしくみと、使う場面・まちがえやすいところ（AdSense の再審査 #96。数字は tests/scenes-c.test.mjs）
const HOW = `<p>合計が人数で割り切れないと、1人の額に端数が出ます。全員から同じ額を集めて足りなくならないように、1人の額は切り上げて、多く集まった分をおつりにします。単位を大きくするほど集めやすくなる一方で、おつりはふえます。</p>
<p>例：14,300円を4人で分けると3,575円です。100円単位なら1人3,600円で、集めると14,400円、おつりは100円です。</p>`;
const SCENES = `<p>5人の飲み会で合計が23,760円なら、1円単位で4,752円ずつです。100円単位にすると1人4,800円でおつりは240円、1,000円単位なら5,000円でおつりは1,240円になります。</p>
<p>車で出かけて、高速代6,420円とガソリン代4,380円を3人で分けるときは、先に足して10,800円にします。1人3,600円で、おつりは出ません。</p>
<p>7人で32,000円のときに端数を幹事が持つなら、ほかの6人は4,500円で、幹事は5,000円です。全員4,600円ずつにすると、おつりが200円出ます。</p>`;
const MISTAKES = `<p>人数に自分を入れ忘れると、1人の額が大きくなります。6人で18,000円なのに5と入れると3,600円になり、正しい3,000円より600円多く集めてしまいます。</p>
<p>税抜の金額で割ると、お会計に足りなくなります。税抜10,000円のお店に4人なら、税込11,000円で割って1人2,800円です。税抜のまま割った2,500円では、1,000円足りません。税込の額は<a href="/shohizei/">消費税の計算</a>で出せます。</p>
<p>人数が多いと、100円単位のおつりも大きくなります。8人で25,010円なら1人3,200円で、おつりは590円です。10円単位にすると3,130円で、おつりは30円になります。</p>`;

function renderMain() {
  const tool = toolBySlug('warikan');
  const path = '/warikan/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">合計と人数から、1人いくらか計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('total', '合計', '円', '12,800')}
    ${STEPPER}
  </div>
  <div class="receipt" aria-live="polite">
    <p class="rc-title">お会計</p>
    <button type="button" class="clear-btn rc-clear" id="clear">クリア</button>
    <p class="rc-sum"><span class="rc-k" id="r-cap">1人</span><span class="rc-v"><b id="r-num">？</b><small>円</small></span></p>
    <div class="rc-tickets" id="rc-tickets" aria-hidden="true"></div>
    ${ROWS}
    <p class="rc-host" id="rc-host" hidden><span>幹事が端数を払うなら</span><span id="rc-host-v"></span></p>
    <p class="rc-foot" id="r-foot">合計を入れてください</p>
    ${EDGE}
  </div>
  ${UNIT_ROW}
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools">
    <a class="tool-btn tool-link span-3" href="/warikan-keisha/">多め・少なめ</a>
  </div>
  ${memoHtml(tool)}
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算式',
  `${ZUKAI}${HOW}`,
)}

${section(
  'examples',
  '計算例',
  `${BAND}<div class="tbl-wrap"><table>
<thead><tr><th class="num">合計</th><th class="num">人数</th><th class="num">1人</th><th class="num">おつり</th></tr></thead>
<tbody>
<tr><td class="num">12,800円</td><td class="num">4人</td><td class="num">3,200円</td><td class="num">0円</td></tr>
<tr><td class="num">10,000円</td><td class="num">3人</td><td class="num">3,400円</td><td class="num">200円</td></tr>
<tr><td class="num">23,500円</td><td class="num">6人</td><td class="num">4,000円</td><td class="num">500円</td></tr>
<tr><td class="num">37,800円</td><td class="num">8人</td><td class="num">4,800円</td><td class="num">600円</td></tr>
</tbody>
</table></div>
<p class="note">100円単位で集めるときです。</p>
<p>端数を幹事が払うなら、10,000円を3人では、ほかの2人が3,300円で幹事が3,400円です。1円単位なら1人3,334円で、おつりは2円です。</p>`,
)}

${section(
  'quick',
  '合計と人数の早見表',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">合計</th>${QUICK_PEOPLE.map((n) => `<th class="num">${n}人</th>`).join('')}</tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">合計と、100円単位の1人の額（円）です。</p>`,
)}

${section('scenes', '使う場面の例', SCENES)}

${section('mistakes', 'まちがえやすいところ', MISTAKES)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '割り勘の計算｜1人いくらか・100円単位とおつりも',
    description:
      '飲み会や食事の割り勘で、1人いくらかを計算します。10,000円を3人で100円単位なら1人3,400円で、おつりは200円です。端数を幹事が払うときの額もわかり、結果は画像にしてLINEなどで送れます。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '合計と人数から、割り勘の1人の額・集めたときのおつり・端数を幹事が払うときの額を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['warikan.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

// 傾斜割り勘：多め・ふつう・少なめの人数と、ふつうの人の何倍を払うか
const PEOPLE_EX = ['1', '4', '2'];
// 図解（#81）：レシートから多め・ふつう・少なめの券へ（30,000円を2倍1人・1倍4人・0.5倍2人）と、合計の帯を何倍の重みで分けた図
const ZK = warikanKeisha({ total: 30000, unit: 100, groups: [{ people: 1, rate: 2 }, { people: 4, rate: 1 }, { people: 2, rate: 0.5 }] });
export const Z_KEISHA = { base: Math.round(ZK.base), each: ZK.rows.map((r) => r.each), collect: ZK.collect };
const yk = (x) => `${x.toLocaleString('ja-JP')}円`;
const ZUKAI_KEISHA = stair(zReceipt('合計', yk(ZK.total)), { b: '÷7×何倍', small: '何倍の合計 7' }, zTks(ZK.rows.map((r) => yk(r.each))), ['1倍の額 ＝ 合計 ÷ 人数×何倍の合計', '1人の額 ＝ 1倍の額 × 何倍（切り上げ）', `例：30,000円を、2倍の人1人・1倍の人4人・0.5倍の人2人で。2 ＋ 4 ＋ 1 ＝ 7 なので、1倍の額は約${yk(Z_KEISHA.base)}です。100円単位に切り上げて、多め${yk(ZK.rows[0].each)}・ふつう${yk(ZK.rows[1].each)}・少なめ${yk(ZK.rows[2].each)}です。`], `券は左から 多め・ふつう・少なめ の1人の額`);
const BAND_KEISHA = band({ head: `合計 ${yk(ZK.total)}`, parts: [{ w: 28.57, text: '多め 1人' }, { w: 57.14, kind: 'alt', text: 'ふつう 4人' }, { w: 14.29, text: '' }], ruler: [[100, '少なめ 2人']], ans: `1倍の額は約${yk(Z_KEISHA.base)} → ふつう <b>${yk(ZK.rows[1].each)}</b>`, label: `合計30,000円の帯を、多め1人の2・ふつう4人の4・少なめ2人の1の重みで7つに分けた図` });
const KEISHA_FAQS = [
  {
    q: '「何倍」には何を入れますか？',
    a: '<p>ふつうの人を1倍として、何倍払うかです。1.5なら、ふつうの人の1.5倍です。</p>',
  },
  {
    q: '「上司は5,000円」のように金額で決めたいときは？',
    a: '<p>合計からその金額を引いて、残りを<a href="/warikan/">割り勘の計算</a>で分けてください。</p>',
  },
  {
    q: '多めとふつうの2つだけのときは？',
    a: '<p>少なめの人数を空にしてください。</p>',
  },
  {
    q: 'おつりが出るのはなぜですか？',
    a: '<p>1人の額を、えらんだ単位に切り上げるからです。単位を1円にすると、おつりは少なくなります。</p>',
  },
  {
    q: '何倍に小数を入れられますか？',
    a: '<p>入れられます。0.6倍や1.2倍のように、10倍までの数を入れてください。</p>',
  },
];

// 傾斜割り勘：計算式のしくみと、使う場面・まちがえやすいところ（AdSense の再審査 #96。数字は tests/scenes-c.test.mjs）
const KEISHA_HOW = `<p>何倍の数を重みにして、全員の重みを足した数で合計を割ると、1倍の人の額が出ます。その額に一人ひとりの何倍をかけたものが、その人の払う額です。重みの合計で割っているので、何倍をどう決めても、集まる額は合計とほぼ同じになります。</p>
<p>例：20,000円を、1.5倍の人2人と1倍の人3人で分けると、重みの合計は6です。1倍の額は約3,333円なので、100円単位で1.5倍の人は5,000円、1倍の人は3,400円になります。</p>`;
const KEISHA_SCENES = `<p>送別会で、送られる人の分をほかの人で持つときは、送られる人を人数に入れません。上司1人が2倍、ほかの6人が1倍で40,000円なら、上司は10,000円、ほかの人は5,000円ずつで、おつりは出ません。</p>
<p>お酒を飲む人と飲まない人で分けたいときは、飲まない人の何倍を1より小さくします。飲む人5人と、0.6倍の飲まない人3人で27,000円なら、飲む人は4,000円、飲まない人は2,400円です。</p>`;
const KEISHA_MISTAKES = `<p>1.5倍は、みんな同じ額で割ったときの1.5倍ではありません。10人で50,000円を<a href="/warikan/">割り勘</a>すると5,000円ですが、1人だけ1.5倍にすると重みの合計が10.5になり、その人は7,200円、ほかの人は4,800円です。5,000円の1.5倍の7,500円にはなりません。</p>
<p>集める単位を大きくすると、おつりも大きくなります。上の50,000円を1,000円単位で集めると、1.5倍の人が8,000円、ほかの人が5,000円で合わせて53,000円になり、おつりは3,000円です。</p>`;

function renderKeisha() {
  const tool = toolBySlug('warikan-keisha');
  const parent = toolBySlug('warikan');
  const path = '/warikan-keisha/';
  const groupRows = WARIKAN_GROUPS.map(
    (g, i) => `<div class="pair">${boxField(`people-${i}`, `${g.name}の人`, '人', PEOPLE_EX[i])}${boxField(`rate-${i}`, '何倍', '倍', String(g.rate), String(g.rate), 'ふつうの人の何倍を払うか')}</div>`,
  ).join('\n    ');
  const groupLines = WARIKAN_GROUPS.map(
    (g, i) => `<p class="rc-g" id="rc-g-${i}"><span class="rc-g-k">${g.name}</span><span class="rc-g-v"><b id="rc-v-${i}">？</b><small>円</small></span><span class="rc-g-n" id="rc-n-${i}"></span></p>`,
  ).join('\n      ');
  const body = `
<h1>${tool.name}</h1>
<p class="lead">多めに払う人がいる割り勘を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('total', '合計', '円', '30,000')}
    ${groupRows}
  </div>
  <div class="receipt" aria-live="polite">
    <p class="rc-title">お会計</p>
    <button type="button" class="clear-btn rc-clear" id="clear">クリア</button>
    <div class="rc-groups" id="rc-groups">
      ${groupLines}
    </div>
    <div class="rc-tickets is-keisha" id="rc-tickets" aria-hidden="true"></div>
    ${ROWS}
    <p class="rc-foot" id="r-foot">合計を入れてください</p>
    ${EDGE}
  </div>
  ${UNIT_ROW}
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools">
    <a class="tool-btn tool-link span-3" href="/warikan/">みんな同じ</a>
  </div>
  ${memoHtml(tool)}
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算式',
  `${ZUKAI_KEISHA}${KEISHA_HOW}`,
)}

${section(
  'examples',
  '計算例',
  `${BAND_KEISHA}<div class="tbl-wrap"><table>
<thead><tr><th class="num">合計</th><th class="num">多め</th><th class="num">ふつう</th><th class="num">少なめ</th></tr></thead>
<tbody>
<tr><td class="num">30,000円</td><td class="num">8,600円<br><small>2倍・1人</small></td><td class="num">4,300円<br><small>1倍・4人</small></td><td class="num">2,200円<br><small>0.5倍・2人</small></td></tr>
<tr><td class="num">50,000円</td><td class="num">9,400円<br><small>1.5倍・2人</small></td><td class="num">6,300円<br><small>1倍・5人</small></td><td class="num">—</td></tr>
<tr><td class="num">12,000円</td><td class="num">4,800円<br><small>2倍・1人</small></td><td class="num">2,400円<br><small>1倍・2人</small></td><td class="num">1,200円<br><small>0.5倍・2人</small></td></tr>
</tbody>
</table></div>
<p class="note">100円単位で集めるときです。</p>
<p>1つめは集めると30,200円で、おつりは200円です。2つめは50,300円で、おつりは300円です。</p>`,
)}

${section('scenes', '使う場面の例', KEISHA_SCENES)}

${section('mistakes', 'まちがえやすいところ', KEISHA_MISTAKES)}

${section('faq', 'よくある質問', faqHtml(KEISHA_FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '傾斜割り勘の計算｜多めに払う人がいる割り勘',
    description:
      '多めに払う人と少なめの人がいる割り勘（傾斜割り勘）を計算します。30,000円を2倍の人1人・1倍の人4人・0.5倍の人2人で分けると、1倍の人は約4,286円です。集めたときのおつりもわかります。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: `/${parent.slug}/` },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '合計と、多め・ふつう・少なめの人数と何倍かから、傾斜をつけた割り勘の1人の額とおつりを出す計算ツール。'), faqLd(KEISHA_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['warikan-keisha.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function render() {
  return [renderMain(), renderKeisha()];
}
