// 楽天のポイントのコーナー：SPU のポイント計算 /point/spu/（10/23 しょーくん「SPU はしくみが複雑なので、最新情報としてすぐにページを」）
// 今月の楽天市場の買い物（税込）と、使っているサービスのチェック欄から、倍率とポイントの目安。サービスごとに1か月の上限までにする
// 結果は SPU のカード（倍率の帯＝全部そろったときの長さに、使っているサービスの分をぬる）。倍率・上限・条件は src/data/spu.mjs（公式で確かめたものだけ）
// 計算は src/lib/spu.mjs、ページの例は tests/spu.test.mjs。決まりは /point/ と同じ（目安・楽天とは関係のない個人のサイト・公式の文を写さない）
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { SPU_ITEMS, SPU_SOURCES, SPU_BASE, SPU_MAX } from '../data/spu.mjs';
import { spuPoints, spuCapOf, spuReach } from '../lib/spu.mjs';
import { fmt } from '../lib/number.mjs';

const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
const CHECKED = SPU_SOURCES[0].checked;
const EX_PICK = ['card', 'mobile', 'bank'];
const EX = spuPoints({ total: 30000, picked: EX_PICK }, SPU_ITEMS, SPU_BASE);
const exNames = EX_PICK.map((id) => SPU_ITEMS.find((x) => x.id === id).name).join('・');

// 使っているサービスのチェック欄（□に赤ペンの✓。もう一度押すと外れる）
const CHECKS = SPU_ITEMS.map(
  (x) => `<button type="button" class="spu-chk" data-id="${x.id}" aria-pressed="false" aria-label="${esc(x.name)} ＋${x.rate}倍"><span>${esc(x.label)}</span><small>+${x.rate}倍</small></button>`,
).join('\n    ');

// 倍率と上限の一覧
const capText = (x) => {
  const c = spuCapOf(x);
  if (!c) return '—';
  return fmt(c.cap);
};
const reachText = (x) => {
  const c = spuCapOf(x);
  return c ? `${fmt(spuReach(c.rate, c.cap))}円` : '—';
};
// 1つのサービスを2行に：名前と数字の行、その下に条件の行（スマホの幅で名前の列がつぶれないように）
const listRow = (name, rate, cap, reach, cond) =>
  `<tr class="spu-name"><td>${name}</td><td class="num nw">${rate}</td><td class="num nw">${cap}</td><td class="num nw">${reach}</td></tr>
<tr><td class="spu-cond" colspan="4">${cond}</td></tr>`;
const LIST_ROWS = [
  listRow('楽天会員', `${SPU_BASE}倍`, 'なし', '—', 'いつもつく通常のポイント'),
  ...SPU_ITEMS.map((x) => listRow(esc(x.name), `+${x.rate}倍`, capText(x), reachText(x), esc(spuCapOf(x) ? x.cond : `${x.cond}。上限は公式のページで確かめてください`))),
].join('\n');

const FAQS = [
  {
    q: 'SPUとは何ですか？',
    a: `<p>楽天のサービスを使うと、楽天市場の買い物でつくポイントの倍率が上がるしくみです。使うサービスがふえるほど倍率が上がり、いまは全部そろうと${SPU_MAX}倍です。</p>`,
  },
  {
    q: 'SPUの上限はいつリセットされますか？',
    a: '<p>上限はサービスごとに1か月で、楽天市場で買った月ごとに数えます。楽天トラベルと楽天ビューティは、予約した月で数えます。</p>',
  },
  {
    q: '今月の倍率はどこで見られますか？',
    a: '<p>楽天市場のSPUのページにログインすると見られます。条件を満たしてから反映されるまで、時間がかかることがあります。</p>',
  },
  {
    q: 'SPUのポイントはいつもらえますか？',
    a: '<p>サービスごとにちがい、翌月15日ごろのものが多いです。多くは期間限定ポイントで、付与された月の翌月末まで使えます。</p>',
  },
  {
    q: '楽天カードの通常分と特典分のちがいは？',
    a: '<p>通常分は税込で送料もふくむ額にかかり、上限はありません。特典分は税抜の額にかかり、上限は1か月1,000ポイントで、プレミアムカードは5,000ポイントです。</p>',
  },
  {
    q: 'ポイントで払った分は計算に入りますか？',
    a: '<p>楽天カードと楽天銀行の分は、ポイントで払った分を引いた額で計算されます。ほかのサービスの分は、引く前の額で計算されます。</p>',
  },
  {
    q: 'ふるさと納税はSPUの対象ですか？',
    a: '<p>2025年10月1日からの楽天ふるさと納税の寄付は、原則として対象外です。楽天カードで払った分のカードのポイントは、カード会社からつきます。</p>',
  },
  {
    q: 'お買い物マラソンの上限とは別ですか？',
    a: '<p>別です。SPUの上限と、<a href="/point/">お買い物マラソン</a>の買いまわりの特典の上限は、べつべつに数えます。</p>',
  },
  {
    q: 'これは楽天のツールですか？',
    a: '<p>いいえ。個人が作ったもので、楽天グループとは関係ありません。楽天公式のシミュレーターとも別のものです。</p>',
  },
];

const SOURCES = `<ul class="src-list">${SPU_SOURCES.map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人が作っているツールで、楽天グループとは関係ありません。倍率や条件は変わることがあるので、公式のページで確かめてください。</p>`;

export default function render() {
  const tool = toolBySlug('point-spu');
  const path = '/point/spu/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">SPUの倍率とポイントを出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('total', '今月の買い物', '円', '30,000', '', '楽天市場の税込の合計。送料はのぞく')}
  </div>
  <div class="pt-card" aria-live="polite">
    <p class="pt-title">今月のSPU<small id="r-rate">${SPU_BASE}倍</small></p>
    <button type="button" class="clear-btn pt-clear" id="clear">クリア</button>
    <div class="spu-bar" id="spu-bar" aria-hidden="true"><span class="spu-seg is-base" style="width:${((SPU_BASE / SPU_MAX) * 100).toFixed(2)}%">${SPU_BASE}</span></div>
    <p class="spu-scale" aria-hidden="true"><span>${SPU_BASE}倍</span><span>全部で${SPU_MAX}倍</span></p>
    <p class="pt-sum"><span class="pt-k">ポイント</span><span class="pt-v"><b id="r-num">？</b><small>ポイント</small></span></p>
    <p class="pt-foot" id="r-foot">今月の買い物を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="spu-list" role="group" aria-label="使っているサービス">
    ${CHECKS}
  </div>
  <p class="note">目安です。付与は楽天の計算によります。</p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>ポイント ＝ 税抜の額 × 倍率 ÷ 100</span>
<span>税抜の額 ＝ 税込 × 10 ÷ 11</span>
</div>
<p>サービスごとに計算して、それぞれ1か月の上限までにします。1ポイント未満は切り捨てで、0.5倍は税抜200円で1ポイントです。楽天カードの通常分だけは、税込の額にかかります。</p>
<p>例：今月の買い物が${fmt(EX.total)}円で、${exNames}を使っているなら${EX.rate}倍で、ポイントは${fmt(EX.points)}です。実際は注文ごとに計算するので、少しずれることがあります。</p>`,
)}

${section(
  'list',
  'SPUの倍率と上限の一覧',
  `<div class="tbl-wrap"><table class="tbl-text tbl-tight spu-table">
<thead><tr><th>サービス</th><th class="num">倍率</th><th class="num">上限</th><th class="num">届く買い物</th></tr></thead>
<tbody>
${LIST_ROWS}
</tbody>
</table></div>
<p class="note">${jaDate(CHECKED)}に公式で確かめました。</p>
<p>上限は1か月のポイントで、楽天カードは特典分の上限です。届く買い物は、上限に届く楽天市場の1か月の買い物（税込・送料のぞく）の目安です。この額より多く買っても、そのサービスの分は上限のままです。条件は短くまとめたもので、くわしくは各サービスの公式のページで確かめてください。</p>`,
)}

${section(
  'changes',
  'SPUの最近の変更',
  `<div class="tbl-wrap"><table class="tbl-text">
<thead><tr><th>日付</th><th>変わったこと</th></tr></thead>
<tbody>
<tr><td class="nw">2026年7月1日</td><td>楽天ポイントカード＋ファミリーマートが加わり、全部そろうと18.5倍になりました。Rakuten Pashaの条件は、月500以上の申請だけになりました。</td></tr>
<tr><td class="nw">2025年10月1日</td><td>楽天ふるさと納税の寄付が、原則としてSPUの対象外になりました。</td></tr>
</tbody>
</table></div>
<p>公式のページで確かめた変更だけをのせています。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: 'SPUのポイント計算｜楽天の倍率と上限の一覧・上限に届く金額',
    description: `楽天市場のSPUで、使っているサービスと今月の買い物の額から倍率とポイントの目安を出します。全部そろうと${SPU_MAX}倍です。${fmt(EX.total)}円で${exNames}を使うと${EX.rate}倍で${fmt(EX.points)}ポイント。倍率と上限は${jaDate(CHECKED).slice(5)}に公式で確認。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '楽天市場のSPUで、使っているサービスと買い物の額から、倍率とポイントの目安を出すツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['spu.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
