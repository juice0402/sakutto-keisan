import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, toolListHtml, memoHtml } from '../parts.mjs';
import { DILUTE_TILES, dilute, volumeText } from '../lib/kishaku.mjs';

// 薄め方の早見表：できあがりの量ごとの原液の量（「100倍 1L 何ml」のような検索で来る人が、表を見ればわかるように）
export const QUICK_RATIOS = [2, 5, 10, 20, 50, 100, 200, 500, 1000];
export const QUICK_TOTALS = [500, 1000, 2000];
const QUICK_ROWS = QUICK_RATIOS.map(
  (r) => `<tr><td>${r.toLocaleString('ja-JP')}倍</td>${QUICK_TOTALS.map((t) => `<td class="num">${volumeText(dilute({ ratio: r, amount: t }).concentrate)}</td>`).join('')}</tr>`,
).join('\n');
import { numInput, mixTiles, mixStage } from '../mix.mjs';

const tool = toolBySlug('kishaku');
const path = '/kishaku/';

// 何対何：原液［ ］：水［ ］
const partField = (id, label, placeholder) =>
  `<div class="field" id="f-${id}"><label for="${id}">${label}</label><div class="input">${numInput(id, placeholder)}</div></div>`;

// 入力の形をえらぶタブ（3つから1つ）。読み上げの名前（「？：？」→「何対何」）があれば aria-label に
const seg = (labelId, key, items) =>
  `<div class="seg" role="group" aria-labelledby="${labelId}">${items
    .map(([v, text, name], i) => `<button type="button" class="seg-btn" data-${key}="${v}" aria-pressed="${i === 0}"${name ? ` aria-label="${name}"` : ''}>${text}</button>`)
    .join('')}</div>`;

const pctField = (id, label, placeholder) =>
  `<div class="field" id="f-${id}"><label for="${id}">${label}</label><div class="input">${numInput(id, placeholder)}<span class="unit">％</span></div></div>`;

// 何倍のタイル（4列×2段）：「10倍」と「1：9」（原液：水）を両方書く。最後のマスは自分で入力。1000倍は字を少し小さく
const TILES = mixTiles(
  'l-ratio',
  DILUTE_TILES.map((v) => ({ key: 'ratio', value: v, big: `${v}倍`, small: `1：${(v - 1).toLocaleString('ja-JP')}`, long: v >= 1000 })),
  { id: 'ratio', post: '倍', label: 'その他' },
);

// 使いみち別のページ（めんつゆ・漂白剤・液体肥料）
const USES = ['mentsuyu', 'hyohakuzai', 'ekihi'].map(toolBySlug).filter((t) => t && t.published);

const FAQS = [
  {
    q: '「2倍に薄める」とは、どういうことですか？',
    a: '<p>原液と同じ量の水を足して、全体を2倍の量にすることです。原液100mlなら水100mlで、できあがりは200mlです。</p>',
  },
  {
    q: '「100倍に薄める」は、原液1に水100ですか？',
    a: '<p>全体を原液の100倍にする計算なので、原液1に水99です。製品の表示があれば、そちらに従ってください。</p>',
  },
  {
    q: '「1対3で薄める」は何倍ですか？',
    a: '<p>4倍です。「？：？」に1と3を入れると計算できます。</p>',
  },
  {
    q: '濃度（％）から薄め方を知りたいときは？',
    a: '<p>「？％」に原液の濃度と作りたい濃度を入れてください。6％を0.05％にするなら120倍です。</p>',
  },
  {
    q: '「3倍濃縮」のめんつゆは、どう薄めますか？',
    a: '<p>「3倍」をえらぶと、つゆ1：水2の量が出ます。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">原液と水を何mlずつ入れるか計算します。</p>

<div class="calc" id="calc">
  <div class="field-head calc-head"><p class="label" id="l-how">薄め方</p><button type="button" class="clear-btn" id="clear">クリア</button></div>
  ${seg('l-how', 'how', [['times', '？倍', '何倍'], ['parts', '？：？', '何対何'], ['pct', '？％', '何％']])}
  <div class="field" id="f-tiles">
    <p class="sr-only" id="l-ratio">何倍に薄める？</p>
    ${TILES}
  </div>
  <div class="field parts" id="parts-fields" hidden>
    ${partField('pc', '原液', '1')}
    <span class="parts-colon" aria-hidden="true">：</span>
    ${partField('pw', '水', '3')}
  </div>
  <div class="field pct-fields" id="pct-fields" hidden>
    ${pctField('src', '原液の濃度', '6')}
    ${pctField('target', '作りたい濃度', '0.05')}
  </div>

${mixStage({ hint: '何倍に薄めるかをえらんでください' })}
  ${memoHtml(tool)}
</div>

${USES.length ? section('uses', '使いみち別の薄め方', toolListHtml(USES)) : ''}

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>原液の量 ＝ できあがりの量 ÷ 倍率</span>
<span>水の量 ＝ できあがりの量 − 原液の量</span>
<span>何対何から：倍率 ＝（原液 ＋ 水）÷ 原液</span>
<span>濃度から：倍率 ＝ 原液の濃度 ÷ 作りたい濃度</span>
</div>
<p>例：500mlを100倍なら、原液5ml・水495ml。</p>
<p class="note">「まぜるな危険」の製品はまぜないでください。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>作り方</th><th class="num">原液</th><th class="num">水</th><th class="num">できる量</th></tr></thead>
<tbody>
<tr><td class="wrap">500mlを<wbr>100倍</td><td class="num">5ml</td><td class="num">495ml</td><td class="num">500ml</td></tr>
<tr><td class="wrap">1Lを<wbr>10倍</td><td class="num">100ml</td><td class="num">900ml</td><td class="num">1L</td></tr>
<tr><td class="wrap">原液10mlを<wbr>50倍</td><td class="num">10ml</td><td class="num">490ml</td><td class="num">500ml</td></tr>
<tr><td class="wrap">1対3（4倍）で<wbr>800ml</td><td class="num">200ml</td><td class="num">600ml</td><td class="num">800ml</td></tr>
<tr><td class="wrap">水2Lで<wbr>1,000倍</td><td class="num">2ml</td><td class="num">2L</td><td class="num">2L</td></tr>
<tr><td class="wrap">6％を<wbr>0.05％に<wbr>（120倍）・<wbr>1L</td><td class="num">8.3ml</td><td class="num">992ml</td><td class="num">1L</td></tr>
</tbody>
</table></div>`,
)}

${section(
  'quick',
  '薄め方の早見表',
  `<div class="tbl-wrap"><table>
<thead><tr><th>倍率</th><th class="num">500ml</th><th class="num">1L</th><th class="num">2L</th></tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">できあがりの量ごとの原液の量です。</p>
<p>水は、できあがりの量から原液を引いた量です。1Lを100倍なら、原液10mlに水990mlです。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;

  const html = page({
    path,
    title: '希釈率の計算｜何倍に薄める？原液と水の量',
    description:
      '「◯倍に薄める」「1対3で薄める」ときの原液と水の量を計算します。500mlを100倍に薄めるなら原液5ml・水495mlです。できあがり・原液・水のどれからでも計算でき、濃度（％）からの薄め方にも対応しています。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '何倍に薄めるかと作りたい量から、原液と水の量を出す計算ツール。濃度（％）からの計算にも対応。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['kishaku.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
