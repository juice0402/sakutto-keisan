import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { DILUTE_TILES } from '../lib/kishaku.mjs';

const tool = toolBySlug('kishaku');
const path = '/kishaku/';

const numInput = (id, placeholder) =>
  `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}">`;

// 量の欄：単位（ml・L）は入力欄の右でえらぶ
const amountField = (id, label, placeholder, attrs = '') =>
  `<div class="field" id="f-${id}"${attrs}><label for="${id}" id="l-${id}">${label}</label><div class="input input-sel">${numInput(id, placeholder)}<select id="unit-${id}" class="unit-select" aria-label="${label}の単位"><option value="ml" selected>ml</option><option value="L">L</option></select></div></div>`;

const pctField = (id, label, placeholder) =>
  `<div class="field" id="f-${id}"><label for="${id}">${label}</label><div class="input">${numInput(id, placeholder)}<span class="unit">％</span></div></div>`;

// 何倍のタイル：「10倍」と「1：9」（原液：水）を両方書く。最後のマスは自分で入力
const TILES = `<div class="tiles" role="group" aria-labelledby="l-ratio">${DILUTE_TILES.map(
  (v) => `<button type="button" class="tile" data-ratio="${v}" aria-pressed="false"><b>${v}倍</b><small>1：${(v - 1).toLocaleString('ja-JP')}</small></button>`,
).join('')}<div class="tile tile-input" id="f-ratio"><div class="tile-box"><input id="ratio" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="?" aria-describedby="l-ratio"><span>倍</span></div><label for="ratio">その他（倍）</label></div></div>`;

const ICONS = {
  conc: '<path d="M12 3.5c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0c0-2.9 2-5.5 5-9.5Z"/><path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  water: '<path d="M5 9h11a3 3 0 0 1 3 3v1h-3v-1H5Z"/><path d="M9 9V6h4v3M7 6h8"/><path d="M17.5 16.5c.8 1.1 1.3 1.8 1.3 2.5a1.3 1.3 0 0 1-2.6 0c0-.7.5-1.4 1.3-2.5Z"/>',
  pct: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M19 5 5 19"/>',
};
const toolBtn = (id, iconKey, label) =>
  `<button type="button" class="tool-btn" id="${id}" aria-pressed="false">${icon(ICONS[iconKey])}<span>${label}</span></button>`;

const FAQS = [
  {
    q: '「100倍に薄める」は、原液1に水100ですか？',
    a: '<p>このツールでは、原液に水を足して、<strong>全体の量が原液の100倍</strong>になるように計算します（原液1：水99）。たとえば500mlの100倍液なら、原液5mlに水495mlです。</p><p>製品に「水1Lに対して10ml」のように書いてあるときは、その表示どおりに作ってください。</p>',
  },
  {
    q: '濃度（％）から薄め方を知りたいときは？',
    a: '<p>「％で作る」を押して、原液の濃度と作りたい濃度を入れてください。倍率は「原液の濃度 ÷ 作りたい濃度」で、たとえば6％の原液から0.05％の液を作るなら120倍（原液1：水119）です。</p>',
  },
  {
    q: '「3倍濃縮」のめんつゆは、どう薄めますか？',
    a: '<p>「3倍」のマスをえらぶと、つゆ1：水2の量が出ます。かけつゆ・つけつゆなど、使いみちによって薄め方が違うことがあるので、ボトルの表示も確かめてください。</p>',
  },
  {
    q: '原液が少なすぎて量れません',
    a: '<p>1,000倍のように薄める倍率が大きいと、原液はごく少しになります。作る量をふやすと原液も量りやすくなります。このツールでは、小さじ¼（約1.25ml）から大さじ3（45ml）までのときに、計量スプーンでの目安も出します（小さじ1＝5ml、大さじ1＝15ml）。</p>',
  },
  {
    q: '入力した数字はどこかに送られますか？',
    a: '<p>送られません。計算はお使いの端末（ブラウザ）の中だけで行い、入力した数字を保存することもありません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">何倍に薄めるかと、作りたい量を入れるだけ。原液と水の量が、ボトルの絵ですぐわかります。</p>

<div class="calc" id="calc">
  <div class="field" id="f-tiles">
    <div class="field-head calc-head"><p class="label" id="l-ratio">何倍に薄める？</p><button type="button" class="clear-btn" id="clear">クリア</button></div>
    ${TILES}
    <p class="field-help">◯倍＝原液に水を足して、全体を原液の◯倍の量にします（10倍なら 原液1：水9）。</p>
  </div>
  <div class="pct-fields" id="pct-fields" hidden>
    ${pctField('src', '原液の濃度', '6')}
    ${pctField('target', '作りたい濃度', '0.05')}
  </div>
  ${amountField('amount', '作りたい量', '500')}

  <div class="mix-stage" aria-live="polite">
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
      <p class="mix-row is-conc"><span class="mix-k">原液</span><span class="mix-v" id="r-conc">？</span><small class="mix-sub" id="r-conc-sub"></small></p>
      <p class="mix-row is-water"><span class="mix-k">水</span><span class="mix-v" id="r-water">？</span></p>
      <p class="mix-total"><span id="r-total">倍率と量を入れると、原液と水の量が出ます</span><span id="r-ratio"></span></p>
    </div>
  </div>
  <p class="tag-note" id="r-note" hidden></p>

  <div class="calc-tools">
    ${toolBtn('to-conc', 'conc', '原液の量から')}
    ${toolBtn('to-water', 'water', '水の量から')}
    ${toolBtn('to-pct', 'pct', '％で作る')}
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li><strong>何倍に薄める？</strong>のマスをえらびます（ないときは「その他」に数字を入れます）。</li>
<li><strong>作りたい量</strong>を入れます。単位（ml・L）は欄の右でえらびます。</li>
<li>すぐに<strong>原液と水の量</strong>が、ボトルの絵と数字で出ます。原液が少ないときは、計量スプーンでの目安（小さじ・大さじ）も出します。</li>
</ol>
<p>下の3つのボタンで、こんなときにも使えます（もう一度押すと元にもどります）。</p>
<ul>
<li><strong>原液の量から</strong>：「原液が10mlある」ときに、足す水の量と、できる量を出します。</li>
<li><strong>水の量から</strong>：「バケツの水2Lに入れたい」ときに、入れる原液の量を出します。</li>
<li><strong>％で作る</strong>：「6％の原液から0.05％の液を作りたい」のように、濃度から何倍に薄めるかを出します。</li>
</ul>`,
)}

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>原液の量 ＝ 作りたい量 ÷ 倍率</span>
<span>水の量 ＝ 作りたい量 − 原液の量</span>
<span>水の量から：原液の量 ＝ 水の量 ÷（倍率 − 1）</span>
<span>濃度から：倍率 ＝ 原液の濃度 ÷ 作りたい濃度</span>
</div>
<p>たとえば500mlを100倍に薄めるなら、500 ÷ 100 ＝ <strong>原液5ml</strong>、500 − 5 ＝ <strong>水495ml</strong>です。</p>
<p class="note">量は、10mlより少ないときは小数第1位まで、それ以上は整数で出します。1,000ml（1L）からは L で出します。</p>`,
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
<tr><td>水2Lで1,000倍</td><td class="num">2ml</td><td class="num">2L</td><td class="num">2L</td></tr>
<tr><td>6％を0.05％に（120倍）・1L</td><td class="num">8.3ml</td><td class="num">992ml</td><td class="num">1L</td></tr>
</tbody>
</table></div>
<p class="note">水2Lで1,000倍のとき、原液は 2,000 ÷ 999 ＝ 約2.0ml、できる量は約2,002mlです。</p>`,
)}

${section(
  'tips',
  '薄めるときのコツ',
  `<ul>
<li><strong>製品の表示を先に確かめる</strong>：「水1Lに対して10ml」のように、製品ごとに決まった作り方があるときは、その表示に従ってください。</li>
<li><strong>少ない原液は計量スプーンで</strong>：小さじ1は5ml、大さじ1は15mlです。</li>
<li><strong>まぜてはいけない組み合わせに注意</strong>：「まぜるな危険」と書かれた塩素系の製品と酸性タイプの製品は、いっしょに使わないでください。</li>
</ul>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '希釈率｜何倍に薄める？原液と水の量を計算',
    description:
      '「◯倍に薄める」ときの原液と水の量をすぐ計算。作りたい量・原液の量・水の量のどれからでも計算でき、濃度（％）からの薄め方にも対応。洗剤・漂白剤・めんつゆ・液体肥料などに。原液と水の量をボトルの絵で表示します。',
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
