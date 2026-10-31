// 年齢の2つのページ：年齢の計算（もとのページ）と、入学・卒業年の計算（その下のページ。10/22 しょーくん「何歳のときに卒業したか、いちいち調べてる」）
// 年齢の計算の「入学・卒業の年」のボタンで、下のページへ行く
// 年齢の計算：生年月日と、計算する日（はじめは今日）から、満年齢・数え年・和暦・干支・学年・次の誕生日
// 満年齢は、誕生日の前の日が終わると1つ上がる（年齢計算ニ関スル法律）。学年は4月2日〜翌年4月1日生まれが同じ学年
// 結果は干支の輪（生まれ年の干支に赤ペンの丸）と、大きな「◯歳」。本文の年齢早見表は、ビルドした年（日本時間）で作る
// ページに載せる計算例は tests/hizuke.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { dateField } from '../fields.mjs';
import { ETO, warekiOfYear, etoOf } from '../lib/hizuke.mjs';
import { gakureki } from '../lib/gakureki.mjs';
import { printLink } from '../prints.mjs';
import { nenrei } from '../lib/nenrei.mjs';
import { stair, band, zCal, zBox } from '../zukai.mjs';

// 年のとり方・早生まれの説明の出典（国立天文台 暦Wiki。年齢計算ニ関スル法律と民法143条による）
const SRC_AGE = 'https://eco.mtk.nao.ac.jp/koyomi/wiki/CDD7C1C72F1C7AFA4C8A4CFA1A92FC7AFCEF0.html';

// 干支の輪：12の干支を丸く並べる（子が上、右回り）。生まれ年の干支は src/client/nenrei.js が赤くして、丸を動かす
const pos = (i) => {
  const a = ((i * 30 - 90) * Math.PI) / 180;
  return [(50 + 39 * Math.cos(a)).toFixed(1), (50 + 39 * Math.sin(a)).toFixed(1)];
};
const RING = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="39" fill="none" stroke="var(--rule)" stroke-width="1"/>${ETO.map((k, i) => {
  const [x, y] = pos(i);
  return `<text class="eto-k" id="e-${i}" x="${x}" y="${y}" data-x="${x}" data-y="${y}">${k}</text>`;
}).join('')}<circle class="eto-mark" id="e-mark" cx="50" cy="11" r="8" hidden/><text class="eto-c" id="e-center" x="50" y="51"></text></svg>`;

// 年齢早見表（ビルドした年。誕生日のあとの年齢）
const THIS_YEAR = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date()));
const YEARS = Array.from({ length: THIS_YEAR - 1940 + 1 }, (_, i) => THIS_YEAR - i);
const AGE_EX = nenrei({ birth: '1987-06-15', on: '2026-10-21' }); // 説明文（meta description）の例。本文の例と同じ
const TABLE_ROWS = YEARS.map((y) => {
  const w = warekiOfYear(y);
  const e = etoOf(y);
  return `<tr><td class="num">${y}年</td><td class="wrap">${w.before ? `${w.before}<br>` : ''}${w.text}</td><td>${e.kanji}（${e.yomi}）</td><td class="num">${THIS_YEAR - y}歳</td></tr>`;
}).join('\n');

// 図解（#70）：日めくりの式（1987年6月15日生まれの、2026年10月21日の満年齢）と、生まれた日から今日までの帯
const ZUKAI = stair(zCal('1987年6月', 15, '生まれた日'), { b: '2026 − 1987', small: '今年の誕生日のあと' }, zBox('2026年10月21日', `満${AGE_EX.age}歳`, true), ['満年齢 ＝ 今年 − 生まれた年', '今年の誕生日の前なら、さらに − 1', `例：1987年6月15日生まれなら、2026年10月21日には${AGE_EX.age}歳です。数え年は${AGE_EX.kazoe}歳です。`]);
// 帯：1年ごとに目もり（10歳ごとに長く）。いちばん新しい誕生日に赤ペンの丸、そのすこし先が今日
const zx = (age) => 8 + (age / 40) * 300;
const zToday = zx(AGE_EX.age + (365 - AGE_EX.untilNext) / 365);
const LINE = `<figure class="fz2"><svg class="fz-line" viewBox="0 0 330 70" role="img" aria-label="生まれた日から今日までの帯に、1年ごとの誕生日の目もり。いちばん新しい誕生日が満${AGE_EX.age}歳"><rect x="8" y="14" width="${(zToday - 8).toFixed(1)}" height="18" fill="#dce9f7" stroke="#1c2f4a" stroke-width="1.5"/>${Array.from({ length: AGE_EX.age + 1 }, (_, a) => `<line x1="${zx(a).toFixed(1)}" y1="${a % 10 ? 32 : 30}" x2="${zx(a).toFixed(1)}" y2="${a % 10 ? 37 : 42}" stroke="#1c2f4a" stroke-width="${a % 10 ? 1 : 1.5}"/>${a % 10 ? '' : `<text x="${zx(a).toFixed(1)}" y="56" text-anchor="${a ? 'middle' : 'start'}">${a}歳</text>`}`).join('')}<ellipse cx="${zx(AGE_EX.age).toFixed(1)}" cy="23" rx="11" ry="13" fill="none" stroke="#c8323c" stroke-width="2.4"/><text x="${zToday.toFixed(1)}" y="9" text-anchor="end">今日</text></svg><p class="fz2-ans">いちばん新しい誕生日で → <b>満${AGE_EX.age}歳</b></p></figure>`;

const FAQS = [
  {
    q: '誕生日の前の日に年をとるのですか？',
    a: '<p>法律では、誕生日の前の日が終わるときに1つ年をとります。ふだんの言い方と同じで、誕生日の日にはもう1つ上の年齢です。</p>',
  },
  {
    q: '4月1日生まれは、なぜ早生まれですか？',
    a: '<p>4月1日生まれの人は、3月31日が終わるときに年をとります。そのため、4月2日生まれより1つ上の学年になります。</p>',
  },
  {
    q: '数え年とは何ですか？',
    a: '<p>生まれた年を1歳として、1月1日ごとに1つ足す数え方です。七五三や厄年で使うことがあります。</p>',
  },
  {
    q: '1月や2月生まれの干支は？',
    a: '<p>このツールは、生まれた年（1月1日から12月31日）の干支を出します。立春で分ける数え方もあるので、気になるときは占いなどの決まりに合わせてください。</p>',
  },
  {
    q: '2月29日生まれの年齢は？',
    a: '<p>うるう年でない年は、2月28日が終わるときに年をとります。このツールも3月1日から1つ上の年齢で計算します。</p>',
  },
  {
    q: '学年はどこまで出ますか？',
    a: '<p>幼稚園の年少から大学4年までを、ふつうに進んだときの学年で出します。留年や飛び級は考えていません。</p>',
  },
  {
    q: '18歳は何年生まれですか？',
    a: `<p>${THIS_YEAR}年の誕生日のあとなら${THIS_YEAR - 18}年、誕生日の前なら${THIS_YEAR - 19}年生まれです。ほかの年齢は年齢早見表にあります。</p>`,
  },
];

function renderMain() {
  const tool = toolBySlug('nenrei');
  const path = '/nenrei/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">生年月日から年齢・干支・学年を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${dateField('birth', '生年月日')}
    ${dateField('on', '計算する日', 'はじめは今日。入学の日なども入れられます')}
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title"><span>年齢<small id="r-on"></small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="pic-row">
      <div class="eto-ring">${RING}</div>
      <div class="pic-side">
        <p class="slip-k">満年齢</p>
        <p class="slip-v"><b id="r-num">？</b><small>歳</small></p>
        <p class="pc-say" id="r-say"></p>
      </div>
    </div>
    <table class="slip-table"><thead><tr><th>数え年</th><th>学年</th><th>次の誕生日</th></tr></thead><tbody><tr><td id="d-kazoe">—</td><td id="d-grade">—</td><td id="d-next">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">生年月日を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools"><a class="tool-btn tool-link span-2" href="/gakureki/">入学・卒業の年</a><a class="tool-btn tool-link" href="/wareki/">和暦・西暦</a></div>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `${ZUKAI}${LINE}
<p>年のとり方と早生まれの決まりは、<a href="${SRC_AGE}">国立天文台の暦Wiki</a>にくわしい説明があります。</p>`,
)}

${section(
  'table',
  `年齢早見表（${THIS_YEAR}年）`,
  `${printLink('nenrei')}<div class="tbl-wrap"><table>
<thead><tr><th class="num">生まれ年</th><th>和暦</th><th>干支</th><th class="num">年齢</th></tr></thead>
<tbody>
${TABLE_ROWS}
</tbody>
</table></div>
<p class="note">${THIS_YEAR}年の誕生日のあとの年齢です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: `年齢の計算｜生年月日から年齢・和暦・干支・学年（${THIS_YEAR}年の年齢早見表）`,
    description: `年齢を計算します。1987年6月15日生まれなら、2026年10月21日に${AGE_EX.age}歳で、数え年は${AGE_EX.kazoe}歳です。干支・学年・次の誕生日まであと何日かもわかり、${YEARS.at(-1)}〜${THIS_YEAR}年生まれの年齢早見表もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '生年月日と計算する日から、満年齢・数え年・和暦・干支・学年・次の誕生日を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['nenrei.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

/* ---- 入学・卒業年の計算（年齢の計算の下のページ） ---- */
// 生年月日から、小学校の入学から大学（短大・専門）の卒業までの年月を、西暦・和暦・その時の年齢で出す。結果は履歴書の学歴の欄
// 結果の下の3つのボタン（浪人1年・留年1年・短大・専門）は、もう一度押すと元にもどる。ページに載せる例は tests/gakureki-wareki.test.mjs で確かめる
const ROW_NAMES = [['小学校', '入学'], ['小学校', '卒業'], ['中学校', '入学'], ['中学校', '卒業'], ['高校', '入学'], ['高校', '卒業'], ['大学', '入学'], ['大学', '卒業']];
const RK_ROWS = ROW_NAMES.map(
  ([s, k], i) =>
    `<tr><td class="rk-y"><b id="y-${i}">—</b><small id="w-${i}"></small></td><td class="rk-m" id="m-${i}"></td><td class="rk-s"><span class="rk-sn"><span id="s-${i}">${s}</span> ${k}</span> <small id="a-${i}"></small></td></tr>`,
).join('');

// 学歴早見表：生まれた年（4月2日〜12月31日）ごとの入学の年（4月）と大学の卒業の年（3月）。1960年から去年まで
const GK_YEARS = Array.from({ length: THIS_YEAR - 1960 }, (_, i) => THIS_YEAR - 1 - i);
const GK_ROWS = GK_YEARS.map((y) => {
  const r = gakureki({ birth: `${y}-06-01` }).rows;
  return `<tr><td class="num">${y}</td>${[0, 2, 4, 6, 7].map((i) => `<td class="num">${r[i].y}</td>`).join('')}</tr>`;
}).join('\n');
const GK_EX = gakureki({ birth: '2004-06-10' }).rows;

// 図解（#82）：生年月日 → 小学校の入学の流れの図と、入学から大学の卒業までの16年を学校ごとに分けた帯。数字は tests/zukai-kurashi.test.mjs
export const Z_GAKU = GK_EX.map((r) => r.y);
const GK_ZUKAI = stair(zCal('2004年6月', 10, '生まれた日'), { b: '＋7年', small: '4月2日〜翌年4月1日が同じ学年' }, zBox('小学校の入学', `${GK_EX[0].y}年4月`, true), ['小学校の入学 ＝ 生まれた年＋7年の4月', '早生まれ（1月1日〜4月1日）は、生まれた年＋6年の4月', `例：2004年6月10日生まれなら、小学校の入学は${GK_EX[0].y}年4月、大学の卒業は${GK_EX[7].y}年3月です。`, '中学校の入学は小学校の入学の6年後、高校はその3年後、大学はさらに3年後です。卒業は、次の学校に入る年の3月です。']);
const gw = (a, b) => Number((((GK_EX[b].y - GK_EX[a].y) / (GK_EX[7].y - GK_EX[0].y)) * 100).toFixed(2));
const GK_BAND = band({ head: '2004年6月10日生まれ', parts: [{ w: gw(0, 2), text: '小学校 6年' }, { w: gw(2, 4), kind: 'alt', text: '中学 3年' }, { w: gw(4, 6), text: '高校 3年' }, { w: gw(6, 7), kind: 'alt', text: '大学 4年' }], ruler: [[0, String(GK_EX[0].y)], [gw(0, 2), String(GK_EX[2].y)], [gw(0, 4), String(GK_EX[4].y)], [gw(0, 6), String(GK_EX[6].y)], [100, String(GK_EX[7].y), true]], ans: `入学から16年 → 大学の卒業 <b>${GK_EX[7].y}年3月</b>`, label: `${GK_EX[0].y}年の小学校の入学から${GK_EX[7].y}年の大学の卒業までの帯を、小学校6年・中学3年・高校3年・大学4年に分けた図` });

// 本文の例（計算のしかた・使う場面の例・まちがえやすいところ・よくある質問）。数字は tests/gakureki-wareki.test.mjs
// 学年のはじまりと終わりの出典（法務省 日本法令外国語訳データベースの学校教育法施行規則 第59条。2026-10-31 に確かめた）
const SRC_GAKUNEN = 'https://www.japaneselawtranslation.go.jp/ja/laws/view/4744/tb';
const GK_APR1 = gakureki({ birth: '2010-04-01' }).rows;
const GK_1998 = gakureki({ birth: '1998-08-15' }).rows;
const GK_2005 = gakureki({ birth: '2005-02-10' }).rows;
const GK_2023 = gakureki({ birth: '2023-05-20' }).rows;
const GK_20 = THIS_YEAR - 20; // 今年20歳になる人の生まれた年
const GK_20_LATE = gakureki({ birth: `${GK_20}-06-01` }).rows;
const GK_20_EARLY = gakureki({ birth: `${GK_20}-02-01` }).rows;

const GK_FAQS = [
  {
    q: '早生まれの入学の年は？',
    a: '<p>1月1日から4月1日生まれは、前の年の4月2日から12月31日生まれの人と同じ学年です。入学と卒業の年も、その学年で出します。</p>',
  },
  {
    q: '幼稚園や保育園の卒園はいつですか？',
    a: `<p>小学校に入学する年の3月です。2004年6月10日生まれなら、${GK_EX[0].y}年3月に卒園します。</p>`,
  },
  {
    q: '今年20歳になる人は、中学校を何年に卒業しましたか？',
    a: `<p>${GK_20}年4月2日から12月31日生まれなら${GK_20_LATE[3].y}年3月、1月1日から4月1日生まれなら${GK_20_EARLY[3].y}年3月です。</p>`,
  },
  {
    q: '浪人や留年したときは？',
    a: '<p>結果の下の「浪人1年」「留年1年」を押すと、大学の年が1年ずつおそくなります。2年以上のときは、出た年にその分を足してください。</p>',
  },
  {
    q: '短大や専門学校は？',
    a: '<p>「短大・専門」を押すと、2年で卒業する年を出します。3年制の専門学校は、卒業の年に1年足してください。</p>',
  },
  {
    q: '大学院の年は？',
    a: '<p>修士課程は、大学を卒業した年の4月に入学して、2年後の3月に修了するのがふつうです。</p>',
  },
  {
    q: '履歴書は西暦と和暦のどちらで書きますか？',
    a: '<p>どちらで書いてもかまいません。1枚の中では、西暦か和暦のどちらかにそろえます。和暦の年は<a href="/wareki/">和暦・西暦の変換</a>でも調べられます。</p>',
  },
  {
    q: '入学と卒業は何歳のときですか？',
    a: `<p>入学は小学校が${GK_EX[0].age}歳、中学校が${GK_EX[2].age}歳、高校が${GK_EX[4].age}歳、大学が${GK_EX[6].age}歳で、卒業は中学校が${GK_EX[3].age}歳、高校が${GK_EX[5].age}歳、大学が${GK_EX[7].age}歳です。年度のはじめと終わりの満年齢なので、同じ学年ならみんな同じです。</p>`,
  },
];

function renderGakureki() {
  const tool = toolBySlug('gakureki');
  const parent = toolBySlug('nenrei');
  const path = '/gakureki/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">生年月日から入学と卒業の年を出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${dateField('birth', '生年月日')}
  </div>
  <div class="rireki" aria-live="polite">
    <p class="rk-head"><span>学歴</span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <table class="rk-table">
      <thead><tr><th class="rk-y">年</th><th class="rk-m">月</th><th>学歴</th></tr></thead>
      <tbody>${RK_ROWS}</tbody>
    </table>
    <p class="rk-end">以上</p>
    <p class="slip-foot" id="r-foot">生年月日を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools">
    <button type="button" class="tool-btn" id="t-ronin" aria-pressed="false">浪人1年</button>
    <button type="button" class="tool-btn" id="t-ryunen" aria-pressed="false">留年1年</button>
    <button type="button" class="tool-btn" id="t-tandai" aria-pressed="false">短大・専門</button>
  </div>
  ${memoHtml(toolBySlug('gakureki'))}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `${GK_ZUKAI}
<p>小学校の学年は4月1日にはじまり、次の年の3月31日に終わります。小学校には、満6歳になった日の次の日からあとの、最初の学年のはじめに入学します。年齢は誕生日の前の日が終わるときに1つ上がるので、4月1日生まれは3月31日に6歳になり、1つ上の学年に入ります。例：2010年4月1日生まれの小学校の入学は${GK_APR1[0].y}年4月で、2009年4月2日生まれと同じ学年です。</p>
<p>出典：<a href="${SRC_GAKUNEN}">学校教育法施行規則 第59条</a>、<a href="${SRC_AGE}">国立天文台 暦Wiki</a></p>`,
)}

${section(
  'table',
  '学歴早見表',
  `${GK_BAND}${printLink('gakureki')}<p>4月2日から12月31日生まれの人の年です。1月1日から4月1日生まれは、1つ下の行（前の年）を見てください。</p>
<div class="tbl-wrap"><table class="tbl-tight">
<thead><tr><th class="num">生まれ</th><th class="num">小学校</th><th class="num">中学校</th><th class="num">高校</th><th class="num">大学</th><th class="num">卒業</th></tr></thead>
<tbody>
${GK_ROWS}
</tbody>
</table></div>
<p class="note">入学は4月、大学の卒業は3月の年です。</p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>1998年8月生まれで、高校から大学へ進んだとき。履歴書の学歴は、高校の入学が${GK_1998[4].y}年4月で${GK_1998[4].wareki}年、大学の卒業が${GK_1998[7].y}年3月で${GK_1998[7].wareki}年です。</p>
<p>2005年2月生まれは早生まれで、2004年4月2日から12月31日に生まれた人と同じ学年です。中学校の卒業は${GK_2005[3].y}年3月です。</p>
<p>2023年5月生まれの子の小学校の入学は${GK_2023[0].y}年4月で、幼稚園や保育園の卒園は${GK_2023[0].y}年3月です。今の年齢は<a href="/nenrei/">年齢の計算</a>で出せます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>「◯年度の卒業」は、次の年の3月です</h3>
<p>2020年度は2020年4月から2021年3月までなので、2020年度の卒業は2021年3月です。履歴書の学歴には、卒業した年の2021年を書きます。</p>
<h3>早生まれの人が、生まれた年の行を見る</h3>
<p>学歴早見表は、4月2日から12月31日生まれの年です。2005年3月生まれが2005年の行を見ると、どの年も1年おそくなります。2004年の行を見てください。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(GK_FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '入学・卒業年の計算｜卒業は何年・何歳か（履歴書の学歴早見表）',
    description: `入学・卒業年を計算します。2004年6月10日生まれなら、小学校の入学は${GK_EX[0].y}年4月、大学の卒業は${GK_EX[7].y}年3月です。西暦と和暦で出し、早生まれ・浪人・留年にも対応。${GK_YEARS.at(-1)}〜${GK_YEARS[0]}年生まれの早見表もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: `/${parent.slug}/` },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '生年月日から、小学校から大学までの入学と卒業の年月を西暦と和暦で出す計算ツール。'), faqLd(GK_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['gakureki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function render() {
  return [renderMain(), renderGakureki()];
}
