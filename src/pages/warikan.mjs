// 割り勘の2つのページ：割り勘の計算（みんな同じ額。もとのページ）と、傾斜割り勘の計算（多め・ふつう・少なめ。その下のページ）
// 結果は、お会計のレシート（答えの1人の額をいちばん大きく、下は人数分の券）。集める単位はレシートの下で変えられる（はじめは100円）
// 結果は画像にして、LINE などへ送れる（画像は端末の中で作る。src/client/warikan-ui.mjs）
// ページに載せる計算例は tests/warikan.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { WARIKAN_UNITS, WARIKAN_GROUPS } from '../lib/warikan.mjs';

const NOSCRIPT = '<noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>';

// レシートの下のぎざぎざ（切り取った紙のはし）
const TEETH = 28;
const zig = Array.from({ length: TEETH }, (_, i) => `L${((i + 0.5) * 100 / TEETH).toFixed(2)} 5L${((i + 1) * 100 / TEETH).toFixed(2)} 0`).join('');
const EDGE = `<svg class="rc-edge" viewBox="0 0 100 5" preserveAspectRatio="none" aria-hidden="true"><path class="rc-paper" d="M0 0${zig}Z"/><path class="rc-cut" d="M0 0${zig}" vector-effect="non-scaling-stroke"/></svg>`;

// 合計・集める・おつりの行と、券（人数分）
const ROWS = `<dl class="rc-rows">
      <div><dt>合計</dt><dd id="rc-total">—</dd></div>
      <div><dt id="rc-collect-k">集める</dt><dd id="rc-collect">—</dd></div>
      <div><dt>おつり</dt><dd id="rc-change">—</dd></div>
    </dl>`;

// 集める単位（レシートの下。はじめは100円）
const UNIT_ROW = `<div class="field people-row unit-row" id="f-unit"><p class="label" id="l-unit">単位</p><div class="seg seg-4" role="group" aria-labelledby="l-unit">${WARIKAN_UNITS.map(
  (u) => `<button type="button" class="seg-btn" data-unit="${u}" aria-pressed="${u === 100}">${u}円</button>`,
).join('')}</div></div>`;

const shareBtn = '<button type="button" class="tool-btn span-2" id="share" disabled>画像で送る</button>';

// 人数：大きな −／＋ と、まん中の欄（レシピの人数と同じ形）
const STEPPER = `<div class="field people-row" id="f-people">
    <label for="people">人数</label>
    <div class="stepper">
      <button type="button" class="step-btn" id="people-minus" aria-label="人数を1人へらす">${icon('<path d="M5 12h14"/>')}</button>
      <div class="input"><input id="people" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="4"><span class="unit">人</span></div>
      <button type="button" class="step-btn" id="people-plus" aria-label="人数を1人ふやす">${icon('<path d="M5 12h14M12 5v14"/>')}</button>
    </div>
  </div>`;

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
];

function renderMain() {
  const tool = toolBySlug('warikan');
  const path = '/warikan/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">合計と人数から、1人いくらか計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="box-row-clear">${boxField('total', '合計', '円', '12,800')}<button type="button" class="clear-btn" id="clear">クリア</button></div>
  </div>
  ${STEPPER}
  <div class="receipt" aria-live="polite">
    <p class="rc-title">お会計</p>
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
    ${shareBtn}
    <a class="tool-btn tool-link" href="/warikan-keisha/">多め・少なめ</a>
  </div>
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>1人の額 ＝ 合計 ÷ 人数（単位に切り上げ）</span>
<span>おつり ＝ 1人の額 × 人数 − 合計</span>
</div>
<p>例：10,000円を3人で、100円単位なら3,333.3…円が3,400円。集めると10,200円で、おつりは200円です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
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

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '割り勘の計算｜1人いくらか・100円単位とおつりも',
    description:
      '飲み会や食事の割り勘で、1人いくらかを計算します。100円単位や1,000円単位で集めたときのおつりと、端数を幹事が払うときの額もわかります。結果は画像にしてLINEなどで送れます。',
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
];

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
    <div class="box-row-clear">${boxField('total', '合計', '円', '30,000')}<button type="button" class="clear-btn" id="clear">クリア</button></div>
    ${groupRows}
  </div>
  <div class="receipt" aria-live="polite">
    <p class="rc-title">お会計</p>
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
    ${shareBtn}
    <a class="tool-btn tool-link" href="/warikan/">みんな同じ</a>
  </div>
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>1倍の額 ＝ 合計 ÷（人数 × 何倍 を足したもの）</span>
<span>1人の額 ＝ 1倍の額 × 何倍（単位に切り上げ）</span>
</div>
<p>例：30,000円を、2倍の人1人・1倍の人4人・0.5倍の人2人で。2 ＋ 4 ＋ 1 ＝ 7 なので、1倍の額は約4,286円です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>合計と人数</th><th class="num">多め</th><th class="num">ふつう</th><th class="num">少なめ</th></tr></thead>
<tbody>
<tr><td class="wrap"><span class="nw">30,000円</span><wbr><span class="nw">（2倍1人・</span><wbr><span class="nw">1倍4人・</span><wbr><span class="nw">0.5倍2人）</span></td><td class="num">8,600円</td><td class="num">4,300円</td><td class="num">2,200円</td></tr>
<tr><td class="wrap"><span class="nw">50,000円</span><wbr><span class="nw">（1.5倍2人・</span><wbr><span class="nw">1倍5人）</span></td><td class="num">9,400円</td><td class="num">6,300円</td><td class="num">—</td></tr>
<tr><td class="wrap"><span class="nw">12,000円</span><wbr><span class="nw">（2倍1人・</span><wbr><span class="nw">1倍2人・</span><wbr><span class="nw">0.5倍2人）</span></td><td class="num">4,800円</td><td class="num">2,400円</td><td class="num">1,200円</td></tr>
</tbody>
</table></div>
<p class="note">100円単位で集めるときです。</p>
<p>1つめは集めると30,200円で、おつりは200円です。2つめは50,300円で、おつりは300円です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(KEISHA_FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '傾斜割り勘の計算｜多めに払う人がいる割り勘',
    description:
      '多めに払う人と少なめの人がいる割り勘（傾斜割り勘）を計算します。ふつうの人の何倍を払うかを決めると、それぞれ1人いくらかと、集めたときのおつりがわかります。',
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
