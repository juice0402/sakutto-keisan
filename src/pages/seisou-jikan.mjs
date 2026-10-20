// 清掃の作業時間の計算：作業の速さ（1人1時間あたりの面積）と、面積・人数・時間のうち2つから、残りの1つ
// 速さは作業のマス（公共の清掃の積算の歩掛りから出した目安）からえらぶか、最後のマスに自分で入れる
// （10/20 しょーくんの判断。はじめは自分で入れるだけにしたが「相場すらわからない」ので、目安のマスを足した）
// 結果は、床を人数で分けた絵。ページに載せる計算例は tests/seisou.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { SEISOU_WORKS } from '../lib/seisou.mjs';

// 歩掛りの出典
const SRC_DAILY = 'https://www.city.sapporo.jp/kanzai/keiyaku/ippan-syuyaku/r2-zenki/documents/nyusatusetumei_bekki4-seiso.pdf';
const SRC_REGULAR = 'https://www.mlit.go.jp/gobuild/content/001600832.pdf';
const SRC_VIEW = 'https://www.mlit.go.jp/gobuild/content/001601093.pdf';

// 作業のマス（最後のマスは自分で入れる）
const TILES = `<div class="tiles tiles-4" role="group" aria-labelledby="l-work">${SEISOU_WORKS.map(
  (w) => `<button type="button" class="tile tile-word" data-speed="${w.speed}" aria-pressed="false"><b>${w.name}</b><small>${w.speed}㎡</small></button>`,
).join('')}<div class="tile tile-input" id="f-speed"><div class="tile-box"><input id="speed" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="?" aria-describedby="l-work"><span>㎡</span></div><label for="speed">その他</label></div></div>`;

const tool = toolBySlug('seisou-jikan');
const path = '/seisou-jikan/';

const FAQS = [
  {
    q: '「その他」の速さは、どうやって決めますか？',
    a: '<p>ふだんの作業の実績から出せます。2人で300㎡を1時間30分で終えたなら、300 ÷ 2 ÷ 1.5 で1人1時間100㎡です。</p>',
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
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">面積と人数から、清掃の時間を計算します。</p>

<div class="calc" id="calc">
  <div class="field-head calc-head"><p class="label" id="l-work">作業をえらぶ（1人1時間あたり）</p><button type="button" class="clear-btn" id="clear">クリア</button></div>
  <div class="field" id="f-tiles">${TILES}</div>
  <div class="box-rows">
    <div class="pair">${boxField('area', '面積', '㎡', '600')}${boxField('people', '人数', '人', '2')}</div>
    ${boxField('hours', '作業時間', '時間', '3')}
  </div>
  <div class="box-result" aria-live="polite">
    <p class="fx-cap" id="r-cap">かかる時間</p>
    <p class="fx-big" id="r-big"><span id="r-num">？</span></p>
    <div class="floor-plan" aria-hidden="true"><div class="floor-strips" id="s-floor"></div><p class="rb-legend"><span id="s-left">1人あたり</span><span id="s-right"></span></p></div>
    <p class="mix-foot"><span id="r-foot">作業をえらんでください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>時間 ＝ 面積 ÷ 速さ ÷ 人数</span>
<span>人数 ＝ 面積 ÷ 速さ ÷ 時間</span>
</div>
<p>速さは、1人が1時間に掃除できる面積です。例：速さ100㎡で600㎡を2人なら、600 ÷ 100 ÷ 2 ＝ 3時間です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
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
<p>清掃の業界団体からは、床の日常清掃の歩掛りは低すぎて、平均で約3.59倍にする必要があるという意見が出ています。現場の実績がわかるときは、「その他」に入れてください。</p>
<p>出典：日常清掃は<a href="${SRC_DAILY}">札幌市の清掃業務の積算</a>、床洗浄は<a href="${SRC_REGULAR}">国土交通省の清掃の積算要領の検討資料</a>、業界団体の意見は<a href="${SRC_VIEW}">国土交通省の検討課題の資料</a>です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '清掃の作業時間の計算｜面積と人数から何時間かかるか',
    description:
      '清掃の作業時間を、面積と人数から計算します。1人1時間あたりに掃除できる面積を入れると、かかる時間がわかります。決めた時間で終えるのに何人いるかも出せます。',
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
