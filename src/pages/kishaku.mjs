import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { DILUTE_TILES } from '../lib/kishaku.mjs';

const tool = toolBySlug('kishaku');
const path = '/kishaku/';

const numInput = (id, placeholder) =>
  `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}">`;

// 量の欄（できあがり・原液・水）：わかっている欄に1つ入れると、ほかの2つに答えが出る
const amountField = (key, cls, label) =>
  `<div class="field mix-field ${cls}" id="f-${key}"><label for="v-${key}">${label}</label><div class="input">${numInput(`v-${key}`, '？')}<span class="unit">ml</span></div></div>`;

// 何対何：原液［ ］：水［ ］
const partField = (id, label, placeholder) =>
  `<div class="field" id="f-${id}"><label for="${id}">${label}</label><div class="input">${numInput(id, placeholder)}</div></div>`;

// 入力の形をえらぶタブ（3つから1つ）。読み上げの名前（「？：？」→「何対何」）があれば aria-label に
const seg = (labelId, key, items) =>
  `<div class="seg" role="group" aria-labelledby="${labelId}">${items
    .map(([v, text, name], i) => `<button type="button" class="seg-btn" data-${key}="${v}" aria-pressed="${i === 0}"${name ? ` aria-label="${name}"` : ''}>${text}</button>`)
    .join('')}</div>`;

const pctField = (id, label, placeholder) =>
  `<div class="field" id="f-${id}"><label for="${id}">${label}</label><div class="input">${numInput(id, placeholder)}<span class="unit">％</span></div></div>`;

// 何倍のタイル：「10倍」と「1：9」（原液：水）を両方書く。最後のマスは自分で入力。1000倍はせまい画面では字を少し小さく
const TILES = `<div class="tiles" role="group" aria-labelledby="l-ratio">${DILUTE_TILES.map(
  (v) => `<button type="button" class="tile${v >= 1000 ? ' tile-long' : ''}" data-ratio="${v}" aria-pressed="false"><b>${v}倍</b><small>1：${(v - 1).toLocaleString('ja-JP')}</small></button>`,
).join('')}<div class="tile tile-input" id="f-ratio"><div class="tile-box"><input id="ratio" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="?" aria-describedby="l-ratio"><span>倍</span></div><label for="ratio">その他（倍）</label></div></div>`;

const FAQS = [
  {
    q: '「100倍に薄める」は、原液1に水100ですか？',
    a: '<p>このページでは、原液に水を足して、全体を原液の100倍の量にするという意味で計算しています。つまり原液1に水99です。500mlの100倍液なら、原液5mlに水495mlになります。</p><p>製品に「水1Lに10ml」のように書いてあるときは、その表示どおりに作ってください。</p>',
  },
  {
    q: '「1対3で薄める」は何倍ですか？',
    a: '<p>原液1に水3を足すと、全体は原液の4倍になります。つまり4倍に薄めることになります。薄め方の「？：？」をえらんで、1と3を入れると計算できます。</p>',
  },
  {
    q: '濃度（％）から薄め方を知りたいときは？',
    a: '<p>薄め方の「？％」をえらんで、原液の濃度と作りたい濃度を入れてください。倍率は、原液の濃度を作りたい濃度で割った数です。6％の原液から0.05％の液を作るなら120倍で、原液1に水119です。</p>',
  },
  {
    q: '「3倍濃縮」のめんつゆは、どう薄めますか？',
    a: '<p>「3倍」のマスをえらぶと、つゆ1に水2の量が出ます。かけつゆとつけつゆで薄め方がちがう商品もあるので、ボトルの表示も見てください。</p>',
  },
  {
    q: '原液が少なすぎて量れません',
    a: '<p>1,000倍のように倍率が大きいと、原液はほんの少しになります。作る量を増やすと量りやすくなります。原液が小さじ¼から大さじ3のあいだのときは、計量スプーンで量る目安も出します。小さじ1は5ml、大さじ1は15mlです。</p>',
  },
  {
    q: '入力した数字はどこかに送られますか？',
    a: '<p>送られません。計算はこの端末のブラウザの中で行い、入力した数字は保存もしません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">「100倍に薄める」「1対3で薄める」ときに、原液と水をそれぞれ何ml入れればいいかを計算します。</p>

<div class="calc" id="calc">
  <div class="field-head calc-head"><p class="label step" id="l-how"><span class="step-no" aria-hidden="true">1</span>薄め方</p><button type="button" class="clear-btn" id="clear">クリア</button></div>
  ${seg('l-how', 'how', [['times', '？倍', '何倍'], ['parts', '？：？', '何対何'], ['pct', '？％', '何％']])}
  <div class="field" id="f-tiles">
    <p class="sr-only" id="l-ratio">何倍に薄める？</p>
    ${TILES}
  </div>
  <div class="field parts" id="parts-fields" hidden>
    ${partField('pc', '原液', '1')}
    <span class="parts-colon" aria-hidden="true">：</span>
    ${partField('pw', '水', '3')}
  </div>
  <div class="field pct-fields" id="pct-fields" hidden>
    ${pctField('src', '原液の濃度', '6')}
    ${pctField('target', '作りたい濃度', '0.05')}
  </div>

  <p class="label step step-2" id="l-amount"><span class="step-no" aria-hidden="true">2</span>わかっている量を1つ入れる</p>
  <div class="mix-stage" role="group" aria-labelledby="l-amount">
    <div class="bottle" aria-hidden="true">
      <div class="bottle-cap"></div>
      <div class="bottle-neck"></div>
      <div class="bottle-body">
        <div class="liq liq-water" id="b-water"></div>
        <div class="liq liq-conc" id="b-conc"></div>
        <p class="bottle-label" id="b-label">？倍</p>
      </div>
    </div>
    <div class="mix-rows">
      ${amountField('total', 'is-total', 'できあがり')}
      ${amountField('conc', 'is-conc', '原液')}
      ${amountField('water', 'is-water', '水')}
    </div>
    <p class="mix-foot" aria-live="polite"><span id="r-ratio">何倍に薄めるかをえらんでください</span><span id="r-hints"></span><span class="sr-only" id="r-sr"></span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li>薄め方をえらびます。「100倍に薄める」ときは「？倍」でマスを、「原液1：水3」のときは「？：？」で割合を、「6％の原液を0.05％にする」ときは「？％」で濃度を入れます。</li>
<li>わかっている量を、できあがり・原液・水のどれか1つに入れます。量はmlで入れます。1Lは1,000mlです。スプレーボトルに500ml作るならできあがりに、バケツの水2Lにまぜるなら水に入れます。</li>
<li>残りの2つの欄に答えが出ます。原液が少ないときは、計量スプーンで量る目安も出します。</li>
</ol>`,
)}

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>原液の量 ＝ 作りたい量 ÷ 倍率</span>
<span>水の量 ＝ 作りたい量 − 原液の量</span>
<span>水の量から：原液の量 ＝ 水の量 ÷（倍率 − 1）</span>
<span>何対何から：倍率 ＝（原液 ＋ 水）÷ 原液</span>
<span>濃度から：倍率 ＝ 原液の濃度 ÷ 作りたい濃度</span>
</div>
<p>500mlを100倍に薄めるなら、500 ÷ 100 で原液は5ml、水は500 − 5 で495mlです。</p>
<p class="note">量は、10mlより少ないときは小数第1位まで、それ以上は整数で出します。1,000ml以上のときは、Lでの量も添えます。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>作り方</th><th class="num">原液</th><th class="num">水</th><th class="num">できる量</th></tr></thead>
<tbody>
<tr><td>500mlを100倍</td><td class="num">5ml</td><td class="num">495ml</td><td class="num">500ml</td></tr>
<tr><td>1Lを10倍</td><td class="num">100ml</td><td class="num">900ml</td><td class="num">1L</td></tr>
<tr><td>原液10mlを50倍</td><td class="num">10ml</td><td class="num">490ml</td><td class="num">500ml</td></tr>
<tr><td>1対3（4倍）で800ml</td><td class="num">200ml</td><td class="num">600ml</td><td class="num">800ml</td></tr>
<tr><td>水2Lで1,000倍</td><td class="num">2ml</td><td class="num">2L</td><td class="num">2L</td></tr>
<tr><td>6％を0.05％に（120倍）・1L</td><td class="num">8.3ml</td><td class="num">992ml</td><td class="num">1L</td></tr>
</tbody>
</table></div>
<p class="note">水2Lで1,000倍のとき、原液は 2,000 ÷ 999 ＝ 約2.0ml、できる量は約2,002mlです。</p>`,
)}

${section(
  'tips',
  '薄める前に',
  `<p>製品のラベルに「水1Lに10ml」のような作り方が書いてあるときは、その通りに作ってください。少ない原液は計量スプーンで量れます。小さじ1が5ml、大さじ1が15mlです。</p>
<p>「まぜるな危険」と書かれた塩素系の製品と、酸性タイプの製品は、いっしょに使わないでください。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '希釈率の計算｜何倍に薄める？原液と水の量',
    description:
      '「◯倍に薄める」「1対3で薄める」ときの原液と水の量を計算します。できあがりの量、原液の量、水の量のどれからでも計算でき、濃度（％）からの薄め方にも対応。洗剤、漂白剤、めんつゆ、液体肥料などに。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '何倍に薄めるかと作りたい量から、原液と水の量を出す計算ツール。濃度（％）からの計算にも対応。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['kishaku.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
