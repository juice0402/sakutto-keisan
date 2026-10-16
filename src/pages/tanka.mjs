import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';

const tool = toolBySlug('tanka');
const path = '/tanka/';
const KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']; // 最初は A〜D の4つ、「＋1つ追加」で H（8つ）まで
const FIRST = 4;
// 入力欄のうすい例（どの行にも入れて見た目をそろえる）[値段, 量]
const EXAMPLES = { a: ['198', '500'], b: ['298', '1000'], c: ['128', '300'], d: ['398', '1500'], e: ['158', '400'], f: ['498', '2000'], g: ['88', '200'], h: ['598', '3000'] };
const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', '個', '枚', '本', 'm', 'なし'];

const numInput = (id, placeholder, extra = '') =>
  `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"${extra}>`;

// 入力は表の形：見出し（値段・量）は1行だけ。各欄のラベルは読み上げ用に隠して付ける
const cell = (id, label, unit, placeholder) =>
  `<div class="field" id="f-${id}"><label class="sr-only" for="${id}">${label}</label><div class="input">${numInput(id, placeholder)}${unit ? `<span class="unit">${unit}</span>` : ''}</div></div>`;

// 量の欄：単位は入力欄の右で選ぶ（iPhone では大きな選択画面が出る）
const qtyCell = (k) =>
  `<div class="field" id="f-qty-${k}"><label class="sr-only" for="qty-${k}">${k.toUpperCase()}の量</label><div class="input input-sel">${numInput(`qty-${k}`, EXAMPLES[k][1])}<select id="unit-${k}" class="unit-select" aria-label="${k.toUpperCase()}の量の単位">${UNIT_OPTIONS.map((u) => `<option value="${u}"${u === 'g' ? ' selected' : ''}>${u}</option>`).join('')}</select></div></div>`;

const item = (k, i) => `<div class="item" id="item-${k}"${i >= FIRST ? ' hidden' : ''}>
  <p class="item-k" aria-hidden="true">${k.toUpperCase()}</p>
  <div class="pair" role="group" aria-label="商品${k.toUpperCase()}">
    ${cell(`price-${k}`, `${k.toUpperCase()}の値段（円）`, '', EXAMPLES[k][0])}
    ${qtyCell(k)}
  </div>
  <div class="pair extra" hidden>
    ${cell(`packs-${k}`, `${k.toUpperCase()}の入り数`, '個入り', '1')}
    ${cell(`disc-${k}`, `${k.toUpperCase()}の割引シール`, '％オフ', '0')}
  </div>
</div>`;

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
<p class="lead">値段と内容量を入れるだけ。100gあたりの値段で、どれがいちばん得かすぐわかります。</p>

<div class="calc" id="calc">
  <div class="field-head calc-head"><p class="label">くらべる商品</p><button type="button" class="clear-btn" id="clear">クリア</button></div>
  <div class="cols" aria-hidden="true"><span></span><span>値段（円）</span><span>量</span></div>
  ${KEYS.map(item).join('\n')}

  <div class="tag-stage" aria-live="polite">
    <p class="win-label" id="t-label" hidden></p>
    <div class="tag-wrap is-empty" id="tag">
      <div class="pricetag">
        <p class="tag-was" id="t-base">100gあたり</p>
        <p class="tag-price"><span id="t-price">？</span><small>円</small></p>
        <p class="tag-save" id="t-sub">値段と量を入れると、いちばんおトクな商品がわかります</p>
      </div>
      <p class="tag-badge" id="t-badge" hidden><span>1位</span><small>おトク</small></p>
    </div>
    <p class="cmp-verdict" id="verdict" hidden></p>
    <div class="rank-box" id="rank-box" hidden><p class="bars-title" id="rank-title">100gあたりの値段（安い順）</p><ol class="rank" id="rank"></ol></div>
    <p class="tag-note" id="t-note" hidden></p>
  </div>

  <div class="calc-tools">
    ${toolBtn('to-add', 'add', '＋1つ追加')}
    ${toolBtn('to-packs', 'packs', '入り数')}
    ${toolBtn('to-disc', 'disc', '割引シール')}
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li>くらべたい商品の<strong>値段</strong>と<strong>量</strong>を、A・B・C…の行に入れます（最初は4つ。使わない行は空のままでOK）。量の単位（g・kg・ml・L・個など）は、量の欄の右でえらびます。単位をえらばずに値段と数量だけでくらべたいときは「なし」にします。</li>
<li>すぐに<strong>いちばんおトクな商品</strong>が値札で出て、<strong>100gあたり（100mlあたり・1個あたり）の値段</strong>の安い順に並びます。</li>
<li>棒グラフで、どれくらい違うかもひと目でわかります。</li>
</ol>
<p>値札の下の3つのボタンで、こんなときにも使えます。</p>
<ul>
<li><strong>＋1つ追加</strong>：5つ以上くらべたいとき（8つまで）。</li>
<li><strong>入り数</strong>：「350ml × 6本」のようなまとめ売り。量に1本分、入り数に6を入れます。量を空にして入り数だけ入れると、値段と個数で「1個あたり」をくらべます。</li>
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
<p>たとえば500gで198円なら、198 ÷ 500 × 100 ＝ <strong>39.6円</strong>（100gあたり）。1kgで298円なら、298 ÷ 1,000 × 100 ＝ <strong>29.8円</strong>なので、1kgのほうがおトクです。</p>
<p class="note">スパイスのように100g（100ml）より少ない商品があるときは、金額が大きくなりすぎないよう<strong>1gあたり（1mlあたり）</strong>でくらべます。</p>`,
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
