import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { RECIPE_UNITS } from '../lib/recipe.mjs';

const tool = toolBySlug('recipe');
const path = '/recipe/';
const MAX = 20; // 材料は最初5つ、「＋材料を追加」で20まで
const FIRST = 5;
// 入力欄のうすい例（どの行にも入れて見た目をそろえる）[材料, 分量, 単位]。単位は最初からこの単位にしておく
const RECIPE_EXAMPLES = [
  ['鶏もも肉', '300', 'g'], ['玉ねぎ', '1', '個'], ['しょうゆ', '2', '大さじ'], ['砂糖', '1', '大さじ'], ['水', '200', 'ml'],
  ['にんじん', '1', '本'], ['酒', '1', '大さじ'], ['みりん', '1', '大さじ'], ['しょうが', '1', '片'], ['塩', '0.5', '小さじ'],
  ['じゃがいも', '2', '個'], ['豚こま肉', '200', 'g'], ['牛乳', '1', 'カップ'], ['お米', '2', '合'], ['卵', '2', '個'],
  ['ベーコン', '50', 'g'], ['ピーマン', '2', '個'], ['白ワイン', '1', '大さじ'], ['バター', '10', 'g'], ['豆腐', '1', '丁'],
];

const numInput = (id, placeholder, extra = '') =>
  `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"${extra}>`;

// 人数：大きな −／＋ ボタンと入力欄
const stepper = (id, label, value, who) => `<div class="field" id="f-${id}">
  <label for="${id}">${label}</label>
  <div class="stepper">
    <button type="button" class="step-btn" id="${id}-minus" aria-label="${who}を1人へらす">${icon('<path d="M5 12h14"/>')}</button>
    <div class="input">${numInput(id, value, ` value="${value}"`)}<span class="unit">人分</span></div>
    <button type="button" class="step-btn" id="${id}-plus" aria-label="${who}を1人ふやす">${icon('<path d="M5 12h14M12 5v14"/>')}</button>
  </div>
</div>`;

// 材料の行：名前（文字）と分量（数字＋単位）
const row = ([name, amount, unit], i) => {
  const n = i + 1;
  return `<div class="ing" id="row-${n}"${i >= FIRST ? ' hidden' : ''}>
  <div class="pair" role="group" aria-label="材料${n}">
    <div class="field"><label class="sr-only" for="name-${n}">材料${n}の名前</label><div class="input input-name"><input id="name-${n}" type="text" inputmode="text" autocomplete="off" enterkeyhint="next" maxlength="20" placeholder="${name}"></div></div>
    <div class="field" id="f-amt-${n}"><label class="sr-only" for="amt-${n}">材料${n}の分量</label><div class="input input-sel">${numInput(`amt-${n}`, amount)}<select id="unit-${n}" class="unit-select" aria-label="材料${n}の単位">${RECIPE_UNITS.map((u) => `<option value="${u}"${u === unit ? ' selected' : ''}>${u}</option>`).join('')}</select></div></div>
  </div>
</div>`;
};

const ICONS = {
  add: '<path d="M4 6h10M4 12h10M4 18h6"/><path d="M18 13v7M14.5 16.5h7"/>',
  match: '<rect x="4" y="9" width="16" height="11" rx="2.5"/><circle cx="12" cy="14.5" r="3"/><path d="m12 14.5 1.6-1.6M7 5.5h10"/>',
  photo: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/>',
  paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6A2 2 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
};
const toolBtn = (id, iconKey, label, toggle = true) =>
  `<button type="button" class="tool-btn" id="${id}"${toggle ? ' aria-pressed="false"' : ''}>${icon(ICONS[iconKey])}<span>${label}</span></button>`;

const FAQS = [
  {
    q: '調味料も人数分そのままかけ算していいですか？',
    a: '<p>基本は材料と同じ割合で増やし・減らしします。ただ、煮物やスープは鍋の大きさで蒸発する水分の量が変わるので、味が濃くなったり薄くなったりすることがあります。塩・しょうゆなどは少なめに入れて、味をみながら足すと失敗しにくいです。</p>',
  },
  {
    q: '大さじ1・小さじ1・1カップは何mlですか？',
    a: '<p>大さじ1は15ml、小さじ1は5ml（大さじ1＝小さじ3）、日本の計量カップの1カップは200mlです。お米の1合は180mlです。</p>',
  },
  {
    q: '「1と½個」のような半端な数になったら？',
    a: '<p>卵なら溶きほぐしてから半分を使う、野菜なら大きさで調整するなど、だいたいの量で大丈夫です。「約」がついている量は、¼・⅓・½などのきりのいい量に近づけた目安です。</p>',
  },
  {
    q: '加熱時間も人数に合わせて変えますか？',
    a: '<p>加熱時間は人数に比例しません。量が増えると、煮立つまでや火が通るまでに時間がかかることがあるので、レシピの時間を目安に、様子を見て調整してください。</p>',
  },
  {
    q: '「少々」「適量」はどうなりますか？',
    a: '<p>そのまま「少々」「適量」と出します。味をみて調整してください。計算で小さじ¼より少なくなったときも「少々」と出します。</p>',
  },
  {
    q: 'レシピサイトや写真から入力できますか？',
    a: '<p>できます。「レシピの文字・写真から入力」を押して、「写真・スクショから読み取る」で写真をえらぶか、材料の文字を貼り付けると、材料・分量・単位を読み取って入れます。「鶏もも肉 300g」のように1行に書かれた形も、材料と分量が別の行に分かれた形も読めます。「材料（2人分）」のように人数が書いてあれば、レシピの人数も入ります。</p><p>写真をえらんだら、四すみの丸を動かして材料のところだけを囲んでから読み取ると、読みまちがいが減ります。写真の読み取りは、お使いの端末の中で行い、写真を送信しません。はじめて使うときだけ、読み取りの準備に少し時間がかかります。本や紙を撮った写真は読みまちがいが出ることがあるので、読み取った文字を確かめて、直してから入れてください。スマホの文字の読み取り機能（iPhoneの写真アプリで文字を長押しして「コピー」、Androidの「Googleレンズ」など）でコピーした文字を貼り付けることもできます。</p>',
  },
  {
    q: '入力した数字はどこかに送られますか？',
    a: '<p>送られません。計算も、貼り付けた文字の読み取りも、お使いの端末（ブラウザ）の中だけで行い、入力した材料や数字を保存することもありません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">レシピの人数と作る人数を入れるだけ。材料の分量を、大さじ・小さじまで使いやすい量に直して出します。</p>

<div class="calc" id="calc">
  <div class="people">
    ${stepper('from', 'レシピは何人分？', 2, 'レシピの人数')}
    ${stepper('to', '何人分つくる？', 4, '作る人数')}
    <div class="match" id="match" hidden>
      <div class="field">
        <label for="base">どの材料に合わせる？</label>
        <select id="base" class="big-select"></select>
      </div>
      <div class="field" id="f-have">
        <label for="have">手元にある量</label>
        <div class="input">${numInput('have', '450')}<span class="unit" id="have-unit">g</span></div>
      </div>
    </div>
  </div>

  <div class="field-head calc-head"><p class="label">材料と分量（レシピのとおり）</p><button type="button" class="clear-btn" id="clear">クリア</button></div>
  <button type="button" class="wide-btn" id="to-paste" aria-pressed="false" aria-controls="paste">${icon(ICONS.paste)}<span>レシピの文字・写真から入力</span></button>
  <div class="paste" id="paste" hidden>
    <label class="wide-btn photo-btn" for="photo" id="photo-btn">${icon(ICONS.photo)}<span>写真・スクショから読み取る</span></label>
    <input type="file" id="photo" accept="image/*" class="sr-only">
    <p class="paste-help">写真は送信しません。この端末の中で文字を読み取ります（はじめて使うときだけ、読み取りの準備に少し時間がかかります）。</p>
    <div class="crop" id="crop" hidden>
      <p class="crop-help">材料のところだけを囲むと、読みまちがいが減ります。四すみの丸を動かしてください。</p>
      <div class="crop-stage"><div class="crop-frame"><img id="crop-img" alt="えらんだ写真" draggable="false"><div class="crop-box" id="crop-box"><span class="crop-h" data-h="nw"></span><span class="crop-h" data-h="ne"></span><span class="crop-h" data-h="sw"></span><span class="crop-h" data-h="se"></span></div></div></div>
      <button type="button" class="wide-btn is-main" id="crop-go">この範囲を読み取る</button>
    </div>
    <div class="ocr-status" id="ocr-status" role="status" hidden><p id="ocr-text"></p><div class="ocr-bar" aria-hidden="true"><span id="ocr-fill"></span></div></div>
    <label for="paste-text">または、レシピの材料の文字を貼り付け</label>
    <textarea id="paste-text" rows="7" maxlength="3000" autocomplete="off" placeholder="材料（2人分）&#10;鶏もも肉 300g&#10;玉ねぎ 1個&#10;しょうゆ 大さじ2"></textarea>
    <p class="paste-help">レシピサイトやメモの材料をコピーして貼り付けると、材料・分量・単位を読み取って入れます。写真から読み取った文字もここに出るので、まちがいがあれば直してから「材料に入れる」を押してください。</p>
    <button type="button" class="wide-btn is-main" id="paste-go">材料に入れる</button>
  </div>
  <p class="paste-msg" id="paste-msg" hidden></p>
  <div class="cols cols-ing" aria-hidden="true"><span>材料</span><span>分量</span></div>
  ${RECIPE_EXAMPLES.slice(0, MAX).map(row).join('\n')}

  <div class="dish-stage" aria-live="polite">
    <div class="plates" id="plates" aria-hidden="true"></div>
    <p class="ratio" id="ratio"></p>
    <div class="memo is-empty" id="memo">
      <p class="memo-title" id="memo-title">4人分の材料</p>
      <ul class="memo-list" id="memo-list"></ul>
      <p class="memo-empty" id="memo-empty">材料と分量を入れると、ここに作る人数分の量が出ます</p>
    </div>
    <p class="tag-note" id="r-note" hidden></p>
  </div>

  <div class="calc-tools">
    ${toolBtn('to-add', 'add', '＋材料を追加', false)}
    ${toolBtn('to-match', 'match', '手元の量から')}
    ${toolBtn('to-copy', 'copy', '結果をコピー', false)}
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li><strong>レシピは何人分？</strong>と<strong>何人分つくる？</strong>を、－・＋のボタンか数字で入れます。</li>
<li>レシピに書いてある<strong>材料</strong>と<strong>分量</strong>を入れます（最初は5つ。使わない行は空のままでOK）。単位（g・ml・大さじ・小さじ・カップ・個など）は、分量の欄の右でえらびます。材料の名前は空でも計算できます。<strong>レシピの文字・写真から入力</strong>を押すと、レシピの写真・スクショや、レシピサイトなどからコピーした文字から、まとめて入れられます。</li>
<li>すぐに<strong>作る人数分の分量</strong>がメモに出ます。お皿の絵で、何人分から何人分にしたかもひと目でわかります。</li>
</ol>
<p>メモの下の3つのボタンで、こんなときにも使えます。</p>
<ul>
<li><strong>＋材料を追加</strong>：材料が6つ以上あるとき（20まで）。</li>
<li><strong>手元の量から</strong>：「鶏肉が450gある」のように、手元にある材料の量に合わせて、ほかの材料の分量を出します。何人分になるかもわかります。</li>
<li><strong>結果をコピー</strong>：出た分量をコピーして、メモアプリや買い物リストに貼れます。</li>
</ul>`,
)}

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>倍率 ＝ 作る人数 ÷ レシピの人数</span>
<span>作る分量 ＝ レシピの分量 × 倍率</span>
<span>手元の量に合わせるとき：倍率 ＝ 手元にある量 ÷ レシピの分量</span>
</div>
<p>たとえば2人分のレシピで3人分作るなら、3 ÷ 2 ＝ <strong>1.5倍</strong>。鶏もも肉300gは、300 × 1.5 ＝ <strong>450g</strong>になります。</p>
<h3>使いやすい量に直すルール</h3>
<ul>
<li>大さじ½より少なくなったら小さじに直します（大さじ1＝小さじ3）。小さじが3以上になったら大さじに直します。</li>
<li>小さじ¼より少なくなったら「少々」にします。</li>
<li>大さじ・小さじ・カップ・個などは、¼・⅓・½・⅔・¾ のいちばん近い量にします。ちょうどでないときは「約」をつけます。</li>
<li>gとmlは、10より少ないときは小数第1位まで、それ以上は整数で出します。</li>
<li>カップは、mlも一緒に出します（1カップ＝200ml）。¼カップより少ないときはmlで出します。</li>
</ul>`,
)}

${section(
  'examples',
  '計算例',
  `<h3>2人分のレシピで3人分（1.5倍）</h3>
<div class="tbl-wrap"><table>
<thead><tr><th>材料</th><th class="num">2人分</th><th class="num">3人分</th></tr></thead>
<tbody>
<tr><td>鶏もも肉</td><td class="num">300g</td><td class="num">450g</td></tr>
<tr><td>玉ねぎ</td><td class="num">1個</td><td class="num">1と½個</td></tr>
<tr><td>しょうゆ</td><td class="num">大さじ2</td><td class="num">大さじ3</td></tr>
<tr><td>砂糖</td><td class="num">大さじ1</td><td class="num">大さじ1と½</td></tr>
<tr><td>水</td><td class="num">200ml</td><td class="num">300ml</td></tr>
</tbody>
</table></div>
<h3>4人分のレシピで1人分（¼）</h3>
<div class="tbl-wrap"><table>
<thead><tr><th>材料</th><th class="num">4人分</th><th class="num">1人分</th></tr></thead>
<tbody>
<tr><td>しょうゆ</td><td class="num">大さじ2</td><td class="num">大さじ½</td></tr>
<tr><td>酒</td><td class="num">大さじ1</td><td class="num">小さじ¾</td></tr>
<tr><td>卵</td><td class="num">3個</td><td class="num">¾個</td></tr>
</tbody>
</table></div>
<p class="note">手元の量に合わせる例：2人分のレシピで鶏もも肉300gのところ、450gあるなら 450 ÷ 300 ＝ 1.5倍で、3人分になります。</p>`,
)}

${section(
  'measure',
  '計量の目安',
  `<div class="tbl-wrap"><table>
<thead><tr><th>はかり</th><th class="num">ml</th><th>ほかの言い方</th></tr></thead>
<tbody>
<tr><td>大さじ1</td><td class="num">15ml</td><td>小さじ3</td></tr>
<tr><td>小さじ1</td><td class="num">5ml</td><td>大さじ⅓</td></tr>
<tr><td>1カップ</td><td class="num">200ml</td><td>大さじ13と⅓</td></tr>
<tr><td>お米1合</td><td class="num">180ml</td><td>計量カップ1杯（200ml）とは違います</td></tr>
</tbody>
</table></div>
<p class="note">大さじ・小さじは「量（ml）」なので、同じ大さじ1でも、材料によって重さ（g）は違います。</p>`,
)}

${section(
  'tips',
  '人数を変えて作るときのコツ',
  `<ul>
<li><strong>味つけは少なめから</strong>：量を増やしたときは、調味料を少し控えめに入れて、味をみながら足すと失敗しにくいです。</li>
<li><strong>鍋やフライパンの大きさ</strong>：量を2倍にするなら、ひとまわり大きい鍋を使いましょう。ぎゅうぎゅうだと火の通りがむらになります。</li>
<li><strong>お菓子作りは正確に</strong>：パンやお菓子は分量の割合が大切です。gで量れる材料は、はかりで量るのがおすすめです。</li>
</ul>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: 'レシピの人数換算｜材料の分量を何人分にも計算',
    description:
      '2人分のレシピを3人分・4人分に。レシピの人数と作る人数を入れるだけで、材料の分量を計算します。大さじ・小さじ・カップ・個にも対応し、大さじ½より少なければ小さじに直すなど、使いやすい量で出します。レシピの写真・スクショや文字から、まとめて入力もできます。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, 'レシピの人数と作る人数から、材料の分量を計算するツール。大さじ・小さじ・カップ・個の換算にも対応。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['recipe.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
