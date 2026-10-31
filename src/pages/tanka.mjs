// 実質単価の2つのページ：実質単価の比較（値段と量。もとのページ）と、まとめ買いの単価比較（入り数・割引シールも。その下のページ）
// 入り数と割引シールは実質単価の比較の下のボタンで欄を出していたが、商品1つに欄が4つになって窮屈なので、
// 10/21 しょーくんの「窮屈なものはメインとサブに」で別のページにした。動きは src/client/tanka.js 1つで、#calc の data-start と、入り数の段があるかで分ける
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { calcUnitPrice } from '../lib/tanka.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, band, zTag } from '../zukai.mjs';

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

// 入り数と割引シールの欄は、見出しの行がないので、名前を欄の中に書く（読み上げは「Aの入り数」）
const boxCell = (id, k, label, unit, placeholder) =>
  `<div class="field box-field" id="f-${id}"><label for="${id}"><span class="sr-only">${k.toUpperCase()}の</span>${label}</label><div class="input">${numInput(id, placeholder)}<span class="unit">${unit}</span></div></div>`;

// 商品の行。まとめ買いのページ（extra）は、値段・量の下に入り数と割引シールの段
const item = (k, i, first, extra) => `<div class="item${extra ? ' is-set' : ''}" id="item-${k}"${i >= first ? ' hidden' : ''}>
  <p class="item-k" aria-hidden="true">${k.toUpperCase()}</p>
  <div class="pair" role="group" aria-label="商品${k.toUpperCase()}">
    ${cell(`price-${k}`, `${k.toUpperCase()}の値段（円）`, '', EXAMPLES[k][0])}
    ${qtyCell(k)}
  </div>${extra ? `
  <div class="pair extra">
    ${boxCell(`packs-${k}`, k, '入り数', '個入り', '1')}
    ${boxCell(`disc-${k}`, k, '割引シール', '％オフ', '0')}
  </div>` : ''}
</div>`;

// 押すだけのボタン（＋1つ追加）。オン・オフではないので aria-pressed は付けない（付けると site.css がチェック欄の形にする）
const toolBtn = (id, label) => `<button type="button" class="tool-btn" id="${id}"><span>${label}</span></button>`;

// 図解（#70）：値札の式（500gで198円）と、100gあたりの棒（お肉の計算例）
const ZA = calcUnitPrice({ price: 198, qty: 500, unit: 'g' });
const ZB = calcUnitPrice({ price: 298, qty: 1, unit: 'kg' });
const ZUKAI = stair(zTag('500g', `${fmt(ZA.pay)}円`), { b: '÷500×100', small: '量で割る' }, zTag('100gあたり', `${fmt(ZA.per, 1)}円`, true), ['100gあたりの値段 ＝ 値段 ÷ 量（g）× 100', '1個あたりの値段 ＝ 値段 ÷ 個数', `例：500gで198円なら、198 ÷ 500 × 100 ＝ ${fmt(ZA.per, 1)}円。`]);
const zMax = Math.max(ZA.per, ZB.per);
const BARS = `${band({ head: `A 500g 198円`, parts: [{ w: Number(((ZA.per / zMax) * 100).toFixed(1)), text: `${fmt(ZA.per, 1)}円` }], label: `Aの100gあたり${fmt(ZA.per, 1)}円の棒` })}${band({ head: `B 1kg 298円`, parts: [{ w: Number(((ZB.per / zMax) * 100).toFixed(1)), text: `${fmt(ZB.per, 1)}円` }], ans: `100gあたり安いのは → <b>B ${fmt(ZB.per, 1)}円</b>`, label: `Bの100gあたり${fmt(ZB.per, 1)}円の棒。Bのほうが安い` })}`;

// 図解（#81）：まとめ買いの値札の式（350mlの6本入りが1,180円）と、6本入りとバラの100mlあたりの棒。数字は tests/zukai-seikatsu.test.mjs
const ZM = calcUnitPrice({ price: 1180, qty: 350, unit: 'ml', packs: 6 });
const ZN = calcUnitPrice({ price: 208, qty: 350, unit: 'ml' });
export const Z_MATOME = { a: Number(fmt(ZM.per, 1)), b: Number(fmt(ZN.per, 1)), amount: ZM.amount };
const ZUKAI_MATOME = stair(zTag('350ml×6本', `${fmt(ZM.pay)}円`), { b: `÷${fmt(ZM.amount)}×100`, small: '全部の量で割る' }, zTag('100mlあたり', `${fmt(ZM.per, 1)}円`, true), ['払う値段 ＝ 値段 ×（100 − 割引シール）÷ 100', '100mlあたり ＝ 払う値段 ÷（1本の量 × 入り数）× 100', `例：350mlの6本入りが1,180円なら、1,180 ÷ ${fmt(ZM.amount)} × 100 ＝ ${fmt(ZM.per, 1)}円。`]);
const mMax = Math.max(ZM.per, ZN.per);
const BARS_MATOME = `${band({ head: 'A 350ml×6本 1,180円', parts: [{ w: Number(((ZM.per / mMax) * 100).toFixed(1)), text: `${fmt(ZM.per, 1)}円` }], label: `Aの100mlあたり${fmt(ZM.per, 1)}円の棒` })}${band({ head: 'B 350ml 208円', parts: [{ w: Number(((ZN.per / mMax) * 100).toFixed(1)), text: `${fmt(ZN.per, 1)}円` }], ans: `100mlあたり安いのは → <b>A ${fmt(ZM.per, 1)}円</b>`, label: `Bの100mlあたり${fmt(ZN.per, 1)}円の棒。Aの6本入りのほうが安い` })}`;

const FAQS = [
  {
    q: '「単価」と「実質単価」はどう違いますか？',
    a: '<p>入り数や割引シールも入れて、実際に払う金額から出した単価を「実質単価」と呼んでいます。入り数と割引シールは<a href="/matomegai/">まとめ買いの単価比較</a>で入れられます。</p>',
  },
  {
    q: '100gあたりの値段は、どう出しますか？',
    a: '<p>値段を量のgで割って、100をかけます。300gで258円なら、100gあたり86円です。</p>',
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
  {
    q: '箱で買うほうが、いつも安いですか？',
    a: '<p>いつもではありません。100mlや100gあたりにそろえて、数字が小さいほうが安い商品です。</p>',
  },
];

// まとめ買い：計算式のしくみと、使う場面・まちがえやすいところ（AdSense の再審査 #96。数字は tests/scenes-c.test.mjs）
const MATOME_HOW = `<p>入り数がちがう商品は、パックの値段だけではくらべられません。全部の量を出して、同じ量あたりの値段にそろえると、量のちがいが消えて値段だけのくらべになります。割引シールがあるときは、量で割る前に値段から引きます。</p>
<p>例：500mlの24本入りが2,480円なら、全部で12,000mlです。2,480 ÷ 12,000 × 100 で、100mlあたり約20.7円です。</p>`;
const MATOME_SCENES = `<p>2Lのお茶を、6本入りの箱で1,058円か、1本198円で買うかまよったとします。箱は100mlあたり約8.8円、1本は9.9円なので箱のほうが安く、12Lを1本ずつ買うより130円安くなります。</p>
<p>400gのヨーグルト198円に20％引きのシールが貼られ、となりに75gの4個パックが128円で並んでいるとします。シールのあとは158円で100gあたり39.5円、4個パックは約42.7円です。シールがなければ49.5円なので、シールで安い順が入れかわります。</p>
<p>トイレットペーパーのように巻きの長さがちがうものは、量の単位をmにします。1ロール27.5mの12ロールが548円、55mの8ロールが598円なら、1mあたり約1.7円と約1.4円で、8ロールのほうが安い商品です。入り数のない商品どうしは<a href="/tanka/">実質単価の比較</a>で8つまでくらべられます。</p>`;
const MATOME_MISTAKES = `<p>量の欄に全部の量を入れると、入り数の分だけ量が多く数えられます。350mlの6本入り1,180円で、量に2,100、入り数に6と入れると、100mlあたり約9.4円と出てしまいます。正しくは量に350を入れて、約56.2円です。</p>
<p>50円引きのシールを、割引シールの欄に50と入れると、50％引きとして計算されます。298円なら248円のはずが149円になるので、値段から50円を引いて値段の欄に入れてください。</p>
<p>長さのちがうロールを入り数だけでくらべると、答えが逆になります。上のトイレットペーパーは、1ロールあたりでは12ロールが約45.7円、8ロールが約74.8円で、12ロールのほうが安く見えます。</p>`;

// 結果：いちばんおトクの値札、2位との差、安い順の棒グラフ
const RESULT = `<div class="tag-stage" aria-live="polite">
    <div class="tag-wrap is-empty" id="tag">
      <div class="pricetag">
        <p class="tag-was" id="t-base">100gあたり</p>
        <p class="tag-price"><span id="t-price">？</span><small>円</small></p>
        <p class="tag-save" id="t-sub">Aの値段を入れてください</p>
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
  ${memoHtml(tool)}
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算式',
  `${ZUKAI}
<p>量がちがう商品は、値段だけではくらべられません。同じ量あたりの値段にそろえるため、値段を量で割ってから100をかけて、100gあたりにします。kgやLは、gやmlに直してから割ります。例：1.5Lで168円のお茶は、168 ÷ 1,500 × 100 ＝ 11.2 で、100mlあたり11.2円です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `${BARS}<div class="tbl-wrap"><table>
<thead><tr><th>くらべるもの</th><th class="num">A</th><th class="num">B</th><th>安い</th></tr></thead>
<tbody>
<tr><td class="wrap">お肉 500g 198円 / 1kg 298円</td><td class="num">39.6円</td><td class="num">29.8円</td><td>B</td></tr>
<tr><td class="wrap">牛乳 1L 248円 / 500ml 138円</td><td class="num">24.8円</td><td class="num">27.6円</td><td>A</td></tr>
<tr><td class="wrap">お米 5kg 2,480円 / 2kg 1,080円</td><td class="num">49.6円</td><td class="num">54円</td><td>A</td></tr>
</tbody>
</table></div>
<p>A・Bは、100gあたり（牛乳は100mlあたり）の値段です。</p>
<p>6本入りや割引シールの商品は、<a href="/matomegai/">まとめ買いの単価比較</a>でくらべられます。</p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>詰め替えの洗剤で、400gが258円と、1kgが548円のとき。100gあたり64.5円と54.8円で、1kgのほうが安くなります。</p>
<p>トイレットペーパーは、ロールの数ではなく長さでくらべます。12ロールで合わせて330mが438円、600mが658円なら、単位をmにして1mあたり約1.33円と約1.1円です。</p>
<p>ゴミ袋が50枚で298円と、30枚で198円のときは、単位を枚にします。1枚あたり5.96円と6.6円で、50枚のほうが安くなります。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>量が多いほうが、いつも安いとはかぎりません</h3>
<p>牛乳1Lが248円で、500mlが118円なら、100mlあたり24.8円と23.6円です。この場合は500mlのほうが安くなります。</p>
<h3>6本パックに、1本の量だけを入れる</h3>
<p>350mlの6本パックが1,180円のとき、量に350と入れると100mlあたり約337円になります。全部の量の2,100mlを入れれば約56.2円です。入り数のまま入れたいときは、<a href="/matomegai/">まとめ買いの単価比較</a>を使います。</p>
<h3>kgの商品を、gのまま入れる</h3>
<p>1kgで298円の商品に、量を1、単位をgのままで入れると、100gあたり29,800円と出ます。ありえない金額が出たら、単位の欄を見なおしてください。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '実質単価の比較｜どっちが得？100gあたりの値段を計算',
    description: `値段と内容量から、100gあたり・100mlあたり・1個あたりの値段をくらべます。500gで198円なら100gあたり${fmt(calcUnitPrice({ price: 198, qty: 500, unit: 'g' }).per, 1)}円です。gとkg、mlとLの単位がちがっても、${KEYS.length}つまでの商品を安い順に並べます。`,
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
  ${memoHtml(tool)}
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算式',
  `${ZUKAI_MATOME}${MATOME_HOW}`,
)}

${section(
  'examples',
  '計算例',
  `${BARS_MATOME}<div class="tbl-wrap"><table>
<thead><tr><th>くらべるもの</th><th class="num">A</th><th class="num">B</th><th>安い</th></tr></thead>
<tbody>
<tr><td class="wrap">350ml×6本 1,180円 / 350ml 208円</td><td class="num">56.2円</td><td class="num">59.4円</td><td>A</td></tr>
<tr><td class="wrap">ティッシュ 5箱 398円 / 3箱 258円</td><td class="num">79.6円</td><td class="num">86円</td><td>A</td></tr>
<tr><td class="wrap">卵 10個 248円 / 6個 168円</td><td class="num">24.8円</td><td class="num">28円</td><td>A</td></tr>
<tr><td class="wrap">1kg 298円の<wbr>20％引き / 500g 128円</td><td class="num">23.8円</td><td class="num">25.6円</td><td>A</td></tr>
</tbody>
</table></div>
<p>A・Bは、100mlか100gあたりの値段です。ティッシュと卵は、1つあたりです。</p>
<p>1kg 298円の20％引きは、1円未満を切り捨てて238円です。</p>`,
)}
${section('scenes', '使う場面の例', MATOME_SCENES)}
${section('mistakes', 'まちがえやすいところ', MATOME_MISTAKES)}

${section('faq', 'よくある質問', faqHtml(MATOME_FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: 'まとめ買いの単価比較｜6本入り・割引シールでどっちが得か',
    description: `まとめ売りの入り数や割引シールを入れて、1本あたり・100mlあたりの値段をくらべます。350mlの6本入りが${fmt(1180)}円なら100mlあたり${fmt(calcUnitPrice({ price: 1180, qty: 350, unit: 'ml', packs: 6 }).per, 1)}円です。${MATOME_KEYS.length}つまでくらべて、6本入りとバラのどちらが安いかがわかります。`,
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
