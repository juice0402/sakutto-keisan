// 清掃の作業時間の計算：1人1時間あたりの面積（自分で入れる）と、面積・人数・時間のうち2つから、残りの1つ
// 作業の速さは作業の種類や現場で大きく違うので、決まった数字は出さずに自分で入れる（10/20 しょーくんの判断）
// 結果は、床を人数で分けた絵。ページに載せる計算例は tests/seisou.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';

const tool = toolBySlug('seisou-jikan');
const path = '/seisou-jikan/';

const FAQS = [
  {
    q: '1人1時間あたりの面積は、どうやって決めますか？',
    a: '<p>ふだんの作業の実績から出せます。2人で300㎡を1時間30分で終えたなら、300 ÷ 2 ÷ 1.5 で100㎡です。</p>',
  },
  {
    q: '作業の種類で速さは変わりますか？',
    a: '<p>大きく変わります。床の掃除機がけと、床の洗浄やワックスでは、何倍も違います。作業ごとに速さを入れてください。</p>',
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
  <div class="box-rows">
    <div class="box-row-clear">${boxField('speed', '1人1時間あたりの面積', '㎡', '100')}<button type="button" class="clear-btn" id="clear">クリア</button></div>
    <div class="pair">${boxField('area', '面積', '㎡', '600')}${boxField('people', '人数', '人', '2')}</div>
    ${boxField('hours', '作業時間', '時間', '3')}
  </div>
  <div class="box-result" aria-live="polite">
    <p class="fx-cap" id="r-cap">かかる時間</p>
    <p class="fx-big" id="r-big"><span id="r-num">？</span></p>
    <div class="floor-plan" aria-hidden="true"><div class="floor-strips" id="s-floor"></div><p class="rb-legend"><span id="s-left">1人あたり</span><span id="s-right"></span></p></div>
    <p class="mix-foot"><span id="r-foot">1人1時間あたりの面積を入れてください</span></p>
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
<p>速さは、1人1時間あたりに掃除できる面積です。例：速さ100㎡で600㎡を2人なら、600 ÷ 100 ÷ 2 ＝ 3時間です。</p>`,
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
