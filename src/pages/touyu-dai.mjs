// 灯油代の計算：暖房のマス（メーカーの燃料消費量）・1時間に使う灯油・1日に使う時間・灯油の値段から、1か月の灯油代と18Lが何日もつか
// 結果は青いポリタンクの絵：ラベルに「18Lで何日」、横にいちばん大きな1か月の灯油代と、1か月に使うポリタンクの数
// マスの数字と値段のはじめの値は src/data/touyu.mjs（出典つき）。ページに載せる計算例は tests/touyu.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { TOUYU_PRICE, TOUYU_HEATERS } from '../data/touyu.mjs';
import { touyu, literPrice } from '../lib/touyu.mjs';
import { fmt } from '../lib/number.mjs';

const tool = toolBySlug('touyu-dai');
const path = '/touyu-dai/';
const esc = (s) => s.replace(/&/g, '&amp;');
const P18 = TOUYU_PRICE.can; // 18Lの値段（はじめの値）
const P1 = literPrice(P18);
const yen = (x) => fmt(x, x < 100 ? 1 : 0);

// 青いポリタンク（ラベルの白い所に「18Lで何日」を重ねる。.tk-label の位置とそろえる）
const TANK = `<svg viewBox="0 0 120 140" aria-hidden="true"><rect x="16" y="2" width="50" height="32" rx="9" fill="#2e6fb7"/><rect x="25" y="10" width="32" height="13" rx="5" fill="#fff"/><rect x="80" y="10" width="20" height="20" fill="#2e6fb7"/><rect x="76" y="2" width="28" height="11" rx="3" fill="#1c2f4a"/><rect x="4" y="26" width="112" height="112" rx="11" fill="#2e6fb7"/><path d="M10 44h100M10 128h100" stroke="#1d4f8c" stroke-width="2.5" opacity=".55"/><rect x="18" y="53" width="84" height="60" rx="4" fill="#fff"/></svg>`;

const TILES = TOUYU_HEATERS.map((h) => `<button type="button" class="tile tile-word" data-lph="${h.max}" aria-pressed="false"><b>${h.short}</b><small>${h.max}L/時</small></button>`).join('');

// 暖房ごとの1時間の灯油（強・弱）と灯油代。リンク先は出典のメーカーの仕様のページ
const HEATER_ROWS = TOUYU_HEATERS.map(
  (h) => `<tr><td class="wrap">${h.name}<br><small>${h.cond}</small></td><td class="num"><a href="${esc(h.url)}">${h.max}〜${h.min}L</a></td><td class="num">${yen(touyu({ lph: h.max, hours: 1, price: P18 }).hour)}〜${yen(touyu({ lph: h.min, hours: 1, price: P18 }).hour)}円</td></tr>`,
).join('\n');

// 18Lが何日もつかの早見表（tests/touyu.test.mjs と同じ）
const QUICK_LPH = [0.1, 0.2, 0.3, 0.5];
const QUICK_HOURS = [4, 8, 12];
const QUICK_ROWS = QUICK_LPH.map(
  (l) => `<tr><td>${l}L</td>${QUICK_HOURS.map((h) => `<td class="num">${fmt(touyu({ lph: l, hours: h, price: P18 }).canDays, 1)}日</td>`).join('')}</tr>`,
).join('\n');

const EX = touyu({ lph: 0.3, hours: 8, price: P18 });

const FAQS = [
  {
    q: '1時間に使う灯油はどこに書いてありますか？',
    a: '<p>説明書やカタログの「燃料消費量」に、1時間あたりのLで書いてあります。「0.293〜0.063L/h」のように2つあるときは、大きいほうが強、小さいほうが弱のときです。</p>',
  },
  {
    q: 'ずっと強のままで計算していますか？',
    a: '<p>暖房のマスは、強のときの量です。部屋が暖まると火が弱くなるので、実際の灯油代はこれより安くなることがあります。弱のときの量は下の表にあります。</p>',
  },
  {
    q: '灯油の値段は1Lと18L、どちらで入れますか？',
    a: `<p>どちらでも計算できます。500円より高い値段は18Lの値段として、18で割って1Lの値段にします。はじめの${fmt(P18)}円は、${TOUYU_PRICE.date}の全国平均の店頭価格（18L）です。</p>`,
  },
  {
    q: '18Lで何日もちますか？',
    a: `<p>18Lを、1日に使う灯油で割った日数です。1時間0.3Lで1日8時間なら、1日2.4Lで、18Lは${fmt(EX.canDays, 1)}日でなくなります。</p>`,
  },
  {
    q: '1か月は何日で計算していますか？',
    a: '<p>30日です。冬のあいだずっと使うときは、1か月の額に使う月の数をかけてください。</p>',
  },
  {
    q: '電気のヒーターとくらべるには？',
    a: '<p><a href="/denki-dai/">電気代の計算</a>で、同じ時間を入れてくらべられます。<a href="/oil-heater/">オイルヒーター</a>や<a href="/ceramic-heater/">セラミックヒーター</a>は、強さごとの電気代のページがあります。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">灯油代と、18Lが何日もつかを計算します。</p>

<div class="calc" id="calc">
  <div class="field" id="f-tiles"><div class="tiles tiles-4" role="group" aria-label="暖房をえらぶ">${TILES}</div></div>
  <div class="box-rows">
    <div class="box-row-clear">${boxField('lph', '1時間の灯油', 'L', '0.3', '', '説明書の「燃料消費量」')}<button type="button" class="clear-btn" id="clear">クリア</button></div>
    <div class="pair">${boxField('hours', '1日に使う時間', '時間', '8')}${boxField('price', '灯油の値段', '円', fmt(P18), fmt(P18), '1Lの値段か、18L（1缶）の値段')}</div>
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title">灯油代<small>目安</small></p>
    <div class="pic-row">
      <div class="tk-tank">${TANK}<p class="tk-label"><span class="tk-k">18Lで</span><span class="tk-n"><b id="t-days">？</b><span id="t-unit">日</span></span></p></div>
      <div class="pic-side">
        <p class="slip-k" id="r-cap">1か月</p>
        <p class="slip-v"><small>約</small><b id="r-num">？</b><small>円</small></p>
        <p class="tk-cans" id="t-cans" aria-hidden="true"></p>
        <p class="tk-liters" id="t-liters"></p>
      </div>
    </div>
    <table class="slip-table"><thead><tr><th>1時間</th><th>1日</th><th>1L</th></tr></thead><tbody><tr><td id="d-hour">—</td><td id="d-day">—</td><td id="d-liter">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">暖房をえらんでください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>1か月 ＝ 1時間の灯油 × 1日の時間 × 30日 × 1Lの値段</span>
<span>18Lで何日 ＝ 18 ÷（1時間の灯油 × 1日の時間）</span>
</div>
<p>例：1時間0.3Lを1日8時間、18L ${fmt(P18)}円（1L ${fmt(P1, 1)}円）なら、1か月は72Lで約${fmt(EX.month, 0)}円です。18Lは${fmt(EX.canDays, 1)}日でなくなります。</p>`,
)}

${section(
  'days',
  '18Lが何日もつかの早見表',
  `<div class="tbl-wrap"><table>
<thead><tr><th>1時間の灯油</th>${QUICK_HOURS.map((h) => `<th class="num">1日${h}時間</th>`).join('')}</tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p>1時間の灯油は、暖房の説明書の「燃料消費量」です。</p>`,
)}

${section(
  'heaters',
  '暖房ごとの1時間の灯油',
  `<div class="tbl-wrap"><table>
<thead><tr><th>暖房</th><th class="num">強〜弱</th><th class="num">1時間</th></tr></thead>
<tbody>
${HEATER_ROWS}
</tbody>
</table></div>
<p>製品によって違うので、使っている暖房の説明書の数字を入れるのがいちばん正確です。量のリンク先は、出典のメーカーの仕様のページです。1時間の灯油代は、18L ${fmt(P18)}円のときです。</p>
<p class="note">値段の出典：<a href="${esc(TOUYU_PRICE.url)}">${TOUYU_PRICE.src}</a></p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '灯油代の計算｜ファンヒーター・ストーブの1か月の灯油代と18Lで何日もつか',
    description:
      '灯油代を、石油ファンヒーターやストーブの燃料消費量（1時間に使う灯油）と使う時間から計算します。1時間・1日・1か月の灯油代と、18Lのポリタンクが何日もつかがわかります。灯油の値段は1Lでも18Lでも入れられます。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '暖房の燃料消費量と使う時間と灯油の値段から、1時間・1日・1か月の灯油代と、18Lが何日もつかを出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['touyu.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
