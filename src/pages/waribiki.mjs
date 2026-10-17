import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
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
  .join('')}<div class="tile tile-input" id="f-rate"><div class="tile-box"><input id="rate" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="?" aria-describedby="l-rate"><span>%</span></div><label for="rate">その他（％）</label></div></div>`;

const toolBtn = (id, label) => `<button type="button" class="tool-btn" id="${id}" aria-pressed="false"><span>${label}</span></button>`;

const miniTag = (k) =>
  `<div class="cmp-item" id="cmp-${k}" data-item="${k}"><p class="cmp-label" id="cl-${k}">${k.toUpperCase()}</p><div class="tag-wrap tag-mini"><div class="pricetag"><p class="tag-was" id="cw-${k}"></p><p class="tag-price"><span id="cp-${k}">？</span><small>円</small></p><p class="tag-save" id="cs-${k}"></p></div><p class="tag-badge" id="cb-${k}" hidden><span id="cr-${k}"></span><small>OFF</small></p></div></div>`;

const cmpTab = (k) =>
  `<button type="button" class="cmp-tab" data-item="${k}" aria-pressed="${k === 'a'}"><span class="cmp-tab-k">${k.toUpperCase()}</span><span class="cmp-tab-v" id="tab-${k}">まだ入っていません</span></button>`;

const FAQS = [
  {
    q: '2,000円の3割引きと1,500円の20％オフ、どっちが安いですか？',
    a: '<p>1,500円の20％オフです。1,200円で、2,000円の3割引き（1,400円）より200円安くなります。</p>',
  },
  {
    q: '30％オフのあと、さらに20％オフにすると50％オフになりますか？',
    a: '<p>なりません。0.7×0.8＝0.56なので、合わせて44％オフです。</p>',
  },
  {
    q: '1円未満の端数はどうなりますか？',
    a: '<p>切り捨てで計算します。端数が出たときは、値札の下で四捨五入や切り上げに変えられます。</p>',
  },
  {
    q: '税込と税抜、どちらの値段を入れればいいですか？',
    a: '<p>知りたいほうの値段を入れてください。どちらで計算しても、差は1円ほどです。</p>',
  },
  {
    q: '「2割引き」と「20％オフ」は同じですか？',
    a: '<p>同じです。1割が10％なので、2割5分引きは25％オフです。</p>',
  },
  {
    q: '入力した数字はどこかに送られますか？',
    a: '<p>送られません。計算はこの端末の中だけで行い、保存もしません。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">割引後の値段と、安くなる額を計算します。</p>

<div class="calc" id="calc">
  <div class="cmp-tabs" data-mode="compare" hidden role="group" aria-label="入力する商品">${cmpTab('a')}${cmpTab('b')}</div>

  <div class="field" id="f-price">
    <div class="field-head"><label for="price" id="l-price">元の値段</label><button type="button" class="clear-btn" id="clear">クリア</button></div>
    ${input('price', '円', '2,000')}
  </div>
  ${field('sale', '割引後の値段', '円', '1,400', ' data-mode="rate" hidden')}
  <div class="field" data-mode="off compare">
    <p class="label" id="l-rate">値引きをえらぶ</p>
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
    ${toolBtn('more', 'さらに割引')}
    ${toolBtn('to-cmp', '2つくらべる')}
    ${toolBtn('to-rate', '何％オフ？')}
  </div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>割引後の値段 ＝ 元の値段 ×（100 − 割引率）÷ 100</span>
<span>割引率 ＝（元の値段 − 割引後の値段）÷ 元の値段 × 100</span>
</div>
<p>例：5,000円の30％オフは、5,000 × 70 ÷ 100 ＝ 3,500円。</p>`,
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
<p class="note">1円未満は切り捨て（849.15円 → 849円）。</p>`,
)}

${section(
  'wari',
  '割と％',
  `<div class="tbl-wrap"><table>
<thead><tr><th>割</th><th>％</th><th>支払う割合</th></tr></thead>
<tbody>
<tr><td>1割引き</td><td>10％オフ</td><td>0.9倍</td></tr>
<tr><td>2割5分引き</td><td>25％オフ</td><td>0.75倍</td></tr>
<tr><td>3割引き</td><td>30％オフ</td><td>0.7倍</td></tr>
<tr><td>半額</td><td>50％オフ</td><td>0.5倍</td></tr>
</tbody>
</table></div>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '割引計算｜何％オフ・何割引きの値段を計算',
    description:
      '「3割引き」「20％オフ」の割引後の値段と、いくら安くなるかを計算します。2つの割引のどちらが安いかの比較、割引後の値段から何％オフかの逆算、クーポンを重ねた二重割引にも使えます。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '元の値段と割引率から、割引後の値段と値引きの額を計算するツール。2つの割引の比較、割引率の逆算、二重割引に対応。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['waribiki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
