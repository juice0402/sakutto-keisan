// 現場手帳（#106。2026-10-31 しょーくんと見本 A に決めた）：現場（場所と面積・人数・はじめとおわり）を入れると、
// 時間割の帯が埋まり、1枚の作業計画書（かかる時間・場所ごとの時刻・トイレの消毒液・見積もりの目安）になる。
// 現場はこの端末の localStorage（sakutto-genba）だけに10件まで。パソコン（1024px〜）はページの幅を1120pxにして2列（page({ wide })）
// 数字は清掃の作業時間・清掃の見積もり・次亜塩素酸ナトリウムの薄め方と同じ計算。ページに載せる例は tests/genba.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { SEISOU_SRC, minText } from '../lib/seisou.mjs';
import { MITSU_KAISU } from '../lib/mitsumori.mjs';
import { genbaPlan, genbaPrices, genbaEstimate, genbaToiletMl, genbaRowHtml, genbaKindsHtml, genbaBlank, minToHm, GENBA_SITES_MAX } from '../lib/genba.mjs';
import { ROUMU_TANKA, SEISOU_KEIHI } from '../data/seisou-tanka.mjs';
import { HYOHAKU_SRC, HYOHAKU_AMOUNT_SOURCES } from '../data/hyohakuzai.mjs';
import { volumeText } from '../lib/kishaku.mjs';
import { fmt, yenBand } from '../lib/number.mjs';
import { stair, band, zBox } from '../zukai.mjs';

const tool = toolBySlug('genba');
const path = '/genba/';
const ANZEN = 'https://anzen-benricho.com/shikaku/koushin/';
// 薄めた消毒液は作り置きしない（作戦会議で開いた。更新 2026-01-30、確認 2026-10-31）
const HIROSHIMA = 'https://www.city.hiroshima.lg.jp/site/infectious-disease-joho/332.html';

const PRICES = genbaPrices(ROUMU_TANKA.average, SEISOU_KEIHI);
const r = (kind, name, area) => ({ kind, name, area });
const t = (name, min) => ({ kind: 'time', name, min });

// 見本：事務室600㎡・廊下300㎡・トイレ40㎡を2人で、8:00〜11:00
export const EX_ROWS = [r('office', '事務室', 600), r('hall', '廊下', 300), r('toilet', 'トイレ', 40)];
export const EX = genbaPlan({ rows: EX_ROWS, people: 2, start: 480, end: 660 });
export const EX_MITSU = genbaEstimate(EX_ROWS, PRICES, 260);
export const EX_WEEK1 = genbaEstimate(EX_ROWS, PRICES, 52);
export const EX_ML = genbaToiletMl(5);
// 使う場面の例
export const SC_3 = genbaPlan({ rows: EX_ROWS, people: 3, start: 480, end: 660 });
export const SC_TOILET = genbaPlan({ rows: [r('toilet', '男子トイレ', 20), r('toilet', '女子トイレ', 30), t('補充の見回り', 15)], people: 1, start: 780, end: 900 });
export const SC_TOILET1 = genbaPlan({ rows: [r('toilet', 'トイレ', 40)], people: 1, start: null, end: null });
export const SC_ML10 = genbaToiletMl(10);

const exRow = (x) => `<tr><td>${minToHm(x.from)}</td><td>${x.name}</td><td class="num">${x.area === null ? '—' : `${fmt(x.area)}㎡`}</td><td class="num">${minText(x.minutes)}</td></tr>`;
const ZUKAI = stair(
  zBox('事務室600㎡を2人で', '1人1時間 370㎡'),
  { b: '600 ÷ 370 ÷ 2', small: '1分未満は切り上げ' },
  zBox('かかる時間', minText(EX.items[0].minutes), true),
  ['場所の時間 ＝ 面積 ÷ 1人1時間の面積 ÷ 人数', '1人1時間の面積 ＝ 100 ÷（歩掛り × 8）', `例：事務室600㎡を2人なら、600 ÷ 370 ÷ 2 ＝ 0.81…時間で、${minText(EX.items[0].minutes)}です。`],
  `3つの場所を足して <b class="fz-red">${minText(EX.total)}</b>`,
);
const pct = (m) => Number(((m / EX.span) * 100).toFixed(1));
const BAND = band({
  head: '8:00〜11:00 の3時間',
  parts: [
    ...EX.items.map((x, i) => ({ w: pct(x.minutes), kind: i % 2 ? 'alt' : 'pay', text: `${x.name} ${minText(x.minutes)}` })),
    { w: pct(EX.free), kind: 'off', text: '' },
  ],
  ruler: [[0, '8:00'], [pct(EX.total), minToHm(EX.finish)], [100, '11:00']],
  ans: `合計 ${minText(EX.total)} → <b>空き ${minText(EX.free)}</b>`,
  label: `8時から11時の帯を、事務室・廊下・トイレの時間と空き${minText(EX.free)}に分けた図`,
});

const KAISU = `<div class="gb-pick" id="gb-kai" role="group" aria-label="回数をえらぶ">${MITSU_KAISU.map(
  (k) => `<button type="button" data-year="${k.year}" aria-pressed="${k.year === 260}">${k.name}</button>`,
).join('')}</div>`;

const timeField = (id, label) =>
  `<div class="field box-field date-field" id="f-${id}"><label for="${id}">${label}</label><div class="input"><input id="${id}" type="time" inputmode="numeric" step="300"></div></div>`;

const BLANK = genbaBlank(1);
const FAQS = [
  {
    q: '清掃の作業計画表は、どう作りますか？',
    a: '<p>場所ごとに面積を入れ、人数とはじめ・おわりの時刻を入れると、時刻つきの作業計画書になります。「印刷する」でA4の紙1枚に出せます。</p>',
  },
  {
    q: '男子トイレと女子トイレを分けられますか？',
    a: '<p>「＋場所を足す」でトイレを2つ入れ、名前を書きかえてください。名前は12字まで変えられます。</p>',
  },
  {
    q: '休けいや補充の見回りは入れられますか？',
    a: '<p>「時間で入れる」の行に分を入れます。この行は人数で割らず、入れた分のまま時間割に入ります。</p>',
  },
  {
    q: '現場はどこに保存されますか？',
    a: `<p>この端末のブラウザの中だけです。${GENBA_SITES_MAX}件まで残り、どこにも送信しません。</p>`,
  },
  {
    q: '見積もりの目安に消耗品は入っていますか？',
    a: '<p>入っていません。トイレットペーパーなどの衛生消耗品と消費税は、べつに足してください。</p>',
  },
  {
    q: '現場を消すには？',
    a: '<p>計画書の右上の「クリア」で中身を空にし、空のままもう一度押すと、その現場が消えます。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">現場を入れると作業計画書が1枚になります。</p>

<div class="calc gb" id="calc">
  <div class="gb-in">
    <div class="gb-pick gb-sites" id="gb-sites"><label class="sr-only" for="site-name">現場の名前</label><input id="site-name" class="gb-site-nm" type="text" inputmode="text" autocomplete="off" maxlength="12" value="${BLANK.name}"><button type="button" class="gb-add" id="gb-add-site">＋現場を足す</button></div>
    <div class="gb-rows" id="gb-rows">${BLANK.rows.map(genbaRowHtml).join('')}</div>
    <button type="button" class="gb-add" id="gb-add">＋場所を足す</button>
    <div class="gb-kinds" id="gb-kinds" role="group" aria-label="足す場所をえらぶ" hidden>${genbaKindsHtml()}</div>
    <div class="box-rows gb-cond">
      ${boxField('people', '人数', '人', '2')}
      <div class="pair">${timeField('start', 'はじめ')}${timeField('end', 'おわり')}</div>
    </div>
    <div class="gb-tt" aria-live="polite">
      <p class="tt-sum"><span class="tt-k">時間割</span><span id="tt-total">かかる ？</span><span id="tt-free"></span></p>
      <div class="tt-bands" id="tt-bands"></div>
      <p class="tt-foot" id="r-foot">面積を入れてください</p>
    </div>
    <p class="tag-note" id="r-note" hidden></p>
  </div>
  <div class="gb-out">
    <div class="doc gb-doc">
      <p class="doc-title">作業計画書</p>
      <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
      <p class="doc-info"><span id="d-site">${BLANK.name}</span><span id="d-cond"></span></p>
      <p class="doc-sum"><span class="doc-sum-k">かかる時間</span><span class="doc-sum-v"><b id="r-num">？</b></span></p>
      <table class="doc-table"><thead><tr><th>時刻</th><th>場所</th><th>面積</th><th>時間</th></tr></thead><tbody id="d-rows"><tr><td>—</td><td>—</td><td>—</td><td>—</td></tr></tbody></table>
      <p class="doc-foot"><span id="d-free"></span><span id="d-end"></span></p>
      <div id="d-toilet" hidden><p class="gb-h">トイレの消毒液</p><p class="gb-line">次亜塩素酸ナトリウム（${HYOHAKU_SRC}％）を0.02％に。<label for="water">バケツの水</label><input id="water" class="gb-water" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" maxlength="5" value="5">Lに原液を約<b id="d-ml">${volumeText(EX_ML)}</b></p></div>
      <p class="gb-h">見積もりの目安</p>
      ${KAISU}
      <table class="doc-table gb-est"><tbody><tr><td>1回</td><td id="e-once">—</td></tr><tr><td>1か月</td><td id="e-month">—</td></tr></tbody></table>
      <p class="gb-small" id="e-skip" hidden>歩掛りのない行は、見積もりに入れていません。</p>
    </div>
    <div class="gb-bar"><button type="button" class="tool-btn" id="gb-print">印刷する</button>${memoHtml(tool)}</div>
    <p class="gb-count" id="gb-count" hidden></p>
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしくみ',
  `${ZUKAI}
<p>場所の時間は、面積を1人が1時間に掃除できる面積と人数で割って出します。時間は1分未満を切り上げ、場所ごとの時間を上から順に足して、はじめの時刻からの時刻にしています。</p>
<p>1人1時間の面積は、公共の建物の清掃を見積もるときの歩掛りから出した目安です。歩掛りは100㎡を1回掃除するのに何人いるかで、1人を1日8時間として、100 ÷（歩掛り × 8）で1時間あたりにしています。事務室は約370㎡、廊下は約480㎡、トイレは約49㎡、床洗浄は約38㎡です。</p>
<p>見積もりの目安は、場所ごとの面積に㎡単価の目安をかけて足したものです。㎡単価は<a href="/seisou-mitsumori/">清掃の見積もり計算</a>と同じで、事務室${fmt(PRICES.office, 1)}円・廊下${fmt(PRICES.hall, 1)}円・トイレ${fmt(PRICES.toilet, 1)}円です。1か月は、1回の料金に1年の回数をかけて12で割ります。</p>
<p>トイレの消毒液は、${HYOHAKU_SRC}％の次亜塩素酸ナトリウムを0.02％にするので${HYOHAKU_SRC / 0.02}倍に薄めます。原液の量は水の量を${HYOHAKU_SRC / 0.02 - 1}で割った数で、水5Lなら約${volumeText(EX_ML)}です。<a href="/hyohakuzai/">次亜塩素酸ナトリウムの薄め方</a>と同じ計算です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `${BAND}<div class="tbl-wrap"><table>
<thead><tr><th>時刻</th><th>場所</th><th class="num">面積</th><th class="num">時間</th></tr></thead>
<tbody>
${EX.items.map(exRow).join('\n')}
</tbody>
</table></div>
<p>2人で8:00にはじめると${minToHm(EX.finish)}に終わり、11:00までの空きは${minText(EX.free)}です。見積もりの目安は1回${fmt(EX_MITSU.once)}円で、週5回なら1か月${fmt(EX_MITSU.month)}円、週1回なら${fmt(EX_WEEK1.month)}円です。</p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>同じ事務室・廊下・トイレを3人で受けもつと、時間は${minText(SC_3.items[0].minutes)}・${minText(SC_3.items[1].minutes)}・${minText(SC_3.items[2].minutes)}で、合計${minText(SC_3.total)}です。2人のときより${minText(EX.total - SC_3.total)}短くなり、8:00にはじめれば${minToHm(SC_3.finish)}に終わります。</p>
<p>男子トイレ20㎡と女子トイレ30㎡を1人で掃除し、補充の見回りを15分入れる現場です。トイレはそれぞれ${minText(SC_TOILET.items[0].minutes)}と${minText(SC_TOILET.items[1].minutes)}で、見回りを足すと${minText(SC_TOILET.total)}です。13:00にはじめると${minToHm(SC_TOILET.finish)}に終わり、15:00まで${minText(SC_TOILET.free)}あきます。</p>
<p>消毒液を大きなバケツの水10Lで作るなら、原液は約${volumeText(SC_ML10)}です。5Lのときの2倍になります。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<p>時間で入れる行は、人数で割りません。見回りを15分と入れたら、2人でも3人でも15分のまま時間割に入ります。</p>
<p>人数を2倍にしても、時間がちょうど半分になるとはかぎりません。トイレ40㎡は1人で${minText(SC_TOILET1.total)}、2人で${minText(EX.items[2].minutes)}です。場所ごとに1分未満を切り上げるので、場所が多いほど少し長めに出ます。</p>
<p>水5Lに原液を入れると、できあがりは5Lより少し多くなります。0.02％くらいの薄さなら、ちがいは${volumeText(EX_ML)}ほどです。</p>
<p>見積もりの目安は、時間で入れる行と自分で入れた場所をふくみません。歩掛りがなく、㎡単価の目安が出せないためです。</p>`,
)}

${section(
  'genba-hanashi',
  '運営者の現場の話',
  `<p>歩掛りは平均の目安なので、現場では時間割どおりにいかないことがあります。運営者の現場では、トイレは男女で実際にかかる時間がちがいます。雨の日は、決まった回数より多く掃除しなければなりません。衛生消耗品の補充は、よく使われるフロアほど回数や呼び出しが多くなります。場所の名前を変えられるのと、時間で入れる行があるのはそのためです。</p>
<p>運営者の勤め先では、薄めるときにゴーグルをつけるのが決まりです。まぎらわしいボトルには入れず、薄めてから24時間以内に使い切ります。薄めた消毒液は時間がたつと効果がなくなるので、使うときに必要な量だけ作り、作り置きはしません。</p>
<p>人数や時間割は、スタッフどうしの相性や、一人ひとりの仕事の速さに合わせて調整することが多いです。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section(
  'sources',
  '出典',
  `<p>清掃作業監督者や病院清掃受託責任者の再講習の時期は、<a href="${ANZEN}">安全衛生の便利帳</a>で調べられます。</p>
<p>歩掛りは<a href="${SEISOU_SRC.daily}">札幌市の清掃業務の積算</a>と<a href="${SEISOU_SRC.regular}">国土交通省の検討資料</a>、清掃員の単価は<a href="${ROUMU_TANKA.url}">国土交通省の${ROUMU_TANKA.year}建築保全業務労務単価</a>、経費の率は<a href="${SEISOU_KEIHI.url}">島根県の清掃業務委託料算定要領</a>から出しています。消毒液の濃さは<a href="${HYOHAKU_AMOUNT_SOURCES[0][1]}">${HYOHAKU_AMOUNT_SOURCES[0][0]}</a>、作り置きしないことは<a href="${HIROSHIMA}">広島市の消毒液の作り方と使用上の注意</a>によります。</p>`,
)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '清掃の作業計画表と時間割｜現場手帳',
    description: `清掃の現場の時間割と作業計画書を作ります。事務室600㎡・廊下300㎡・トイレ40㎡を2人なら${minText(EX.total)}で、見積もりの目安は週5回で1か月${yenBand(EX_MITSU.month)}です。トイレの消毒液の量も出ます。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '清掃の場所ごとの面積・人数・時刻から、時間割と作業計画書・見積もりの目安・消毒液の量を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['genba.js'],
    wide: true,
    footNote: '入力した数字は送信しません。現場と「メモする」の記録は、この端末の中だけに保存します。',
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
