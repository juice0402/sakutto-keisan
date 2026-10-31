// 塩分濃度の計算（料理）：水や食材の重さ・濃度・塩のうち2つを入れると、残りの1つ（点線の答えの欄）が出る
// 濃度は料理の言い方（水や食材の重さに対する塩の割合）。塩水として全体に対する濃度も表に出す
// 用途のマス（浅漬け・パスタ・砂抜き・梅干し）と塩のスプーンの重さは src/data/enbun.mjs（出典つき）。ページに載せる計算例は tests/enbun.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { ENBUN_SPOON, ENBUN_USES, ENBUN_MORE } from '../data/enbun.mjs';
import { enbun, spoonText } from '../lib/enbun.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, band, zBox } from '../zukai.mjs';

const tool = toolBySlug('enbun-noudo');
const path = '/enbun-noudo/';
const esc = (s) => s.replace(/&/g, '&amp;');
const { tsp: TSP, tbsp: TBSP } = ENBUN_SPOON;
const spoon = (g) => spoonText(g, TSP, TBSP);
const salt = (base, pct) => enbun({ base, pct, salt: null, out: 'salt' }).salt;

// ボウル（水や食材）と塩の山。ボウルの水の所に重さを重ねる（.en-label の位置とそろえる）
const BOWL = `<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M42 41 Q60 14 78 41 Z" fill="#eef2f7" stroke="#9aa9bb" stroke-width="2"/><path d="M53 33h2M62 27h2M66 35h2M57 38h2" stroke="#9aa9bb" stroke-width="2" stroke-linecap="round"/><path d="M6 41 H114 C114 74 90 95 60 95 C30 95 6 74 6 41 Z" fill="#fff" stroke="#1c2f4a" stroke-width="3"/><path d="M13 49 H107 C104 72 85 88 60 88 C35 88 16 72 13 49 Z" fill="#cfe3f3"/><path d="M3 41 H117" stroke="#1c2f4a" stroke-width="3" stroke-linecap="round"/></svg>`;

const TILES = ENBUN_USES.map((u) => `<button type="button" class="tile tile-word" data-pct="${u.pct}" aria-pressed="false"><b>${u.short}</b><small>${u.pct}%</small></button>`).join('');

// 用途ごとの塩の量（マスと同じ。リンク先は出典のページ）
const USE_ROWS = ENBUN_USES.map((u) => `<tr><td class="wrap">${u.name}</td><td class="wrap"><a href="${esc(u.url)}">${u.range}</a></td></tr>`).join('\n');

// 早見表：水や食材の重さ × 1〜3％（tests/enbun.test.mjs と同じ）
const QUICK_BASE = [200, 500, 1000, 2000];
const QUICK_PCT = [1, 2, 3];
const QUICK_ROWS = QUICK_BASE.map(
  (b) => `<tr><td>${b >= 1000 ? `${b / 1000}L・${b / 1000}kg` : `${b}g`}</td>${QUICK_PCT.map((p) => `<td class="num">${fmt(salt(b, p))}</td>`).join('')}</tr>`,
).join('\n');

// 塩の重さとスプーンの目安（tests/enbun.test.mjs と同じ）
const SPOON_GRAMS = [1, 2, 3, 5, 6, 9, 10, 12, 15, 18, 20, 30];
const SPOON_ROWS = SPOON_GRAMS.map((g) => `<tr><td class="num">${g}g</td><td>${spoon(g)}</td></tr>`).join('\n');

// 図解（#81）：ボウルの式（水500mlで3％）と、塩水全体515gを水と塩に分けた帯。数字は tests/zukai-seikatsu.test.mjs
const ZE = enbun({ base: 500, pct: 3, salt: null, out: 'salt' });
export const Z_ENBUN = { salt: ZE.salt, whole: Number(fmt(ZE.whole, 1)) };
const ZUKAI = stair(zBox('水', '500ml'), { b: '×0.03', small: '3％' }, zBox('塩', `${fmt(ZE.salt)}g`, true), ['塩 ＝ 水や食材の重さ × 濃度', '濃度 ＝ 塩 ÷ 水や食材の重さ × 100', '全体に対して ＝ 塩 ÷（水 ＋ 塩）× 100', `例：水500mlで3％の塩水なら、塩は500 × 0.03 ＝ ${fmt(ZE.salt)}g（${spoon(ZE.salt)}）です。塩水全体に対しては、${fmt(ZE.salt)} ÷ ${fmt(500 + ZE.salt)} で約${fmt(ZE.whole, 1)}％です。`], `塩${fmt(ZE.salt)}gは <b class="fz-red">${spoon(ZE.salt)}</b>`);
const saltW = Number(((ZE.salt / (500 + ZE.salt)) * 100).toFixed(1));
const BAND = band({ head: `塩水 ${fmt(500 + ZE.salt)}g`, parts: [{ w: Number((100 - saltW).toFixed(1)), text: '水 500g' }, { w: saltW, kind: 'off', text: '' }], ruler: [[0, '0'], [100, `塩 ${fmt(ZE.salt)}g`, true]], ans: `水の3％ → <b>${fmt(ZE.salt)}g</b>・全体では約${fmt(ZE.whole, 1)}％`, label: `塩水${fmt(500 + ZE.salt)}gの帯を、水500gと塩${fmt(ZE.salt)}gに分けた図` });

const FAQS = [
  {
    q: '浅漬けの塩は何％ですか？',
    a: `<p>伯方塩業のページでは、塩もみは野菜の重さの1〜2％です。野菜300gなら、2％で塩${fmt(salt(300, 2))}g（${spoon(salt(300, 2))}）です。</p>`,
  },
  {
    q: 'パスタのゆで汁の塩は？',
    a: `<p>日本パスタ協会は、水1Lに塩5〜10gを目安にしています。0.5〜1％です。<a href="${ENBUN_MORE.nisshin.url}">日清製粉ウェルナ</a>は、水1Lに塩小さじ1（5g）です。</p>`,
  },
  {
    q: 'あさりの砂抜きの塩水は何％？',
    a: `<p>愛知県の食育のページは、海水くらいの約3％です。<a href="${ENBUN_MORE.kikkoman.url}">キッコーマン</a>は、3％だと塩味がつくので2％くらいにしています。</p>`,
  },
  {
    q: '梅干しの塩は何％ですか？',
    a: `<p>神奈川県のページでは、梅の重さの18％です。梅2kgなら塩${fmt(salt(2000, 18))}gです。<a href="${ENBUN_MORE.kochi.url}">高知県</a>は15％と20％の漬け方を出しています。</p>`,
  },
  {
    q: '塩分濃度2％は、水1Lに塩何gですか？',
    a: `<p>${fmt(salt(1000, 2))}gです。食塩なら${spoon(salt(1000, 2))}です。</p>`,
  },
  {
    q: '塩小さじ1は何gですか？',
    a: `<p>サラサラした食塩は小さじ1が${TSP}g、大さじ1が${TBSP}gです。しっとりした塩（並塩）は${ENBUN_SPOON.moist.tsp}gと${ENBUN_SPOON.moist.tbsp}gです。このツールのスプーンの目安は、食塩の重さで出しています。</p>`,
  },
  {
    q: '「全体に対して」とは何ですか？',
    a: `<p>塩水全体（水と塩を足した重さ）に対する割合です。料理の割合は水や食材の重さに対して出すのがふつうで、<a href="${ENBUN_MORE.eiyo.url}">女子栄養大学</a>のページでは「調味パーセント」と呼んでいます。</p>`,
  },
  {
    q: '海水の塩分は何％ですか？',
    a: `<p><a href="${ENBUN_MORE.sea.url}">塩事業センター</a>のページでは、海水には塩類が約3.5％ふくまれていて、そのうち食塩は約2.7％です。</p>`,
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">水や食材の重さから、塩の量を計算します。</p>

<div class="calc" id="calc" data-tsp="${TSP}" data-tbsp="${TBSP}">
  <div class="box-rows">
    ${boxField('base', '水や食材の重さ', 'g', '500', '', '水は1ml＝1g。浅漬けは野菜の重さ')}
    <div class="tiles tiles-4" role="group" aria-label="用途をえらぶ">${TILES}</div>
    <div class="pair">${boxField('pct', '濃度', '％', '2', '', '水や食材の重さに対する塩の割合')}${boxField('salt', '塩', 'g', '10')}</div>
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title"><span>塩の量<small>目安</small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="pic-row">
      <div class="en-bowl">${BOWL}<p class="en-label" id="b-base"></p></div>
      <div class="pic-side">
        <p class="slip-k" id="r-cap">塩</p>
        <p class="slip-v"><b id="r-num">？</b><small id="r-unit">g</small></p>
        <p class="en-spoons" id="s-spoons" aria-hidden="true"></p>
        <p class="en-stext" id="s-text"></p>
      </div>
    </div>
    <table class="slip-table"><thead><tr><th>塩</th><th>濃度</th><th>全体に対して</th></tr></thead><tbody><tr><td id="d-salt">—</td><td id="d-pct">—</td><td id="d-whole">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">水や食材の重さを入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `${ZUKAI}
<p>料理の塩分濃度は、水や食材の重さを100としたとき、塩が何gかで表します。だから、重さに濃度をかけて100で割ると塩の量です。塩水全体に対する割合は、割る数に塩の重さも入るので、少し小さい数になります。例：きゅうり250gを2％で塩もみするなら、塩は${fmt(salt(250, 2))}gで${spoon(salt(250, 2))}です。</p>`,
)}

${section(
  'quick',
  '塩の量の早見表',
  `${BAND}<div class="tbl-wrap"><table>
<thead><tr><th>水や食材</th>${QUICK_PCT.map((p) => `<th class="num">${p}％</th>`).join('')}</tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">塩の重さ（g）です。</p>
<p>水は1ml＝1gとしています。</p>`,
)}

${section(
  'spoon',
  '塩の重さとスプーンの目安',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">塩</th><th>スプーン</th></tr></thead>
<tbody>
${SPOON_ROWS}
</tbody>
</table></div>
<p>食塩の重さ（小さじ1＝${TSP}g・大さじ1＝${TBSP}g）で、1/4さじ単位にした目安です。しっとりした塩は小さじ1が${ENBUN_SPOON.moist.tsp}gなので、同じ重さでもスプーンの数は少し多くなります。</p>`,
)}

${section(
  'uses',
  '用途ごとの塩の量',
  `<div class="tbl-wrap"><table>
<thead><tr><th>用途</th><th>塩の量</th></tr></thead>
<tbody>
${USE_ROWS}
</tbody>
</table></div>
<p>リンク先は、それぞれの数字の出典のページです。</p>
<p class="note">スプーンの重さの出典：<a href="${esc(ENBUN_SPOON.url)}">${ENBUN_SPOON.src}</a></p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>白菜400gで浅漬けを作るとき。2％なら塩は${fmt(salt(400, 2))}gで、${spoon(salt(400, 2))}です。</p>
<p>大きな鍋で、水3Lのパスタのゆで汁を1％にするとき。塩は${fmt(salt(3000, 1))}gで、${spoon(salt(3000, 1))}です。</p>
<p>あさりの砂抜きで、水600mlに塩18gを入れたときの濃さは${fmt(enbun({ base: 600, pct: null, salt: 18, out: 'pct' }).pct)}％です。塩の量から濃度を出すときは、濃度の欄を空けて、水や食材の重さと塩を入れます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>水に対してか、塩水全体に対してか</h3>
<p>水1Lに塩30gは、水に対して3％ですが、塩水全体に対しては約${fmt(enbun({ base: 1000, pct: 3, salt: null, out: 'salt' }).whole, 1)}％です。全体で3％にするなら、水970gに塩30gです。割る数がちがうだけで、出し方は<a href="/percent/">パーセントの計算</a>と同じです。</p>
<h3>しっとりした塩をスプーンで量る</h3>
<p>スプーンの目安は、小さじ1が${TSP}gの食塩で出しています。しっとりした塩は小さじ1が${ENBUN_SPOON.moist.tsp}gなので、塩15gのつもりで${spoon(15)}を量ると12.5gになります。</p>
<h3>ボウルの重さまで入れてしまう</h3>
<p>濃度は、水や食材だけの重さにかけます。500gのボウルに野菜300gを入れたまま800gで計算すると、2％の塩は${fmt(salt(800, 2))}gで、正しい${fmt(salt(300, 2))}gの2倍以上になります。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '塩分濃度の計算｜浅漬け・パスタ・砂抜きの塩は何g？',
    description: `料理の塩分濃度を計算します。水500mlで3％の塩水なら、塩は15gで${spoon(15)}です。浅漬け・パスタのゆで汁・あさりの砂抜き・梅干しは、えらぶと濃度の目安が入ります。塩の量から濃度も出せます。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '水や食材の重さ・塩分濃度・塩の量のうち2つから残りの1つと、塩のスプーンの目安を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['enbun.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
