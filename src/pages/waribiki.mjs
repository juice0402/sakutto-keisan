import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, icon } from '../layout.mjs';
import { relatedHtml, toolLd } from '../parts.mjs';

const tool = toolBySlug('waribiki');
const path = '/waribiki/';

const chips = (target, values) =>
  `<div class="chips" data-target="${target}">${values
    .map((v) => `<button type="button" class="chip" data-value="${v}" aria-pressed="false">${v}%</button>`)
    .join('')}</div>`;

const field = (id, label, unit, placeholder, extra = '', hidden = false) =>
  `<div class="field" id="f-${id}"${hidden ? ' hidden' : ''}><label for="${id}">${label}</label><div class="input"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"><span class="unit">${unit}</span></div>${extra}</div>`;

const FAQS = [
  {
    q: '30％オフのあと、さらに20％オフにすると50％オフになりますか？',
    a: '<p>なりません。2回目の20％オフは「30％オフ後の値段」にかかるので、合計は44％オフです（元の値段 × 0.7 × 0.8 = 元の値段 × 0.56）。このツールの「さらに割引する」で確かめられます。</p>',
  },
  {
    q: '1円未満の端数はどうなりますか？',
    a: '<p>はじめは「切り捨て」で計算します。お店によっては四捨五入や切り上げのこともあるので、「1円未満」のところで切り替えてください。「さらに割引」をするときは、1回ごとに端数を処理します。</p>',
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
<p class="lead">元の値段と割引率を入れるだけで、割引後の値段と、いくら安くなるかがすぐわかります。</p>

<div class="calc" id="calc">
  <div class="seg" role="radiogroup" aria-label="計算のしかた">
    <input type="radio" name="mode" id="m-off" value="off" checked><label for="m-off">割引後の値段を出す</label>
    <input type="radio" name="mode" id="m-rate" value="rate"><label for="m-rate">何％オフか調べる</label>
  </div>

  ${field('price', '元の値段', '円', '例 5,000')}
  <div data-mode="off">
    ${field('rate', '割引率', '％オフ', '例 30', chips('rate', [10, 20, 30, 40, 50, 70]))}
    ${field('rate2', 'さらに割引（クーポンなど）', '％オフ', '例 10', chips('rate2', [5, 10, 15, 20]), true)}
  </div>
  <div data-mode="rate" hidden>
    ${field('sale', '割引後の値段', '円', '例 3,500')}
  </div>

  <div class="row-opts" data-mode="off">
    <button type="button" class="more-btn" id="more" aria-expanded="false" aria-controls="f-rate2">＋ さらに割引する</button>
    <label class="select">1円未満<select id="rounding"><option value="floor">切り捨て</option><option value="round">四捨五入</option><option value="ceil">切り上げ</option></select></label>
  </div>

  <div class="result is-empty" id="result" aria-live="polite">
    <p class="result-label" id="r-label">割引後の値段</p>
    <p class="result-main" id="r-main">—</p>
    <dl class="result-rows" id="r-rows"></dl>
    <div class="result-steps" id="r-steps" hidden></div>
    <p class="result-msg" id="r-msg">元の値段と割引率を入れると、ここに答えが出ます。</p>
  </div>

  <div class="actions">
    <button type="button" class="btn btn-ghost" id="clear">クリア</button>
    <button type="button" class="btn btn-primary" id="copy" disabled>${icon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', 'ico ico-s')}結果をコピー</button>
  </div>
  <noscript><p class="result-msg is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'howto',
  '使い方',
  `<ol>
<li><strong>元の値段</strong>を入れます（定価・税込価格など、知りたいほうの値段）。</li>
<li><strong>割引率</strong>を入れるか、下のボタン（10％〜70％）を押します。</li>
<li>入れたそばから、<strong>割引後の値段</strong>と<strong>安くなる額</strong>が表示されます。</li>
</ol>
<p>「30％オフからさらに10％オフ」のような二重割引は「＋ さらに割引する」で。セール価格を見て「これって何％オフ？」と思ったら、上の「何％オフか調べる」に切り替えて、元の値段と割引後の値段を入れてください。</p>`,
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
    scripts: ['waribiki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
