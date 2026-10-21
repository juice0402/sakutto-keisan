// 年齢の計算：生年月日と、計算する日（はじめは今日）から、満年齢・数え年・和暦・干支・学年・次の誕生日
// 満年齢は、誕生日の前の日が終わると1つ上がる（年齢計算ニ関スル法律）。学年は4月2日〜翌年4月1日生まれが同じ学年
// 結果は干支の輪（生まれ年の干支に赤ペンの丸）と、大きな「◯歳」。本文の年齢早見表は、ビルドした年（日本時間）で作る
// ページに載せる計算例は tests/hizuke.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { dateField } from '../fields.mjs';
import { ETO, ETO_YOMI, warekiOfYear, etoOf } from '../lib/hizuke.mjs';

const tool = toolBySlug('nenrei');
const path = '/nenrei/';
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
const TABLE_ROWS = YEARS.map((y) => {
  const w = warekiOfYear(y);
  const e = etoOf(y);
  return `<tr><td class="num">${y}年</td><td class="wrap">${w.before ? `${w.before}<br>` : ''}${w.text}</td><td>${e.kanji}（${e.yomi}）</td><td class="num">${THIS_YEAR - y}歳</td></tr>`;
}).join('\n');

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
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">生年月日から年齢・干支・学年を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="box-row-clear">${dateField('birth', '生年月日')}<button type="button" class="clear-btn" id="clear">クリア</button></div>
    ${dateField('on', '計算する日', 'はじめは今日。入学の日なども入れられます')}
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title">年齢<small id="r-on"></small></p>
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
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>満年齢 ＝ 今年 − 生まれた年</span>
<span>（今年の誕生日の前なら、さらに − 1）</span>
</div>
<p>例：1987年6月15日生まれなら、2026年10月21日には39歳です。数え年は40歳です。</p>
<p>年のとり方と早生まれの決まりは、<a href="${SRC_AGE}">国立天文台の暦Wiki</a>にくわしい説明があります。</p>`,
)}

${section(
  'table',
  `年齢早見表（${THIS_YEAR}年）`,
  `<div class="tbl-wrap"><table>
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
    description:
      '年齢を計算します。生年月日を入れると、今日の満年齢・数え年・生まれ年の和暦と干支・学年・次の誕生日まであと何日かがわかります。昭和・平成・令和の生まれ年ごとの年齢早見表もあります。',
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
