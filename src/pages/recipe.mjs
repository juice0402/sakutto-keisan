import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
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

// 人数：大きな −／＋ と、名前を中に書いたまん中の欄（ほかの欄と左右のはしをそろえる）
const stepper = (id, label, value, who) => `<div class="stepper box-stepper">
  <button type="button" class="step-btn" id="${id}-minus" aria-label="${who}を1人へらす">${icon('<path d="M5 12h14"/>')}</button>
  <div class="field box-field" id="f-${id}"><label for="${id}">${label}</label><div class="input">${numInput(id, value, ` value="${value}"`)}<span class="unit">人分</span></div></div>
  <button type="button" class="step-btn" id="${id}-plus" aria-label="${who}を1人ふやす">${icon('<path d="M5 12h14M12 5v14"/>')}</button>
</div>`;

// 材料の行：名前（文字）と分量（数字＋単位）
const row = ([name, amount, unit], i) => {
  const n = i + 1;
  return `<div class="ing" id="row-${n}"${i >= FIRST ? ' hidden' : ''}>
  <div class="pair" role="group" aria-label="材料${n}">
    <div class="field"><label class="sr-only" for="name-${n}">材料${n}の名前</label><div class="input input-name"><input id="name-${n}" type="text" inputmode="text" autocomplete="off" enterkeyhint="next" maxlength="20" placeholder="${name}"></div></div>
    <div class="field" id="f-amt-${n}"><label class="sr-only" for="amt-${n}">材料${n}の分量</label><div class="input input-sel">${numInput(`amt-${n}`, amount)}<select id="unit-${n}" class="unit-select" aria-label="材料${n}の単位">${RECIPE_UNITS.map((u) => `<option value="${u}"${u === unit ? ' selected' : ''}>${u}</option>`).join('')}</select></div></div>
  </div>
  <p class="ing-out" id="out-${n}" aria-hidden="true"></p>
</div>`;
};

const toolBtn = (id, label, toggle = true) =>
  `<button type="button" class="tool-btn" id="${id}"${toggle ? ' aria-pressed="false"' : ''}><span>${label}</span></button>`;

const FAQS = [
  {
    q: '調味料も人数分そのままかけ算していいですか？',
    a: '<p>基本はそのままで大丈夫です。煮物は味が濃くなりやすいので、少なめに入れて味をみてください。</p>',
  },
  {
    q: '大さじ1・小さじ1・1カップは何mlですか？',
    a: '<p>大さじ1＝15ml、小さじ1＝5ml、1カップ＝200mlです。</p>',
  },
  {
    q: '「1と½個」のような半端な数になったら？',
    a: '<p>だいたいの量で大丈夫です。「約」は近い量に丸めた目安です。</p>',
  },
  {
    q: '加熱時間も人数に合わせて変えますか？',
    a: '<p>変えません。量が多いと時間がかかるので、様子を見て調整してください。</p>',
  },
  {
    q: 'レシピサイトや写真から入力できますか？',
    a: '<p>できます。「レシピの文字・写真から入力」から、写真をえらぶか文字を貼り付けてください。写真は送信しません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">レシピの分量を、人数に合わせて直します。</p>

<div class="calc" id="calc">
  <div class="people">
    ${stepper('from', 'レシピ', 2, 'レシピの人数')}
    ${stepper('to', 'つくる', 4, '作る人数')}
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

  <button type="button" class="wide-btn" id="to-paste" aria-pressed="false" aria-controls="paste">レシピの文字・写真から入力</button>
  <div class="paste" id="paste" hidden>
    <label class="wide-btn photo-btn" for="photo" id="photo-btn"><span>写真・スクショから読み取る</span></label>
    <input type="file" id="photo" accept="image/*" class="sr-only">
    <p class="paste-help">写真は送信せず、端末の中で読み取ります。</p>
    <div class="crop" id="crop" hidden>
      <p class="crop-help">四すみの丸で材料のところを囲んでください</p>
      <div class="crop-stage"><div class="crop-frame"><img id="crop-img" alt="えらんだ写真" draggable="false"><div class="crop-box" id="crop-box"><span class="crop-h" data-h="nw"></span><span class="crop-h" data-h="ne"></span><span class="crop-h" data-h="sw"></span><span class="crop-h" data-h="se"></span></div></div></div>
      <button type="button" class="wide-btn is-main" id="crop-go">この範囲を読み取る</button>
    </div>
    <div class="ocr-status" id="ocr-status" role="status" hidden><p id="ocr-text"></p><div class="ocr-bar" aria-hidden="true"><span id="ocr-fill"></span></div></div>
    <label for="paste-text">または、レシピの材料の文字を貼り付け</label>
    <textarea id="paste-text" rows="7" maxlength="3000" autocomplete="off" placeholder="材料（2人分）&#10;鶏もも肉 300g&#10;玉ねぎ 1個&#10;しょうゆ 大さじ2"></textarea>
    <p class="paste-help">読み取った文字は直してから入れてください</p>
    <button type="button" class="wide-btn is-main" id="paste-go">材料に入れる</button>
  </div>
  <p class="paste-msg" id="paste-msg" hidden></p>
  <div class="cols cols-ing"><span aria-hidden="true">材料</span><span class="cols-r"><span aria-hidden="true">レシピの分量</span><button type="button" class="clear-btn" id="clear">クリア</button></span></div>
  ${RECIPE_EXAMPLES.slice(0, MAX).map(row).join('\n')}

  <div class="dish-stage" aria-live="polite">
    <div class="plates" id="plates" aria-hidden="true"></div>
    <p class="ratio" id="ratio"></p>
    <div class="memo is-empty" id="memo">
      <p class="memo-title" id="memo-title">4人分の材料</p>
      <ul class="memo-list" id="memo-list"></ul>
      <p class="memo-empty" id="memo-empty">材料を入れると、ここに出ます</p>
    </div>
    <p class="tag-note" id="r-note" hidden></p>
  </div>

  <div class="calc-tools">
    ${toolBtn('to-add', '＋材料を追加', false)}
    ${toolBtn('to-match', '手元の量から')}
    ${toolBtn('to-copy', '結果をコピー', false)}
  </div>
  ${memoHtml(tool, false)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>倍率 ＝ 作る人数 ÷ レシピの人数</span>
<span>作る分量 ＝ レシピの分量 × 倍率</span>
</div>
<p>例：2人分を3人分にするなら1.5倍。鶏もも肉300g → 450g。</p>
<ul>
<li>大さじ½未満は小さじに、小さじ¼未満は「少々」に直します</li>
<li>半端な量は¼・½などに丸めて「約」をつけます</li>
</ul>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>材料</th><th class="num">2人分</th><th class="num">3人分</th></tr></thead>
<tbody>
<tr><td>鶏もも肉</td><td class="num">300g</td><td class="num">450g</td></tr>
<tr><td>玉ねぎ</td><td class="num">1個</td><td class="num">1と½個</td></tr>
<tr><td>しょうゆ</td><td class="num">大さじ2</td><td class="num">大さじ3</td></tr>
<tr><td>砂糖</td><td class="num">大さじ1</td><td class="num">大さじ1と½</td></tr>
<tr><td>水</td><td class="num">200ml</td><td class="num">300ml</td></tr>
</tbody>
</table></div>
<div class="tbl-wrap"><table>
<thead><tr><th>材料</th><th class="num">4人分</th><th class="num">1人分</th></tr></thead>
<tbody>
<tr><td>しょうゆ</td><td class="num">大さじ2</td><td class="num">大さじ½</td></tr>
<tr><td>酒</td><td class="num">大さじ1</td><td class="num">小さじ¾</td></tr>
<tr><td>卵</td><td class="num">3個</td><td class="num">¾個</td></tr>
</tbody>
</table></div>`,
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
<tr><td>お米1合</td><td class="num">180ml</td><td>白米で約150g</td></tr>
</tbody>
</table></div>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: 'レシピの人数換算｜材料の分量を何人分にも計算',
    description:
      '2人分のレシピを3人分や4人分にするときの材料の分量を計算します。2人分を3人分にするなら1.5倍で、鶏もも肉300gは450gです。大さじ・小さじ・カップにも対応し、レシピの写真から材料をまとめて入れられます。',
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
