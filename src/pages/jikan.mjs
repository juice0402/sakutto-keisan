// 時間の計算：行ごとの「◯時間◯分」を足して、合計を大きく。行は3つから、「＋1つ追加」で10まで
// 時間は小数でも、分は60をこえても入れられる。結果は時間の帯（行ごとの時間を1本の帯に並べて、1時間ごとの目もり）と、
// 小数の時間・分・日の表。ページに載せる計算例は tests/hizuke.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { jikan, JIKAN_MAX_ROWS } from '../lib/jikan.mjs';
import { stair, band, zBox } from '../zukai.mjs';

const tool = toolBySlug('jikan');
const path = '/jikan/';
const FIRST = 3;
const EX = [[3, 45], [2, 30], [7, 15]];

const ROWS = Array.from({ length: JIKAN_MAX_ROWS }, (_, i) => `<div class="item jk-row" id="row-${i}"${i >= FIRST ? ' hidden' : ''}>
    <p class="item-k" aria-hidden="true">${i + 1}</p>
    <div class="pair" role="group" aria-label="${i + 1}つめの時間">${boxField(`h-${i}`, '時間', '', EX[i % 3][0])}${boxField(`m-${i}`, '分', '', EX[i % 3][1])}</div>
  </div>`).join('\n  ');

// 分を小数の時間にする表（15分・30分・45分など）
const MIN_TABLE = [5, 10, 15, 20, 30, 40, 45, 50].map((m) => `<tr><td class="num">${m}分</td><td class="num">${Number((m / 60).toFixed(4))}時間</td></tr>`).join('\n');
const R = jikan(EX.map(([h, m]) => ({ h, m })));

// 図解（#70）：分にして足す式と、3つの時間をつないだ帯（3時間45分＋2時間30分＋7時間15分）
const ZUKAI = stair(zBox('3つの時間を分にして足す', `${R.minutes}分`), { b: '÷60', small: '分を時間に' }, zBox('合計', R.text, true), ['1行の分 ＝ 時間 × 60 ＋ 分', '合計の時間 ＝ 合計の分 ÷ 60', `例：3時間45分 ＋ 2時間30分 ＋ 7時間15分 ＝ ${R.text}（${R.hours}時間）です。`]);
const BAND = band({ parts: EX.map(([h, m], i) => ({ w: Number((((h * 60 + m) / R.minutes) * 100).toFixed(2)), kind: i % 2 ? 'alt' : 'pay', text: `${h}:${String(m).padStart(2, '0')}` })), ruler: [[0, '0'], [100, `${R.minutes}分`]], ans: `つないで → <b>${R.text}</b>`, label: `3つの時間の帯をつないで${R.text}になる図` });

const FAQS = [
  {
    q: '1時間30分は、小数で何時間ですか？',
    a: '<p>1.5時間です。分を60で割ると小数になります。15分は0.25時間、45分は0.75時間です。</p>',
  },
  {
    q: '90分のように60分より多く入れてもいいですか？',
    a: '<p>入れられます。90分は1時間30分として足します。時間の欄に1.5と入れても同じです。</p>',
  },
  {
    q: '24時間をこえたらどうなりますか？',
    a: '<p>合計は「30時間15分」のように出して、表に「1日6時間15分」も出します。</p>',
  },
  {
    q: '働いた時間の合計にも使えますか？',
    a: '<p>使えます。1日ずつ行に入れると、1週間や1か月の合計が出ます。残業代は<a href="/zangyo-dai/">残業代の計算</a>で出せます。</p>',
  },
  {
    q: '日付の日数を数えるには？',
    a: '<p><a href="/nissu/">日数の計算</a>で、何日後の日付や、あと何日かを出せます。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">時間と分を足して、合計を計算します。</p>

<div class="calc" id="calc">
  <div class="cols jk-cols"><button type="button" class="clear-btn" id="clear">クリア</button></div>
  ${ROWS}
  <div class="calc-tools"><button type="button" class="tool-btn span-3" id="to-add"><span>＋1つ追加</span></button></div>
  <div class="slip" aria-live="polite">
    <p class="slip-sum"><span class="slip-k">合計</span><span class="slip-v"><b id="r-num">？</b></span></p>
    <div class="jk-bar" id="jk-bar" aria-hidden="true"></div>
    <p class="jk-scale" aria-hidden="true"><span>0</span><span id="jk-max"></span></p>
    <table class="slip-table"><thead><tr><th>小数</th><th>分</th><th>日</th></tr></thead><tbody><tr><td id="d-hours">—</td><td id="d-min">—</td><td id="d-days">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">1つめの時間を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `${ZUKAI}${BAND}`,
)}

${section(
  'minutes',
  '分と小数の時間',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">分</th><th class="num">小数の時間</th></tr></thead>
<tbody>
${MIN_TABLE}
</tbody>
</table></div>
<p>タイムカードや給料の計算で、時間を小数で書くときに使います。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '時間の計算｜時間と分の足し算・合計（小数の時間も）',
    description: `時間の足し算をします。${EX.map(([h, m]) => `${h}時間${m}分`).join('と')}を足すと${R.text}で、小数では${R.hours}時間です。${JIKAN_MAX_ROWS}行まで入れられて、分は60より多くてもよく、24時間をこえたら日数も出します。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '時間と分を足して、合計の時間・小数の時間・分を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['jikan.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
