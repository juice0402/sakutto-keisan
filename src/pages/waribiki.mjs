import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';

const tool = toolBySlug('waribiki');
const path = '/waribiki/';

const input = (id, unit, placeholder) =>
  `<div class="input"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"><span class="unit">${unit}</span></div>`;

const field = (id, label, unit, placeholder, attrs = '') =>
  `<div class="field" id="f-${id}"${attrs}><label for="${id}">${label}</label>${input(id, unit, placeholder)}</div>`;

// 割引のタイル：「30%」と「3割引き」を両方書いて、％と割のまちがいを防ぐ。最後のマスは自分で入力
const TILES = `<div class="tiles" role="group" aria-labelledby="l-rate">${[10, 20, 30, 40, 50]
  .map((v) =>
    v === 50
      ? `<button type="button" class="tile" data-pct="50" aria-pressed="false"><b>半額</b><small>50%・5割引き</small></button>`
      : `<button type="button" class="tile" data-pct="${v}" aria-pressed="false"><b>${v}%</b><small>${v / 10}割引き</small></button>`,
  )
  .join('')}<div class="tile tile-input" id="f-rate"><div class="tile-box"><input id="rate" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="入力" aria-describedby="l-rate"><span>%</span></div><label for="rate">ほかの割引</label></div></div>`;

const ICONS = {
  more: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9Z"/><path d="M8 7.5h3M9.5 6v3"/>',
  cmp: '<rect x="2.5" y="6" width="8" height="12" rx="2"/><rect x="13.5" y="6" width="8" height="12" rx="2"/><path d="M6.5 3v3M17.5 3v3"/>',
  rate: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M19 5 5 19"/>',
};
const toolBtn = (id, iconKey, label) =>
  `<button type="button" class="tool-btn" id="${id}" aria-pressed="false">${icon(ICONS[iconKey])}<span>${label}</span></button>`;

const miniTag = (k) =>
  `<div class="cmp-item" id="cmp-${k}" data-item="${k}"><p class="cmp-label" id="cl-${k}">${k.toUpperCase()}</p><div class="tag-wrap tag-mini"><div class="pricetag"><p class="tag-was" id="cw-${k}"></p><p class="tag-price"><span id="cp-${k}">？</span><small>円</small></p><p class="tag-save" id="cs-${k}"></p></div><p class="tag-badge" id="cb-${k}" hidden><span id="cr-${k}"></span><small>OFF</small></p></div></div>`;

const cmpTab = (k) =>
  `<button type="button" class="cmp-tab" data-item="${k}" aria-pressed="${k === 'a'}"><span class="cmp-tab-k">${k.toUpperCase()}</span><span class="cmp-tab-v" id="tab-${k}">まだ入っていません</span></button>`;

const FAQS = [
  {
    q: '2,000円の3割引きと1,500円の20％オフ、どっちが安いですか？',
    a: '<p>1,500円の20％オフ（1,200円）のほうが、2,000円の3割引き（1,400円）より200円安いです。割引の額は3割引きのほうが大きい（600円）ので、割引額ではなく割引後の値段でくらべましょう。このツールの「2つくらべる」で確かめられます。</p>',
  },
  {
    q: '30％オフのあと、さらに20％オフにすると50％オフになりますか？',
    a: '<p>なりません。2回目の20％オフは「30％オフ後の値段」にかかるので、合計は44％オフです（元の値段 × 0.7 × 0.8 = 元の値段 × 0.56）。このツールの「さらに割引」で確かめられます。</p>',
  },
  {
    q: '1円未満の端数はどうなりますか？',
    a: '<p>はじめは「切り捨て」で計算します。お店によっては四捨五入や切り上げのこともあるので、値札の下の「1円未満は」で切り替えてください（端数が出たときだけ表示されます）。「さらに割引」をするときは、1回ごとに端数を処理します。</p>',
  },
  {
    q: '税込と税抜、どちらの値段を入れればいいですか？',
    a: '<p>知りたいほうの値段をそのまま入れてください。税込の値段から割り引いても、税抜の値段から割り引いてあとで消費税を足しても、答えはほぼ同じです（端数の処理で1円ほどずれることがあります）。</p>',
  },
  {
    q: '「2割引き」と「20％オフ」は同じですか？',
    a: '<p>同じです。1割＝10％、1分＝1％なので、2割5分引きは25％オフです。半額は5割引き（50％オフ）です。このツールのボタンには、「30%」と「3割引き」の両方を書いてあります。</p>',
  },
  {
    q: '入力した数字はどこかに送られますか？',
    a: '<p>送られません。計算はお使いの端末（ブラウザ）の中だけで行い、入力した数字を保存することもありません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">値段と割引率を入れるだけ。割引後の値段が、値札ですぐわかります。</p>

<div class="calc" id="calc">
  <div class="cmp-tabs" data-mode="compare" hidden role="group" aria-label="入力する商品">${cmpTab('a')}${cmpTab('b')}</div>

  <div class="field" id="f-price">
    <div class="field-head"><label for="price" id="l-price">元の値段</label><button type="button" class="clear-btn" id="clear">クリア</button></div>
    ${input('price', '円', '2,000')}
  </div>
  ${field('sale', '割引後の値段', '円', '1,400', ' data-mode="rate" hidden')}
  <div class="field" data-mode="off compare">
    <p class="label" id="l-rate">割引をえらぶ</p>
    ${TILES}
  </div>
  ${field('rate2', 'さらに割引（クーポンなど）', '％オフ', '10', ' hidden')}

  <div class="tag-stage" aria-live="polite">
    <div class="tag-wrap" id="tag" data-mode="off rate">
      <div class="pricetag">
        <p class="tag-was" id="t-was" hidden></p>
        <p class="tag-price"><span id="t-price">？</span><small>円</small></p>
        <p class="tag-save" id="t-save">値段と割引を入れると、値札ができます</p>
        <p class="tag-conv" id="t-conv" hidden></p>
      </div>
      <p class="tag-badge" id="t-badge" hidden><span id="t-rate"></span><small>OFF</small></p>
    </div>
    <div class="cmp" data-mode="compare" hidden>${miniTag('a')}${miniTag('b')}</div>
    <p class="cmp-verdict" id="cmp-verdict" data-mode="compare" hidden></p>
    <p class="tag-note" id="t-note" hidden></p>
    <label class="select tag-round" id="t-round" hidden>1円未満は<select id="rounding"><option value="floor">切り捨て</option><option value="round">四捨五入</option><option value="ceil">切り上げ</option></select></label>
  </div>

  <div class="calc-tools">
    ${toolBtn('more', 'more', 'さらに割引')}
    ${toolBtn('to-cmp', 'cmp', '2つくらべる')}
    ${toolBtn('to-rate', 'rate', '何％オフ？')}
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li><strong>元の値段</strong>を入れます（定価・税込価格など、知りたいほうの値段）。</li>
<li><strong>割引をえらびます。</strong>ボタンには「30%」と「3割引き」の両方を書いてあります。15％などは右下の「ほかの割引」に入れます。</li>
<li>すぐに、<strong>割引後の値段</strong>と<strong>おトクになる額</strong>が値札で表示されます。</li>
</ol>
<p>値札の下の3つのボタンで、こんな計算もできます。</p>
<ul>
<li><strong>さらに割引</strong>：「30％オフからさらに10％オフ」のような二重割引。</li>
<li><strong>2つくらべる</strong>：「2,000円の3割引き」と「1,500円の20％オフ」のどっちが安いか。上のA・Bを押して、それぞれの値段と割引を入れます。</li>
<li><strong>何％オフ？</strong>：元の値段と割引後の値段から、何％オフかを調べます。</li>
</ul>`,
)}

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>割引後の値段 ＝ 元の値段 ×（100 − 割引率）÷ 100</span>
<span>安くなる額 ＝ 元の値段 × 割引率 ÷ 100</span>
<span>割引率 ＝（元の値段 − 割引後の値段）÷ 元の値段 × 100</span>
</div>
<p>たとえば5,000円の30％オフは、5,000 × 70 ÷ 100 ＝ <strong>3,500円</strong>。安くなる額は5,000 × 30 ÷ 100 ＝ 1,500円です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>元の値段</th><th>割引</th><th class="num">割引後</th><th class="num">安くなる額</th></tr></thead>
<tbody>
<tr><td>3,980円</td><td>20％オフ</td><td class="num">3,184円</td><td class="num">796円</td></tr>
<tr><td>12,800円</td><td>35％オフ</td><td class="num">8,320円</td><td class="num">4,480円</td></tr>
<tr><td>1,980円</td><td>3割引き</td><td class="num">1,386円</td><td class="num">594円</td></tr>
<tr><td>2,000円</td><td>30％オフ＋さらに20％オフ</td><td class="num">1,120円</td><td class="num">880円（44％）</td></tr>
<tr><td>999円</td><td>15％オフ</td><td class="num">849円</td><td class="num">150円</td></tr>
</tbody>
</table></div>
<p class="note">999円の15％オフは849.15円なので、1円未満を切り捨てて849円です。</p>`,
)}

${section(
  'compare',
  'どっちが安い？割引のくらべ方',
  `<p>「2,000円の3割引き」と「1,500円の20％オフ」では、どちらが安いでしょうか。</p>
<div class="formula">
<span>A：2,000円 × 0.7 ＝ 1,400円（600円引き）</span>
<span>B：1,500円 × 0.8 ＝ 1,200円（300円引き）</span>
</div>
<p>割引の額はAのほうが大きいのに、支払う金額は<strong>Bのほうが200円安い</strong>です。割引率や割引額ではなく、<strong>割引後の値段</strong>でくらべるのがコツ。このツールの「2つくらべる」なら、値札を並べてひと目でわかります。</p>`,
)}

${section(
  'wari',
  '「割」と「％」のちがい',
  `<p>1割＝10％、1分＝1％です。「3割引き」と「30％オフ」は同じ意味で、「3％オフ」とは違うので気をつけましょう。</p>
<div class="tbl-wrap"><table>
<thead><tr><th>割</th><th>％</th><th>支払う割合</th></tr></thead>
<tbody>
<tr><td>1割引き</td><td>10％オフ</td><td>9割（0.9倍）</td></tr>
<tr><td>2割5分引き</td><td>25％オフ</td><td>7割5分（0.75倍）</td></tr>
<tr><td>3割引き</td><td>30％オフ</td><td>7割（0.7倍）</td></tr>
<tr><td>5割引き（半額）</td><td>50％オフ</td><td>5割（0.5倍）</td></tr>
</tbody>
</table></div>`,
)}

${section(
  'mental',
  '暗算のコツ',
  `<ul>
<li><strong>10％オフ</strong>は、値段の0を1つ取った額を引くだけ（3,980円 → 398円引き → 3,582円）。</li>
<li><strong>◯割引き</strong>は「残る割合」をかけると早い（3割引き → 0.7倍、25％オフ → 0.75倍）。</li>
<li><strong>半額からさらに半額</strong>は75％オフ（元の値段の4分の1）。</li>
</ul>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '割引計算｜何％オフ・何割引きの値段がすぐわかる',
    description:
      '値段と割引率を入れるだけで、割引後の値段と安くなる額が値札でわかる無料の割引計算ツール。「3割引き」と「20％オフ」どっちが安いかの比較、何％オフかの逆算、二重割引にも対応。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '値段と割引率から割引後の値段・安くなる額を計算。2つの割引の比較・割引率の逆算・二重割引にも対応。'), faqLd(FAQS)],
    theme: themeOf(tool),
    scripts: ['waribiki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
