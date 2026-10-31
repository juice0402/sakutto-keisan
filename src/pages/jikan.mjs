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
  {
    q: '時間の引き算はできますか？',
    a: '<p>このツールは足し算だけです。引くときは、両方を分にしてから引き、60で割って時間にもどしてください。</p>',
  },
];

// 計算のしくみと、使う場面・まちがえやすいところ（AdSense の再審査 #96。数字は tests/scenes-c.test.mjs）
const HOW = `<p>時間は60分で1時間にくり上がるので、ふつうの数のようにそのまま足すとずれます。そこで全部を分にそろえてから足し、60で割って時間にもどします。割ったときのあまりが、分の数です。</p>
<p>例：1時間50分 ＋ 2時間40分は、110分 ＋ 160分 ＝ 270分です。270 ÷ 60 ＝ 4あまり30なので、4時間30分になります。</p>`;
const SCENES = `<p>1週間の勤務時間を出すときは、1日ずつ行に入れます。月曜から金曜まで毎日7時間45分なら、合計は38時間45分です。小数では38.75時間なので、時間を小数で書く表にもそのまま写せます。残業がある週は<a href="/zangyo-dai/">残業代の計算</a>で残業代も出せます。</p>
<p>動画の講座を何本か見たときの合計は、42分・58分・1時間25分の3本なら3時間5分です。分しかない行は、時間の欄を空けたままでかまいません。</p>
<p>時給で働いた日の給料は、時間を小数にしてからかけます。3時間45分は3.75時間なので、時給1,100円なら1,100 × 3.75 ＝ 4,125円です。</p>`;
const MISTAKES = `<p>小数の時間を、そのまま時間と分に読みかえるとずれます。1.3時間は1時間30分ではなく、0.3 × 60 ＝ 18分なので1時間18分です。</p>
<p>電卓で 2.40 ＋ 1.30 のように足すと3.70になりますが、70分は1時間10分です。2時間40分 ＋ 1時間30分の正しい合計は、4時間10分になります。</p>
<p>時刻と時間の長さを取りちがえることもあります。9時から17時30分まで働いたなら、入れるのは長さの8時間30分です。休けいが1時間あれば、7時間30分にしてから入れます。</p>`;

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
  `${ZUKAI}${BAND}${HOW}`,
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
${section('scenes', '使う場面の例', SCENES)}
${section('mistakes', 'まちがえやすいところ', MISTAKES)}

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
