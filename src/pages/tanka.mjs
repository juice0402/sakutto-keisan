import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';

const tool = toolBySlug('tanka');
const path = '/tanka/';
const KEYS = ['a', 'b', 'c'];
const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', '個', '枚', '本', 'm'];

const numInput = (id, placeholder, extra = '') =>
  `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"${extra}>`;

const field = (id, label, unit, placeholder, attrs = '') =>
  `<div class="field" id="f-${id}"${attrs}><label for="${id}">${label}</label><div class="input">${numInput(id, placeholder)}<span class="unit">${unit}</span></div></div>`;

// 量の欄：単位は入力欄の右で選ぶ（iPhone では大きな選択画面が出る）
const qtyField = (k) =>
  `<div class="field" id="f-qty-${k}"><label for="qty-${k}">量</label><div class="input input-sel">${numInput(`qty-${k}`, k === 'b' ? '1000' : k === 'c' ? '1500' : '500')}<select id="unit-${k}" class="unit-select" aria-label="${k.toUpperCase()}の量の単位">${UNIT_OPTIONS.map((u) => `<option value="${u}"${u === 'g' ? ' selected' : ''}>${u}</option>`).join('')}</select></div></div>`;

const item = (k) => `<div class="item" id="item-${k}"${k === 'c' ? ' hidden' : ''}>
  <p class="item-k" aria-hidden="true">${k.toUpperCase()}</p>
  <div class="pair" role="group" aria-label="商品${k.toUpperCase()}">
    ${field(`price-${k}`, '値段', '円', k === 'a' ? '198' : k === 'b' ? '298' : '450')}
    ${qtyField(k)}
  </div>
  <div class="pair extra" hidden>
    ${field(`packs-${k}`, '入り数', '個', '1', ' data-extra="packs" hidden')}
    ${field(`disc-${k}`, '割引シール', '％オフ', '20', ' data-extra="disc" hidden')}
  </div>
</div>`;

const miniTag = (k) =>
  `<div class="cmp-item" id="ti-${k}"${k === 'c' ? ' hidden' : ''}><p class="cmp-label" id="tl-${k}">${k.toUpperCase()}</p><div class="tag-wrap tag-mini"><div class="pricetag"><p class="tag-was" id="tb-${k}">100gあたり</p><p class="tag-price"><span id="tp-${k}">？</span><small>円</small></p><p class="tag-save" id="ts-${k}">入力してください</p></div></div></div>`;

const bar = (k) =>
  `<div class="bar-row" id="br-${k}"${k === 'c' ? ' hidden' : ''}><span class="bar-k">${k.toUpperCase()}</span><span class="bar-track"><span class="bar-fill" id="bf-${k}"></span></span><span class="bar-v" id="bv-${k}"></span></div>`;

const ICONS = {
  add: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="M19.5 9v6M16.5 12h6"/>',
  packs: '<rect x="3" y="9" width="5" height="11" rx="1.5"/><rect x="9.5" y="9" width="5" height="11" rx="1.5"/><rect x="16" y="9" width="5" height="11" rx="1.5"/><path d="M5.5 9V6.5M12 9V6.5M18.5 9V6.5"/>',
  disc: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1.5"/><path d="m9.5 16.5 5-5"/>',
};
const toolBtn = (id, iconKey, label) =>
  `<button type="button" class="tool-btn" id="${id}" aria-pressed="false">${icon(ICONS[iconKey])}<span>${label}</span></button>`;

const FAQS = [
  {
    q: '「単価」と「実質単価」はどう違いますか？',
    a: '<p>単価は「1つあたり・1gあたりの値段」のことです。このツールでは、入り数（まとめ買い）や割引シールも入れて、実際に払う金額で量あたりの値段を出すので「実質単価」と呼んでいます。</p>',
  },
  {
    q: 'gとkg、mlとLがまざっていても大丈夫ですか？',
    a: '<p>大丈夫です。それぞれの単位を選べば、自動でそろえてくらべます（1kg＝1,000g、1L＝1,000ml）。</p>',
  },
  {
    q: '重さ（g）と量（ml）はくらべられますか？',
    a: '<p>くらべられません。中身によって1mlあたりの重さが違うためです。商品に書いてある単位どうしでくらべてください。</p>',
  },
  {
    q: '大きいサイズのほうが、いつもおトクですか？',
    a: '<p>多くはそうですが、セールや割引シールで小さいサイズのほうが安いこともあります。また、使い切れずに捨ててしまうと結局は損なので、使い切れる量かも考えて選びましょう。</p>',
  },
  {
    q: 'ポイント還元も入れられますか？',
    a: '<p>ポイントは入れていません。ポイントも含めて考えたいときは、値段からポイント分を引いた金額を入れてください。割引シールは「割引シール」ボタンで％を入れられます。</p>',
  },
  {
    q: '入力した数字はどこかに送られますか？',
    a: '<p>送られません。計算はお使いの端末（ブラウザ）の中だけで行い、入力した数字を保存することもありません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">値段と内容量を入れるだけ。100gあたりの値段で、どっちが得かすぐわかります。</p>

<div class="calc" id="calc">
  <div class="field-head calc-head"><p class="label">くらべる商品</p><button type="button" class="clear-btn" id="clear">クリア</button></div>
  ${KEYS.map(item).join('\n')}

  <div class="tag-stage" aria-live="polite">
    <div class="cmp" id="cmp">${KEYS.map(miniTag).join('')}</div>
    <p class="cmp-verdict" id="verdict">AとBの値段と量を入れると、どっちが得かわかります</p>
    <div class="bars" id="bars" hidden><p class="bars-title" id="bars-title">100gあたりの値段</p>${KEYS.map(bar).join('')}</div>
    <p class="tag-note" id="t-note" hidden></p>
  </div>

  <div class="calc-tools">
    ${toolBtn('to-c', 'add', '3つめを追加')}
    ${toolBtn('to-packs', 'packs', '入り数')}
    ${toolBtn('to-disc', 'disc', '割引シール')}
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li>商品Aと商品Bの<strong>値段</strong>と<strong>量</strong>を入れます。量の単位（g・kg・ml・L・個など）は、量の欄の右でえらびます。</li>
<li>すぐに<strong>100gあたり（100mlあたり・1個あたり）の値段</strong>が値札で並び、安いほうに「おトク！」が付きます。</li>
<li>下の棒グラフで、どれくらい違うかもひと目でわかります。</li>
</ol>
<p>値札の下の3つのボタンで、こんなときにも使えます。</p>
<ul>
<li><strong>3つめを追加</strong>：S・M・Lサイズのように3つをくらべる。</li>
<li><strong>入り数</strong>：「350ml × 6本」のようなまとめ売り。量に1本分、入り数に6を入れます。</li>
<li><strong>割引シール</strong>：「20％引き」のシールが貼ってある商品。割引後の値段でくらべます。</li>
</ul>`,
)}

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>100gあたりの値段 ＝ 値段 ÷ 量（g）× 100</span>
<span>1個あたりの値段 ＝ 値段 ÷ 個数</span>
<span>入り数があるとき：量 ＝ 1つ分の量 × 入り数</span>
</div>
<p>たとえば500gで198円なら、198 ÷ 500 × 100 ＝ <strong>39.6円</strong>（100gあたり）。1kgで298円なら、298 ÷ 1,000 × 100 ＝ <strong>29.8円</strong>なので、1kgのほうがおトクです。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>くらべるもの</th><th class="num">A</th><th class="num">B</th><th>おトク</th></tr></thead>
<tbody>
<tr><td>お肉 500g 198円 / 1kg 298円</td><td class="num">39.6円</td><td class="num">29.8円</td><td>B（100gあたり）</td></tr>
<tr><td>牛乳 1L 248円 / 500ml 138円</td><td class="num">24.8円</td><td class="num">27.6円</td><td>A（100mlあたり）</td></tr>
<tr><td>350ml×6本 1,180円 / 350ml 208円</td><td class="num">56.2円</td><td class="num">59.4円</td><td>A（100mlあたり）</td></tr>
<tr><td>ティッシュ 5箱 398円 / 3箱 258円</td><td class="num">79.6円</td><td class="num">86円</td><td>A（1箱あたり）</td></tr>
</tbody>
</table></div>
<p class="note">1kg 298円に「20％引き」のシールが貼ってあれば、238円（1円未満切り捨て）なので100gあたり23.8円です。</p>`,
)}

${section(
  'tips',
  'スーパーでくらべるときのコツ',
  `<ul>
<li><strong>単位をそろえる</strong>：「1kg」と「500g」、「1.5L」と「500ml」は、そのまま値段をくらべても意味がありません。</li>
<li><strong>棚の値札の「100gあたり」</strong>：お店によっては値札に小さく書いてあります。書いていないときや、割引シールが貼ってあるときにこのツールが便利です。</li>
<li><strong>使い切れる量か</strong>：単価が安くても、余らせて捨てると損です。賞味期限も考えて選びましょう。</li>
</ul>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '実質単価｜どっちが得？100gあたりの値段をくらべる計算',
    description:
      'スーパーで「どっちが得？」をすぐ判断。値段と内容量を入れるだけで、100gあたり・100mlあたり・1個あたりの値段をくらべます。g・kg・ml・Lの単位ちがい、まとめ買い（入り数）、割引シールにも対応。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '値段と内容量から100gあたり・100mlあたり・1個あたりの値段を出して、どっちが得かをくらべる計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['tanka.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
