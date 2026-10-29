// 清掃の作業時間の計算：作業の速さ（1人1時間に掃除できる面積）と、面積・人数・時間のうち2つから、残りの1つ
// 速さは、作業のマスをえらぶと目安（公共の清掃の積算の歩掛りから出したもの）が入る。自分で入れてもよい
// （10/20 しょーくんの判断。はじめは自分で入れるだけにしたが「相場すらわからない」ので、目安のマスを足した）
// 結果は作業指示書（大きな答え、作業・面積・人数・1人あたりの表、床を人数で分けた図）。ページに載せる計算例は tests/seisou.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { SEISOU_WORKS, SEISOU_SRC, seisou, minText } from '../lib/seisou.mjs';
import { stair, band, zBox } from '../zukai.mjs';

// 図解（#83）：面積と人数から作業時間の絵の式と、床を人数で分けた帯。数字は tests/zukai-shigoto.test.mjs
const ZS = seisou({ area: 600, people: 2, hours: null, speed: 100, out: 'hours' });
export const Z_SEISOU = { minutes: ZS.minutes, perPerson: ZS.perPerson };
const ZUKAI = stair(zBox('600㎡を2人で', '1人1時間 100㎡'), { b: '600 ÷ 100 ÷ 2', small: '1分未満は切り上げ' }, zBox('作業時間', minText(ZS.minutes), true), ['時間 ＝ 面積 ÷ 速さ ÷ 人数', '人数 ＝ 面積 ÷ 速さ ÷ 時間', `速さは、1人が1時間に掃除できる面積です。例：速さ100㎡で600㎡を2人なら、600 ÷ 100 ÷ 2 ＝ 3時間です。`]);
const BAND = band({ head: '床 600㎡', parts: [{ w: 50, text: `1人目 ${ZS.perPerson}㎡` }, { w: 50, kind: 'alt', text: `2人目 ${ZS.perPerson}㎡` }], ruler: [[0, '0'], [50, '300㎡'], [100, '600㎡']], ans: `1人${ZS.perPerson}㎡を1時間100㎡で → <b>${minText(ZS.minutes)}</b>`, label: `600㎡の床の帯を、2人で300㎡ずつに分けた図` });

// 歩掛りの出典
const { daily: SRC_DAILY, regular: SRC_REGULAR, view: SRC_VIEW } = SEISOU_SRC;

// 作業のマス：ことばだけ（数字は「370㎡の事務室」と読まれやすいので、マスには書かない。10/20 しょーくん）。
// えらぶと、下の「1人1時間に掃除できる面積」の欄に目安の数字が入る
const TILES = `<div class="tiles tiles-4" role="group" aria-label="作業をえらぶ">${SEISOU_WORKS.map(
  (w) => `<button type="button" class="tile tile-word" data-speed="${w.speed}" aria-pressed="false"><b>${w.name}</b><small>${w.kind}</small></button>`,
).join('')}</div>`;

const tool = toolBySlug('seisou-jikan');
const path = '/seisou-jikan/';

const ANZEN = 'https://anzen-benricho.com';

const FAQS = [
  {
    q: '1人1時間に掃除できる面積は、どうやって決めますか？',
    a: '<p>作業をえらぶと、公共の清掃の積算の目安が入ります。ふだんの実績から出すなら、2人で300㎡を1時間30分で終えたとき、300 ÷ 2 ÷ 1.5 で100㎡です。</p>',
  },
  {
    q: '作業の種類で速さは変わりますか？',
    a: '<p>大きく変わります。事務室の日常清掃と床の洗浄では、10倍ほど違います。作業ごとに計算してください。</p>',
  },
  {
    q: '準備や移動の時間は入っていますか？',
    a: '<p>入っていません。道具の準備と片付け、場所の移動にかかる時間は、べつに足してください。</p>',
  },
  {
    q: '人数はなぜ切り上げるのですか？',
    a: '<p>決めた時間の中で終わる人数にするためです。7.5人なら8人にして、8人で終わる時間も出します。</p>',
  },
  {
    q: '人工（にんく）で考えるときは？',
    a: '<p>1人工は、1人が1日働く量です。のべの作業時間を1日の作業時間で割ると、何人工かわかります。</p>',
  },
  {
    // 清掃の安全の掲示と資格の更新は、同じ運営者の安全衛生の便利帳にある（10/26 司令塔の検索の傾向のメモ「清掃の作業時間は仕事で使う人に刺さっている。安全衛生の便利帳とつなぐ」）
    q: '清掃の現場で使う安全の掲示はありますか？',
    a: `<p>同じ運営者の<a href="${ANZEN}/anzen/gyoshu/seisou/">安全衛生の便利帳</a>に、清掃・ビルメンの月ごとの掲示と朝礼の文があります。清掃作業監督者の更新の期限も<a href="${ANZEN}/shikaku/koushin/">そちらで計算</a>できます。</p>`,
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">面積と人数から、清掃の時間を計算します。</p>

<div class="calc" id="calc">
  <div class="field" id="f-tiles">${TILES}</div>
  <div class="box-rows">
    ${boxField('speed', '1人1時間に掃除できる面積', '㎡', '100')}
    <div class="pair">${boxField('area', '面積', '㎡', '600')}${boxField('people', '人数', '人', '2')}</div>
    ${boxField('hours', '作業時間', '時間', '3')}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">作業指示書</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k" id="r-cap">かかる時間</span><span class="doc-sum-v"><b id="r-num">？</b></span></p>
    <table class="doc-table"><thead><tr><th>作業</th><th>面積</th><th>人数</th><th>1人あたり</th></tr></thead><tbody><tr><td id="d-work">—</td><td id="d-area">—</td><td id="d-people">—</td><td id="d-per">—</td></tr></tbody></table>
    <div class="floor-plan" aria-hidden="true"><div class="floor-strips" id="s-floor"></div></div>
    <p class="doc-foot"><span id="r-foot">作業をえらんでください</span><span id="r-total"></span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  ZUKAI,
)}

${section(
  'examples',
  '計算例',
  `${BAND}<div class="tbl-wrap"><table>
<thead><tr><th>面積・人数</th><th class="num">時間</th></tr></thead>
<tbody>
<tr><td>300㎡・1人</td><td class="num">3時間</td></tr>
<tr><td>600㎡・2人</td><td class="num">3時間</td></tr>
<tr><td>1,000㎡・3人</td><td class="num">3時間20分</td></tr>
<tr><td>1,500㎡・8人</td><td class="num">1時間53分</td></tr>
</tbody>
</table></div>
<p>1人1時間に100㎡のときです。1,500㎡を2時間で終えるには、7.5人なので8人です。時間は1分未満を切り上げています。</p>`,
)}

${section(
  'speeds',
  '作業のマスの数字の出しかた',
  `<div class="formula">
<span>速さ ＝ 100 ÷（歩掛り × 8）</span>
</div>
<p>歩掛りは、公共の建物の清掃を見積もるときに使う数字で、100㎡を1回掃除するのに何人いるかです。1人は1日8時間として、1時間あたりの面積にしています。</p>
<p>例：事務室の日常清掃は歩掛り0.034人なので、100 ÷（0.034 × 8）＝ 367.6… で約370㎡です。</p>
<div class="tbl-wrap"><table>
<thead><tr><th>作業</th><th class="num">歩掛り</th><th class="num">1人1時間</th></tr></thead>
<tbody>
<tr><td>事務室の日常清掃</td><td class="num">0.034人</td><td class="num">約370㎡</td></tr>
<tr><td>廊下の日常清掃</td><td class="num">0.026人</td><td class="num">約480㎡</td></tr>
<tr><td>トイレの日常清掃</td><td class="num">0.254人</td><td class="num">約49㎡</td></tr>
<tr><td>事務室の床洗浄</td><td class="num">0.330人</td><td class="num">約38㎡</td></tr>
<tr><td>トイレの床洗浄</td><td class="num">0.744人</td><td class="num">約17㎡</td></tr>
</tbody>
</table></div>
<p>日常清掃は床の掃き拭きとごみ集めなど、床洗浄は定期清掃の表面洗浄です。歩掛りは、清掃員の経験ごとに分かれている数字を足したものです。</p>
<p>清掃の業界団体からは、床の日常清掃の歩掛りは低すぎて、平均で約3.59倍にする必要があるという意見が出ています。現場の実績がわかるときは、その数字を入れてください。</p>
<p>出典：日常清掃は<a href="${SRC_DAILY}">札幌市の清掃業務の積算</a>、床洗浄は<a href="${SRC_REGULAR}">国土交通省の清掃の積算要領の検討資料</a>、業界団体の意見は<a href="${SRC_VIEW}">国土交通省の検討課題の資料</a>です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '清掃の作業時間の計算｜面積と人数から何時間かかるか',
    description:
      '清掃の作業時間を、面積と人数から計算します。1人1時間に100㎡掃除できるなら、600㎡を2人で3時間です。決めた時間で終えるのに何人いるかも出せて、事務室・廊下・トイレ・床洗浄は速さの目安が入ります。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '清掃の面積・人数・時間のうち2つと作業の速さから、残りを出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['seisou.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
