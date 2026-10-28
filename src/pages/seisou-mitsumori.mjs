// 清掃の見積もり計算：回数と、面積・㎡単価・1か月の料金のうち2つから、残りの1つ（点線の答えの欄）と1回・1年の料金を出す（掛け率と同じ形。面積が軸）
// 作業のマスをえらぶと、㎡単価の欄に目安が入る。目安は、清掃の作業時間と同じ公共の積算の歩掛りに、国土交通省の清掃員の単価と島根県の経費の率をかけたもの
// （10/26 司令塔の検索の傾向のメモ「清掃の作業時間はクリック率20％。清掃・ビルメン系の計算は伸ばす価値あり」→ しょーくんが「清掃の見積もり」をえらんだ）
// 結果は見積書（大きな答え、面積×㎡単価×回数の1行、1回・1か月・1年の表、清掃する月に赤ペンの丸をつけた1年の帯）。ページに載せる例は tests/mitsumori.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { SEISOU_WORKS, SEISOU_SRC } from '../lib/seisou.mjs';
import { mitsumori, mitsuKeihi, mitsuMeyasu, MITSU_KAISU } from '../lib/mitsumori.mjs';
import { ROUMU_TANKA, SEISOU_KEIHI } from '../data/seisou-tanka.mjs';
import { fmt, yenBand } from '../lib/number.mjs';

const tool = toolBySlug('seisou-mitsumori');
const path = '/seisou-mitsumori/';

const KEIHI = mitsuKeihi(SEISOU_KEIHI);
const WAGE = ROUMU_TANKA.average;
const ROW_NAME = { office: '事務室の日常清掃', hall: '廊下の日常清掃', toilet: 'トイレの日常清掃', wash: '事務室の床洗浄' };
const WORKS = SEISOU_WORKS.map((w) => ({ ...w, ...mitsuMeyasu(w.buai, WAGE, SEISOU_KEIHI) }));
const OFFICE = WORKS.find((w) => w.id === 'office');
const WASH = WORKS.find((w) => w.id === 'wash');

// 作業のマス：ことばだけ（清掃の作業時間と同じ。数字はマスに書かない）。えらぶと㎡単価の欄に目安が入る
const WORK_TILES = `<div class="tiles tiles-4" role="group" aria-label="作業をえらぶ">${WORKS.map(
  (w) => `<button type="button" class="tile tile-word" data-price="${w.price}" aria-pressed="false"><b>${w.name}</b><small>${w.kind}</small></button>`,
).join('')}</div>`;

// 回数のマス：4つと、自分で入れる1年の回数
const YEAR_TILES = `<div class="tiles tiles-5" role="group" aria-label="回数をえらぶ">${MITSU_KAISU.map(
  (k) => `<button type="button" class="tile" data-year="${k.year}" aria-pressed="false"><b>${k.name}</b><small>${k.sub}</small></button>`,
).join('')}<div class="tile tile-input" id="f-year"><div class="tile-box"><input id="year" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="?"><span>回</span></div><label for="year">年の回数</label></div></div>`;

// 計算例：300㎡を目安の事務室の㎡単価で週5回（説明文・計算式・よくある質問で使う）
const EX = mitsumori({ area: 300, price: OFFICE.price, month: null, year: 260, out: 'month' });
const EX_WASH = mitsumori({ area: 100, price: WASH.price, month: null, year: 12, out: 'month' });
const EX_REV = mitsumori({ area: 200, price: null, month: 20000, year: 52, out: 'price' });

const WORK_ROWS = WORKS.map(
  (w) => `<tr><td>${ROW_NAME[w.id]}</td><td class="num">${fmt(w.buai, 3)}人</td><td class="num">${fmt(w.labor, 2)}円</td><td class="num">${fmt(w.price, 1)}円</td></tr>`,
).join('\n');

const TANKA_ROWS = ROUMU_TANKA.regions.map(
  (r) => `<tr><td>${r.name}</td><td class="num">${fmt(r.a)}</td><td class="num">${fmt(r.b)}</td><td class="num">${fmt(r.c)}</td></tr>`,
).join('\n');
const TOKYO = ROUMU_TANKA.regions.find((r) => r.name === '東京');
const OKINAWA = ROUMU_TANKA.regions.find((r) => r.name === '沖縄');

// 回数の早見表：よくある回数の1年と1か月の回数
const KAISU_QUICK = [['週5回', 260], ['週3回', 156], ['週2回', 104], ['週1回', 52], ['月2回', 24], ['月1回', 12], ['年6回', 6], ['年4回', 4]];
const KAISU_ROWS = KAISU_QUICK.map(([n, y]) => `<tr><td>${n}</td><td class="num">${y}回</td><td class="num">${fmt(y / 12, 1)}回</td></tr>`).join('\n');

const checkedText = (d) => d.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$1年$2月$3日');
const MONTH_CELLS = Array.from({ length: 12 }, (_, i) => `<span class="mt-m">${i + 1}</span>`).join('');

const FAQS = [
  {
    q: '㎡単価とは何ですか？',
    a: `<p>1㎡を1回掃除する料金です。300㎡を1回${fmt(EX.once)}円で掃除するなら、㎡単価は${fmt(OFFICE.price, 1)}円です。</p>`,
  },
  {
    q: '1か月の料金から㎡単価を出せますか？',
    a: `<p>回数をえらんで、面積と1か月の料金を入れると出ます。200㎡を週1回で1か月20,000円なら、約${fmt(EX_REV.price, 2)}円です。</p>`,
  },
  {
    q: '週5回は1か月に何回ですか？',
    a: '<p>1年を52週として260回、1か月は約21.7回で計算します。祝日を休む契約なら、休みを引いた回数を「1年の回数」に入れてください。</p>',
  },
  {
    q: '地域で単価は変わりますか？',
    a: `<p>国の清掃員の単価は地区で違い、清掃員Cは東京${fmt(TOKYO.c)}円、沖縄${fmt(OKINAWA.c)}円です。作業のマスは、10地区の平均の${fmt(WAGE)}円で出しています。</p>`,
  },
  {
    q: '目安より高い見積もりは高すぎますか？',
    a: '<p>そうとはかぎりません。国の歩掛りは低すぎるという業界団体の意見があり、汚れ方や作業する時間帯でも料金は変わります。</p>',
  },
  {
    q: '税込みの料金は？',
    a: '<p>入れた金額のまま計算して、見積書の下に1か月の税込み（10％）を出します。税抜きの金額を入れてください。</p>',
  },
  {
    q: '作業時間から見積もるには？',
    a: `<p><a href="/seisou-jikan/">清掃の作業時間の計算</a>で、のべの作業時間を出します。国の清掃員の平均なら1時間約${fmt(Math.round(WAGE / 8))}円なので、それをかけると人件費の分がわかります。</p>`,
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">㎡単価と回数から清掃の料金を出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${WORK_TILES}
    ${YEAR_TILES}
    ${boxField('area', '面積', '㎡', '300')}
    <div class="pair">${boxField('price', '㎡単価（1回）', '円', String(OFFICE.price), '', '1㎡を1回掃除する料金')}${boxField('month', '1か月の料金', '円', fmt(EX.month))}</div>
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">見積書</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k" id="r-cap">1か月の料金</span><span class="doc-sum-v"><b id="r-num">？</b><span id="r-unit">円</span></span></p>
    <p class="doc-info"><span id="r-info"></span></p>
    <table class="doc-table"><thead><tr><th>期間</th><th>回数</th><th>料金</th></tr></thead><tbody>
      <tr><td>1回</td><td>1回</td><td id="m-once">—</td></tr>
      <tr><td>1か月</td><td id="k-month">—</td><td id="m-month">—</td></tr>
      <tr><td>1年</td><td id="k-year">—</td><td id="m-year">—</td></tr>
    </tbody></table>
    <div class="mt-months" id="s-months" aria-hidden="true">${MONTH_CELLS}</div>
    <p class="doc-foot"><span id="r-foot">回数をえらんでください</span><span id="r-tax"></span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool, false)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>1回の料金 ＝ 面積 × ㎡単価</span>
<span>1か月の料金 ＝ 1回の料金 × 1年の回数 ÷ 12</span>
</div>
<p>例：300㎡を㎡単価${fmt(OFFICE.price, 1)}円で週5回なら、1回は${fmt(EX.once)}円です。1年260回なので、1か月は${fmt(EX.month)}円、1年は${fmt(EX.yearly)}円になります。</p>
<p>床洗浄を月1回なら、100㎡で1回${fmt(EX_WASH.once)}円が、そのまま1か月の料金です。</p>`,
)}

${section(
  'meyasu',
  '作業のマスの㎡単価の出しかた',
  `<div class="formula">
<span>㎡単価 ＝ 歩掛り ÷ 100 × 清掃員の単価 × ${fmt(KEIHI, 2)}</span>
</div>
<p>歩掛りは、100㎡を1回掃除するのに何人いるかで、<a href="/seisou-jikan/">清掃の作業時間の計算</a>と同じ数字です。清掃員の単価は、国土交通省の${ROUMU_TANKA.year}建築保全業務労務単価の清掃員の全国平均で、1日8時間あたり${fmt(WAGE)}円です。</p>
<p>${fmt(KEIHI, 2)}は、人件費に物品費・業務管理費・一般管理費等をのせる割合です。島根県の清掃業務委託料算定要領の率のまん中の値（物品費${SEISOU_KEIHI.goods}％・業務管理費${SEISOU_KEIHI.manage}％・一般管理費等${SEISOU_KEIHI.general}％）を順にかけています。</p>
<div class="tbl-wrap"><table>
<thead><tr><th>作業</th><th class="num">歩掛り</th><th class="num">人件費</th><th class="num">㎡単価</th></tr></thead>
<tbody>
${WORK_ROWS}
</tbody>
</table></div>
<p class="note">人件費と㎡単価は1㎡・1回あたりです。</p>
<p>消費税と、トイレットペーパーなどの消耗品は入っていません。実際の見積もりは、建物の汚れ方や作業する時間帯で変わります。</p>
<p>清掃の業界団体からは、床の日常清掃の歩掛りは低すぎて、平均で約3.59倍にする必要があるという意見が出ています。</p>
<p>出典：清掃員の単価は<a href="${ROUMU_TANKA.url}">国土交通省の${ROUMU_TANKA.year}建築保全業務労務単価</a>、経費の率は<a href="${SEISOU_KEIHI.url}">島根県の清掃業務委託料算定要領</a>、歩掛りは<a href="${SEISOU_SRC.daily}">札幌市の清掃業務の積算</a>と<a href="${SEISOU_SRC.regular}">国土交通省の検討資料</a>、業界団体の意見は<a href="${SEISOU_SRC.view}">国土交通省の検討課題の資料</a>です。${checkedText(ROUMU_TANKA.checked)}に確かめました。</p>`,
)}

${section(
  'tanka',
  '地区ごとの清掃員の単価',
  `<div class="tbl-wrap"><table>
<thead><tr><th>地区</th><th class="num">清掃員A</th><th class="num">清掃員B</th><th class="num">清掃員C</th></tr></thead>
<tbody>
${TANKA_ROWS}
</tbody>
</table></div>
<p class="note">${ROUMU_TANKA.year}の1日8時間の単価（円）です。</p>
<p>清掃員Aは経験6年以上など、Bは3年以上6年未満など、Cは3年未満で、AかBの指示で作業する人です。時間外の割増や、会社の経費は入っていません。</p>`,
)}

${section(
  'kaisu',
  '回数の早見表',
  `<div class="tbl-wrap"><table>
<thead><tr><th>回数</th><th class="num">1年</th><th class="num">1か月</th></tr></thead>
<tbody>
${KAISU_ROWS}
</tbody>
</table></div>
<p class="note">1か月は1年の回数を12で割った数です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '清掃の見積もり計算｜㎡単価と回数から1か月の料金',
    description: `清掃の料金を、面積・㎡単価・回数から計算します。300㎡を㎡単価${fmt(OFFICE.price, 1)}円で週5回なら1か月${yenBand(EX.month)}です。作業ごとの㎡単価の目安は、国の清掃員の単価${fmt(WAGE)}円（${ROUMU_TANKA.year}）から出しています。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '清掃の面積・㎡単価・回数から、1回・1か月・1年の料金と㎡単価を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['mitsumori.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
