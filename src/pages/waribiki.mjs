import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';

const tool = toolBySlug('waribiki');
const path = '/waribiki/';

const chips = (target, values) =>
  `<div class="chips" data-target="${target}">${values
    .map((v) => `<button type="button" class="chip" data-value="${v}" aria-pressed="false">${v}%</button>`)
    .join('')}</div>`;

const field = (id, label, unit, placeholder, attrs = '') =>
  `<div class="field" id="f-${id}"${attrs}><label for="${id}">${label}</label><div class="input"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"><span class="unit">${unit}</span></div></div>`;

const FAQS = [
  {
    q: '30％オフのあと、さらに20％オフにすると50％オフになりますか？',
    a: '<p>なりません。2回目の20％オフは「30％オフ後の値段」にかかるので、合計は44％オフです（元の値段 × 0.7 × 0.8 = 元の値段 × 0.56）。このツールの「＋ さらに割引」で確かめられます。</p>',
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
    a: '<p>同じです。1割＝10％、1分＝1％なので、2割5分引きは25％オフです。半額は5割引き（50％オフ）です。</p>',
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
  <div class="grid2">
    ${field('price', '元の値段', '円', '5,000')}
    ${field('rate', '割引', '％オフ', '30', ' data-mode="off"')}
    ${field('sale', '割引後の値段', '円', '3,500', ' data-mode="rate" hidden')}
  </div>
  <div data-mode="off">
    ${chips('rate', [10, 20, 30, 40, 50])}
    ${field('rate2', 'さらに割引（クーポンなど）', '％オフ', '10', ' hidden')}
  </div>

  <div class="tag-stage" aria-live="polite">
    <div class="tag-wrap" id="tag">
      <div class="pricetag">
        <p class="tag-was" id="t-was" hidden></p>
        <p class="tag-price"><span id="t-price">？</span><small>円</small></p>
        <p class="tag-save" id="t-save">値段と割引率を入れると、値札ができます</p>
      </div>
      <p class="tag-badge" id="t-badge" hidden><span id="t-rate"></span><small>OFF</small></p>
    </div>
    <p class="tag-note" id="t-note" hidden></p>
    <label class="select tag-round" id="t-round" hidden>1円未満は<select id="rounding"><option value="floor">切り捨て</option><option value="round">四捨五入</option><option value="ceil">切り上げ</option></select></label>
  </div>

  <div class="calc-links">
    <button type="button" class="link-btn" id="more" data-mode="off" aria-expanded="false" aria-controls="f-rate2">＋ さらに割引</button>
    <button type="button" class="link-btn" id="switch">何％オフか調べる ›</button>
    <button type="button" class="link-btn link-muted" id="clear">クリア</button>
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li><strong>元の値段</strong>を入れます（定価・税込価格など、知りたいほうの値段）。</li>
<li><strong>割引</strong>を入れるか、10％〜50％のボタンを押します。「3割」「半額」と入れてもOKです。</li>
<li>入れたそばに、<strong>割引後の値段</strong>と<strong>おトクになる額</strong>が値札で表示されます。</li>
</ol>
<p>「30％オフからさらに10％オフ」のような二重割引は「＋ さらに割引」で。セール価格を見て「これって何％オフ？」と思ったら、「何％オフか調べる」に切り替えて、割引後の値段を入れてください。</p>`,
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
      '元の値段と割引率を入れるだけで、割引後の値段と安くなる額がすぐわかる無料の割引計算ツール。何％オフかの逆算、30％オフからさらに10％オフのような二重割引、1円未満の端数処理にも対応。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '値段と割引率から割引後の値段・安くなる額を計算。割引率の逆算・二重割引にも対応。'), faqLd(FAQS)],
    theme: themeOf(tool),
    scripts: ['waribiki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
