// 実質単価の2つのページ：実質単価の比較（値段と量。もとのページ）と、まとめ買いの単価比較（入り数・割引シールも。その下のページ）
// 入り数と割引シールは実質単価の比較の下のボタンで欄を出していたが、商品1つに欄が4つになって窮屈なので、
// 10/21 しょーくんの「窮屈なものはメインとサブに」で別のページにした。動きは src/client/tanka.js 1つで、#calc の data-start と、入り数の段があるかで分ける
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']; // 実質単価の比較は最初 A〜D の4つ、「＋1つ追加」で H（8つ）まで
const MATOME_KEYS = KEYS.slice(0, 4); // まとめ買いは最初 A・B の2つ、D（4つ）まで
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

// 商品の行。まとめ買いのページ（extra）は、値段・量の下に入り数と割引シールの段
const item = (k, i, first, extra) => `<div class="item${extra ? ' is-set' : ''}" id="item-${k}"${i >= first ? ' hidden' : ''}>
  <p class="item-k" aria-hidden="true">${k.toUpperCase()}</p>
  <div class="pair" role="group" aria-label="商品${k.toUpperCase()}">
    ${cell(`price-${k}`, `${k.toUpperCase()}の値段（円）`, '', EXAMPLES[k][0])}
    ${qtyCell(k)}
  </div>${extra ? `
  <div class="pair extra">
    ${cell(`packs-${k}`, `${k.toUpperCase()}の入り数`, '個入り', '1')}
    ${cell(`disc-${k}`, `${k.toUpperCase()}の割引シール`, '％オフ', '0')}
  </div>` : ''}
</div>`;

const toolBtn = (id, label) => `<button type="button" class="tool-btn" id="${id}" aria-pressed="false"><span>${label}</span></button>`;

const FAQS = [
  {
    q: '「単価」と「実質単価」はどう違いますか？',
    a: '<p>入り数や割引シールも入れて、実際に払う金額から出した単価を「実質単価」と呼んでいます。入り数と割引シールは<a href="/matomegai/">まとめ買いの単価比較</a>で入れられます。</p>',
  },
  {
    q: 'gとkg、mlとLがまざっていても大丈夫ですか？',
    a: '<p>大丈夫です。単位をそろえてからくらべます。</p>',
  },
  {
    q: '重さ（g）と量（ml）はくらべられますか？',
    a: '<p>くらべられません。中身によって1mlの重さがちがうからです。</p>',
  },
  {
    q: 'ポイント還元も入れられますか？',
    a: '<p>ポイントの欄はありません。値段からポイント分を引いて入れてください。</p>',
  },
];

const MATOME_FAQS = [
  {
    q: '入り数には何を入れますか？',
    a: '<p>6本入りなら6です。量の欄には、1本の量を入れてください。</p>',
  },
  {
    q: '量がわからないときは？',
    a: '<p>量を空にして入り数だけ入れると、1個あたりの値段でくらべます。</p>',
  },
  {
    q: '割引シールはどう入れますか？',
    a: '<p>「20％引き」のシールなら20と入れます。割引後の値段で単価を出し、1円未満は切り捨てです。</p>',
  },
  {
    q: '「50円引き」のシールは？',
    a: '<p>値段から50円を引いて、値段の欄に入れてください。</p>',
  },
];

// 結果：いちばんおトクの値札、2位との差、安い順の棒グラフ
const RESULT = `<div class="tag-stage" aria-live="polite">
    <div class="tag-wrap is-empty" id="tag">
      <div class="pricetag">
        <p class="tag-was" id="t-base">100gあたり</p>
        <p class="tag-price"><span id="t-price">？</span><small>円</small></p>
        <p class="tag-save" id="t-sub">2つ以上入れると、安い順に並びます</p>
      </div>
      <p class="tag-badge" id="t-badge" hidden><span>1位</span><small>おトク</small></p>
    </div>
    <p class="cmp-verdict" id="verdict" hidden></p>
    <div class="rank-box" id="rank-box" hidden><p class="bars-title" id="rank-title">100gあたりの値段（安い順）</p><ol class="rank" id="rank"></ol></div>
    <p class="tag-note" id="t-note" hidden></p>
  </div>`;

const HEAD = `<div class="cols"><span></span><span aria-hidden="true">値段（円）</span><span class="cols-r"><span aria-hidden="true">量</span><button type="button" class="clear-btn" id="clear">クリア</button></span></div>`;
const NOSCRIPT = '<noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>';

function renderMain() {
  const tool = toolBySlug('tanka');
  const path = '/tanka/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">100gあたりの値段で、安い順に並べます。</p>

<div class="calc" id="calc" data-start="4">
  ${HEAD}
  ${KEYS.map((k, i) => item(k, i, 4, false)).join('\n')}

  ${RESULT}

  <div class="calc-tools">
    ${toolBtn('to-add', '＋1つ追加')}
    <a class="tool-btn tool-link span-2" href="/matomegai/">入り数・割引シール</a>
  </div>
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>100gあたりの値段 ＝ 値段 ÷ 量（g）× 100</span>
<span>1個あたりの値段 ＝ 値段 ÷ 個数</span>
</div>
<p>例：500gで198円なら、198 ÷ 500 × 100 ＝ 39.6円。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>くらべるもの</th><th class="num">A</th><th class="num">B</th><th>安い</th></tr></thead>
<tbody>
<tr><td>お肉 500g 198円 / 1kg 298円</td><td class="num">39.6円</td><td class="num">29.8円</td><td>B（100gあたり）</td></tr>
<tr><td>牛乳 1L 248円 / 500ml 138円</td><td class="num">24.8円</td><td class="num">27.6円</td><td>A（100mlあたり）</td></tr>
<tr><td>お米 5kg 2,480円 / 2kg 1,080円</td><td class="num">49.6円</td><td class="num">54円</td><td>A（100gあたり）</td></tr>
</tbody>
</table></div>
<p>6本入りや割引シールの商品は、<a href="/matomegai/">まとめ買いの単価比較</a>でくらべられます。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '実質単価の比較｜どっちが得？100gあたりの値段を計算',
    description:
      '値段と内容量を入れて、100gあたり・100mlあたり・1個あたりの値段をくらべます。gとkg、mlとLの単位ちがいにも対応。スーパーでどちらが安いか迷ったときに。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '値段と内容量から100gあたり・100mlあたり・1個あたりの値段を出し、安い順に並べる計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['tanka.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

function renderMatome() {
  const tool = toolBySlug('matomegai');
  const parent = toolBySlug('tanka');
  const path = '/matomegai/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">まとめ売りや割引シールの単価をくらべます。</p>

<div class="calc" id="calc" data-start="2">
  ${HEAD}
  ${MATOME_KEYS.map((k, i) => item(k, i, 2, true)).join('\n')}

  ${RESULT}

  <div class="calc-tools">
    ${toolBtn('to-add', '＋1つ追加')}
    <a class="tool-btn tool-link span-2" href="/tanka/">値段と量だけ</a>
  </div>
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>払う値段 ＝ 値段 ×（100 − 割引シール）÷ 100</span>
<span>100mlあたり ＝ 払う値段 ÷（1本の量 × 入り数）× 100</span>
</div>
<p>例：350mlの6本入りが1,180円なら、1,180 ÷ 2,100 × 100 ＝ 56.2円。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>くらべるもの</th><th class="num">A</th><th class="num">B</th><th>安い</th></tr></thead>
<tbody>
<tr><td>350ml×6本 1,180円 / 350ml 208円</td><td class="num">56.2円</td><td class="num">59.4円</td><td>A（100mlあたり）</td></tr>
<tr><td>ティッシュ 5箱 398円 / 3箱 258円</td><td class="num">79.6円</td><td class="num">86円</td><td>A（1箱あたり）</td></tr>
<tr><td>卵 10個 248円 / 6個 168円</td><td class="num">24.8円</td><td class="num">28円</td><td>A（1個あたり）</td></tr>
<tr><td>1kg 298円の20％引き / 500g 128円</td><td class="num">23.8円</td><td class="num">25.6円</td><td>A（100gあたり）</td></tr>
</tbody>
</table></div>
<p>1kg 298円の20％引きは、1円未満を切り捨てて238円です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(MATOME_FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: 'まとめ買いの単価比較｜6本入り・割引シールでどっちが得か',
    description:
      'まとめ売りの入り数や割引シールを入れて、1本あたり・100mlあたりの値段をくらべます。6本入りとバラ、20％引きの商品とふつうの商品のどちらが安いかがわかります。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: `/${parent.slug}/` },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '値段・内容量・入り数・割引シールから、まとめ売りの商品の単価をくらべる計算ツール。'), faqLd(MATOME_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['tanka.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function render() {
  return [renderMain(), renderMatome()];
}
