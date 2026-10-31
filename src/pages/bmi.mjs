// BMI の計算：身長と体重から BMI と判定（日本肥満学会の基準）、標準体重（BMI 22）、普通体重の範囲
// 結果は体重計のような目もり（低体重〜肥満4度の帯に、BMI の針）と、大きな BMI と判定。大人の目安で、子どもには使わない
// 判定の基準と標準体重の式は e-ヘルスネット（厚生労働省）。ページに載せる計算例は tests/loan-bmi.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { bmi, BMI_LEVELS } from '../lib/bmi.mjs';
import { fmt, fix } from '../lib/number.mjs';
import { stair, zBox } from '../zukai.mjs';

const tool = toolBySlug('bmi');
const path = '/bmi/';
const SRC_LEVEL = 'https://kennet.mhlw.go.jp/information/information/metabolic/bmi_check.html';
const SRC_STD = 'https://kennet.mhlw.go.jp/information/information/food/e-02-001.html';

// 目もり：BMI 15〜40 を1本の帯に（低体重・普通体重・肥満1〜4度）。針の位置は src/client/bmi.js が動かす
const LO = 15;
const HI = 40;
const x = (v) => ((Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO)) * 100;
let prev = LO;
const ZONES = BMI_LEVELS.map((l, i) => {
  const end = Math.min(HI, l.max);
  const w = x(end) - x(prev);
  prev = end;
  return `<span class="bm-zone bm-z${i}" style="width:${w}%"></span>`;
}).join('');
const SCALE = `<div class="bm-scale" aria-hidden="true"><div class="bm-track">${ZONES}</div><span class="bm-needle" id="bm-needle" hidden></span><p class="bm-ticks">${[18.5, 25, 30, 35]
  .map((v) => `<span style="left:${x(v)}%">${v}</span>`)
  .join('')}</p></div>`;

const LEVEL_ROWS = [['18.5未満', '低体重'], ['18.5以上25未満', '普通体重'], ['25以上30未満', '肥満（1度）'], ['30以上35未満', '肥満（2度）'], ['35以上40未満', '肥満（3度）'], ['40以上', '肥満（4度）']]
  .map(([v, n]) => `<tr><td class="num">${v}</td><td>${n}</td></tr>`)
  .join('\n');
const HEIGHTS = [150, 155, 160, 165, 170, 175, 180];
const STD_ROWS = HEIGHTS.map((cm) => {
  const r = bmi({ cm, kg: null });
  return `<tr><td class="num">${cm}cm</td><td class="num">${fmt(r.std, 1)}kg</td><td class="num">${fmt(r.range[0], 1)}〜${fmt(r.range[1], 1)}kg</td></tr>`;
}).join('\n');
const EX = bmi({ cm: 170, kg: 65 });

// 図解（#82）：身長と体重 → BMI と判定の絵の式（判定なので帯の図はつけない）。数字は tests/zukai-kurashi.test.mjs
export const Z_BMI = { value: EX.value, level: EX.level, std: EX.std };
const ZUKAI = stair(zBox('身長170cm', '65kg'), { b: '÷1.7÷1.7', small: '身長（m）の2乗で割る' }, zBox('BMI', fmt(EX.value, 1), true), ['BMI ＝ 体重（kg）÷ 身長（m）の2乗', '標準体重 ＝ 身長（m）の2乗 × 22', `例：身長170cm・体重65kgなら、BMIは${fmt(EX.value, 1)}で${EX.level}、標準体重は${fmt(EX.std, 1)}kgです。`], `18.5以上25未満なので <b class="fz-red">${EX.level}</b>`);

const FAQS = [
  {
    q: 'BMIはどう計算しますか？',
    a: `<p>体重（kg）÷ 身長（m）÷ 身長（m）です。身長170cm・体重65kgなら、65 ÷ 1.7 ÷ 1.7 ＝ ${fmt(EX.value, 1)}です。</p>`,
  },
  {
    q: '標準体重とは何ですか？',
    a: '<p>BMIが22になる体重で、身長（m）× 身長（m）× 22 で出します。病気がいちばん少ないとされるBMIをもとにしています。</p>',
  },
  {
    q: 'BMIが25以上なら、やせたほうがいいですか？',
    a: `<p><a href="${SRC_STD}">e-ヘルスネット</a>では、BMI 25以上は肥満ですが、医学的に減量が必要な状態とはかぎらない、としています。気になるときは医師に相談してください。</p>`,
  },
  {
    q: '子どもにも使えますか？',
    a: '<p>BMIは大人のための目安です。6〜18歳の子どもの肥満は、肥満度という別の数で判定します。</p>',
  },
  {
    q: 'BMIは小数第何位まで出しますか？',
    a: '<p>小数第1位までで、第2位を四捨五入しています。判定も、この数で決めています。</p>',
  },
  {
    q: '標準体重より重いと肥満ですか？',
    a: `<p>いいえ。標準体重はBMIが22になる体重で、BMI 25未満なら普通体重です。身長170cmなら標準体重は${fmt(EX.std, 1)}kgで、普通体重は${fmt(EX.range[1], 1)}kgまでです。</p>`,
  },
];

// 計算式のしくみと、使う場面・まちがえやすいところ（AdSense の再審査 #96。数字は tests/scenes-c.test.mjs）
const C = {
  ex: bmi({ cm: 158, kg: 52 }),
  kenshin: bmi({ cm: 175, kg: 78 }),
  goal: bmi({ cm: 160, kg: null }),
  child: bmi({ cm: 140, kg: 33 }),
  lo: bmi({ cm: 170, kg: 72.1 }),
  hi: bmi({ cm: 170, kg: 72.2 }),
};
const HOW = `<p>体重は、背が高いほど重くなります。そのため体重だけでは、身長のちがう人どうしをくらべられません。身長（m）を2回かけた数で割ると、体の大きさのちがいをならして、同じものさしで見られます。</p>
<p>例：身長158cm・体重52kgなら、52 ÷ 1.58 ÷ 1.58 でBMIは${C.ex.value.toFixed(1)}です。判定は${C.ex.level}で、標準体重は${fmt(C.ex.std, 1)}kgです。</p>`;
const SCENES = `<p>健康診断の結果を見るときは、身長と体重をそのまま入れます。身長175cm・体重78kgならBMIは${C.kenshin.value.toFixed(1)}で、判定は${C.kenshin.level}です。普通体重の範囲は${fmt(C.kenshin.range[1], 1)}kgまでなので、あと${fmt(fix(78 - C.kenshin.range[1]), 1)}kgでその範囲に入ります。体重の何％かは<a href="/percent/">パーセントの計算</a>で出せます。</p>
<p>目標の体重を決めるときは、普通体重の範囲を目安にできます。身長160cmなら、範囲は${fmt(C.goal.range[0], 1)}kgから${fmt(C.goal.range[1], 1)}kgまでで、標準体重は${fmt(C.goal.std, 1)}kgです。</p>`;
const MISTAKES = `<p>身長をcmのまま割ると、けたが合いません。65 ÷ 170 ÷ 170 は約0.0022で、mにした 65 ÷ 1.7 ÷ 1.7 ＝ 約22.5 の1万分の1になります。</p>
<p>子どもには、この判定は使えません。身長140cm・体重33kgで計算するとBMIは${C.child.value.toFixed(1)}で、大人の基準では${C.child.level}になります。6〜18歳の子どもは肥満度という別の数で見るので、この判定は当てはまりません。</p>
<p>BMIは小数第1位に四捨五入して判定するので、境目の近くでは0.1kgで判定が変わります。身長170cmなら、72.1kgはBMI ${C.lo.value.toFixed(1)}で${C.lo.level}、72.2kgは${C.hi.value.toFixed(1)}で${C.hi.level}です。</p>`;

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">身長と体重からBMIと標準体重を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('cm', '身長', 'cm', '170')}
    ${boxField('kg', '体重', 'kg', '65')}
  </div>
  <div class="slip" aria-live="polite">
    <p class="slip-title"><span>BMI<small>大人の目安</small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <p class="slip-sum"><span class="slip-k" id="r-level">？</span><span class="slip-v"><b id="r-num">？</b></span></p>
    ${SCALE}
    <table class="slip-table"><thead><tr><th>標準体重</th><th>普通体重の範囲</th></tr></thead><tbody><tr><td id="d-std">—</td><td id="d-range">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">身長を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool, false)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section('formula', '計算式', `${ZUKAI}${HOW}`)}

${section(
  'levels',
  'BMIの判定',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">BMI</th><th>判定</th></tr></thead>
<tbody>
${LEVEL_ROWS}
</tbody>
</table></div>
<p>日本肥満学会の基準です。出典は<a href="${SRC_LEVEL}">e-ヘルスネット（厚生労働省）</a>です。</p>`,
)}

${section(
  'std',
  '身長ごとの標準体重',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">身長</th><th class="num">標準体重</th><th class="num">普通体重の範囲</th></tr></thead>
<tbody>
${STD_ROWS}
</tbody>
</table></div>`,
)}
${section('scenes', '使う場面の例', SCENES)}
${section('mistakes', 'まちがえやすいところ', MISTAKES)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: 'BMIの計算｜身長と体重からBMI・判定・標準体重',
    description: `BMIを計算します。身長170cm・体重65kgならBMIは${fmt(EX.value, 1)}で、日本肥満学会の基準では${EX.level}、標準体重は${fmt(EX.std, 1)}kgです。身長${HEIGHTS[0]}〜${HEIGHTS.at(-1)}cmの標準体重と普通体重の範囲の表もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '身長と体重から、BMI・判定・標準体重・普通体重の範囲を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['bmi.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
