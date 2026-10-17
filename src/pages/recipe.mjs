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

const toolBtn = (id, label, toggle = true) =>
  `<button type="button" class="tool-btn" id="${id}"${toggle ? ' aria-pressed="false"' : ''}><span>${label}</span></button>`;

const FAQS = [
  {
    q: '調味料も人数分そのままかけ算していいですか？',
    a: '<p>基本は材料と同じ割合で増やしたり減らしたりします。ただ、煮物やスープは鍋の大きさで蒸発する水分の量が変わり、味が濃くなったり薄くなったりします。塩やしょうゆは少なめに入れて、味をみながら足してください。</p>',
  },
  {
    q: '大さじ1・小さじ1・1カップは何mlですか？',
    a: '<p>大さじ1は15ml、小さじ1は5mlで、大さじ1は小さじ3と同じです。日本の計量カップの1カップは200mlです。お米の1合は180mlで、白米ならおよそ150gです。</p>',
  },
  {
    q: '「1と½個」のような半端な数になったら？',
    a: '<p>卵なら溶いてから半分だけ使う、野菜なら大きさで加減するなど、だいたいの量でかまいません。「約」がついている量は、¼・⅓・½などの近い量に丸めた目安です。</p>',
  },
  {
    q: '加熱時間も人数に合わせて変えますか？',
    a: '<p>加熱時間は人数に比例しません。量が増えると煮立つまでに時間がかかることがあるので、レシピの時間を目安に、様子を見て調整してください。</p>',
  },
  {
    q: '「少々」「適量」はどうなりますか？',
    a: '<p>そのまま「少々」「適量」と出します。計算して小さじ¼より少なくなったときも「少々」になります。</p>',
  },
  {
    q: 'レシピサイトや写真から入力できますか？',
    a: '<p>できます。「レシピの文字・写真から入力」を押して、写真をえらぶか、材料の文字を貼り付けてください。「鶏もも肉 300g」のように1行に書かれた形も、材料と分量が別々の行に分かれた形も読めます。「材料（2人分）」と書いてあれば、レシピの人数も入ります。</p><p>写真は、四すみの丸を動かして材料のところだけを囲むと、読みまちがいが減ります。読み取りはこの端末の中で行い、写真は送信しません。最初の1回だけ、準備に少し時間がかかります。読み取った文字はまちがっていることもあるので、確かめてから材料に入れてください。</p><p>iPhoneの写真アプリやAndroidのGoogleレンズで文字をコピーして、貼り付けることもできます。</p>',
  },
  {
    q: '入力した数字はどこかに送られますか？',
    a: '<p>送られません。計算も、写真や貼り付けた文字の読み取りも、この端末のブラウザの中で行います。入力した材料や数字は保存もしません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">レシピに書いてある人数と作りたい人数から、材料ごとの分量を計算します。大さじ½より少なくなれば小さじに直すなど、計量スプーンで量れる形で出します。</p>

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
  <button type="button" class="wide-btn" id="to-paste" aria-pressed="false" aria-controls="paste">レシピの文字・写真から入力</button>
  <div class="paste" id="paste" hidden>
    <label class="wide-btn photo-btn" for="photo" id="photo-btn"><span>写真・スクショから読み取る</span></label>
    <input type="file" id="photo" accept="image/*" class="sr-only">
    <p class="paste-help">写真は送信せず、この端末の中で文字を読み取ります。最初の1回だけ、準備に少し時間がかかります。</p>
    <div class="crop" id="crop" hidden>
      <p class="crop-help">材料のところだけを囲むと、読みまちがいが減ります。四すみの丸を動かしてください。</p>
      <div class="crop-stage"><div class="crop-frame"><img id="crop-img" alt="えらんだ写真" draggable="false"><div class="crop-box" id="crop-box"><span class="crop-h" data-h="nw"></span><span class="crop-h" data-h="ne"></span><span class="crop-h" data-h="sw"></span><span class="crop-h" data-h="se"></span></div></div></div>
      <button type="button" class="wide-btn is-main" id="crop-go">この範囲を読み取る</button>
    </div>
    <div class="ocr-status" id="ocr-status" role="status" hidden><p id="ocr-text"></p><div class="ocr-bar" aria-hidden="true"><span id="ocr-fill"></span></div></div>
    <label for="paste-text">または、レシピの材料の文字を貼り付け</label>
    <textarea id="paste-text" rows="7" maxlength="3000" autocomplete="off" placeholder="材料（2人分）&#10;鶏もも肉 300g&#10;玉ねぎ 1個&#10;しょうゆ 大さじ2"></textarea>
    <p class="paste-help">レシピサイトやメモの材料をコピーして貼り付けると、材料と分量と単位を読み取ります。写真から読み取った文字もここに出ます。まちがっているところを直してから「材料に入れる」を押してください。</p>
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
    ${toolBtn('to-add', '＋材料を追加', false)}
    ${toolBtn('to-match', '手元の量から')}
    ${toolBtn('to-copy', '結果をコピー', false)}
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li>「レシピは何人分？」と「何人分つくる？」を、−と＋のボタンか数字で入れます。</li>
<li>レシピの材料と分量を入れます。最初は5行あり、使わない行は空のままでかまいません。単位は分量の欄の右でえらびます。材料の名前は空でも計算できます。</li>
<li>作る人数分の分量が、下のメモに出ます。</li>
</ol>
<p>材料が多いときは「レシピの文字・写真から入力」を使うと、まとめて入れられます。レシピサイトの材料をコピーして貼り付けるか、レシピの写真やスクリーンショットをえらんでください。</p>
<p>メモの下のボタンは、次のようなときに使います。</p>
<ul>
<li>＋材料を追加：材料が6つ以上あるとき。20まで増やせます</li>
<li>手元の量から：「鶏肉が450gある」のように、手元の材料の量に合わせてほかの材料を計算したいとき。何人分になるかも出ます</li>
<li>結果をコピー：計算した分量を、メモアプリや買い物リストに貼りたいとき</li>
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
<p>2人分のレシピで3人分作るなら、3 ÷ 2 で1.5倍です。鶏もも肉300gは、300 × 1.5 で450gになります。</p>
<h3>量の直し方</h3>
<ul>
<li>大さじ½より少なくなったら小さじに、小さじ3以上になったら大さじに直します。大さじ1は小さじ3です。</li>
<li>小さじ¼より少なくなったら「少々」にします。</li>
<li>大さじ・小さじ・個などは、¼・⅓・½・⅔・¾のうちいちばん近い量にします。ちょうどでないときは「約」をつけます。</li>
<li>gとmlは、10より少ないときは小数第1位まで、それ以上は整数で出します。</li>
<li>カップはmlに直し、カップでの量を小さく添えます。1カップは200mlです。</li>
<li>お米の合には重さの目安を添えます。1合は180mlで、約150gです。</li>
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
<tr><td>お米1合</td><td class="num">180ml</td><td>白米で約150g。計量カップ1杯（200ml）とは違います</td></tr>
</tbody>
</table></div>
<p class="note">大さじ・小さじは「量（ml）」なので、同じ大さじ1でも、材料によって重さ（g）は違います。</p>`,
)}

${section(
  'tips',
  '人数を変えて作るとき',
  `<p>量を増やしたときは、塩やしょうゆを少し控えめに入れて、味をみてから足すと失敗が少なくなります。2倍の量を作るなら、鍋もひとまわり大きいものにしてください。鍋がいっぱいだと火の通りにむらが出ます。</p>
<p>パンやお菓子は分量の割合で仕上がりが変わるので、gで量れる材料ははかりで量るのが確実です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: 'レシピの人数換算｜材料の分量を何人分にも計算',
    description:
      '2人分のレシピを3人分や4人分にするときの材料の分量を計算します。大さじ・小さじ・カップ・個に対応し、大さじ½より少なければ小さじに直します。レシピの写真やコピーした文字から、材料をまとめて入れることもできます。',
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
