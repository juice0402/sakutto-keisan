// 楽天のポイントのコーナー：買いまわりの1店舗の判定 /point/taishou/（10/23 討論で合意。検索候補「買い回り ふるさと納税」「カウント」「クーポン 1000円以下」「送料」）
// 店の種類の付箋と、商品の値段・クーポンの値引きから、お買い物マラソン・楽天スーパーSALE の1店舗に数えるか。結果は判定のカード（判定の額と1,000円の線の棒）
// 決まりは楽天市場のヘルプとガイドで確かめたものだけ（src/data/point.mjs の POINT_COUNT_SOURCES）。計算は src/lib/taishou.mjs、例は tests/taishou.test.mjs
// 公式の文を写さず、自分の言葉で短く書く。予約商品は「数えるのは4つ」と書き、ほかを言い切らない
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { POINT_COUNT_SOURCES, POINT_MIN_YEN } from '../data/point.mjs';
import { countJudge } from '../lib/taishou.mjs';
import { fmt } from '../lib/number.mjs';

const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
const EX = countJudge({ kind: 'normal', price: 1280, coupon: 300 }, POINT_MIN_YEN);

const KINDS = [
  ['normal', 'ふつうの店', '楽天市場'],
  ['books', 'ブックス', '楽天24も'],
  ['furusato', 'ふるさと', '納税の寄付'],
  ['yoyaku', '予約商品', '発売前'],
  ['teiki', '定期購入', '頒布会も'],
  ['kinken', '金券', 'ギフト券など'],
];
const TILES = `<div class="tiles tiles-3" role="group" aria-label="店の種類">
      ${KINDS.map(([k, b, s]) => `<button type="button" class="tile tile-word" data-kind="${k}" aria-pressed="${k === 'normal'}"><b>${b}</b><small>${s}</small></button>`).join('\n      ')}
    </div>`;

const LIST = [
  ['ふつうの買い物', '数える', '1回の注文が税込1,000円以上'],
  ['楽天ブックス・楽天Kobo', '数える', 'Koboの電子書籍リーダーの中で買ったものは数えない'],
  ['楽天24・楽天ビック', '数える', '楽天24エクスプレスは数えない'],
  ['Rakuten Fashion', '数える', '本店は何ブランド買っても1店舗。FLAGSHIP STOREは店ごと'],
  ['楽天スーパーDEAL・楽券', '数える', ''],
  ['定期購入・頒布会', '条件つき', '期間中に申し込んだ初回のお届けだけ'],
  ['予約商品', '条件つき', '数えるのは、事前告知の予約アイテム・楽天モバイル契約者の先行セール・楽天ブックスとKoboの予約・Rakuten Fashionの予約'],
  ['楽天ふるさと納税', '数えない', '2025年10月1日からの寄付'],
  ['金券類', '数えない', '商品券・ギフトカード・切手・図書カードなど。同じ注文のほかの商品も数えない'],
  ['ほか', '数えない', '楽天24エクスプレス・楽天ペイのオンライン決済・1商品が税抜100円より安い買い物など'],
];
const LIST_ROWS = LIST.map(([name, yes, note]) => `<tr><td>${name}</td><td class="nw">${yes}</td><td>${note || '—'}</td></tr>`).join('\n');

const FAQS = [
  {
    q: 'ふるさと納税は1店舗に数えますか？',
    a: '<p>数えません。2025年10月1日からの楽天ふるさと納税の寄付は、店舗の数に入りません。</p>',
  },
  {
    q: '送料は1,000円に入りますか？',
    a: '<p>入りません。送料とラッピング料をのぞいた、商品の額で数えます。</p>',
  },
  {
    q: 'クーポンで1,000円より安くなったら？',
    a: `<p>クーポンのあとの額で数えるので、1,000円より安くなると数えません。例：${fmt(EX.price)}円の商品に${fmt(EX.coupon)}円のクーポンを使うと${fmt(EX.judge)}円で、あと${EX.short}円足りません。</p>`,
  },
  {
    q: 'ポイントで払った分は入りますか？',
    a: '<p>入ります。ポイントを使う前の額で数えるので、ポイントで払っても1,000円以上なら1店舗です。</p>',
  },
  {
    q: '同じ店で2回買ったら？',
    a: '<p>同じ店の買い物は合計して1店舗です。2回に分けても店舗の数はふえません。</p>',
  },
  {
    q: 'これは楽天のツールですか？',
    a: '<p>いいえ。個人が作ったもので、楽天グループとは関係ありません。決まりは変わることがあるので、公式のページで確かめてください。</p>',
  },
];

const SOURCES = `<ul class="src-list">${POINT_COUNT_SOURCES.map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人が作っているツールで、楽天グループとは関係ありません。キャンペーンの決まりは変わることがあるので、買う前に公式のページで確かめてください。</p>`;

export default function render() {
  const tool = toolBySlug('point-taishou');
  const path = '/point/taishou/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">この買い物が1店舗に数えられるか出します。</p>

<div class="calc" id="calc" data-min="${POINT_MIN_YEN}">
  <div class="box-rows">
    ${TILES}
    ${boxField('price', '商品の値段', '円', '1,280', '', '税込。送料はのぞく。同じ店は合計')}
    ${boxField('coupon', 'クーポンの値引き', '円', '300')}
  </div>
  <div class="pt-card" aria-live="polite">
    <p class="pt-title">1店舗の判定</p>
    <button type="button" class="clear-btn pt-clear" id="clear">クリア</button>
    <p class="pt-sum pt-fit"><span class="pt-k" id="r-k">この買い物は</span><span class="pt-v" id="r-v"><b id="r-num">？</b></span></p>
    <div class="tk-bar" aria-hidden="true"><i id="g-fill"></i><span class="tk-line"><span>${fmt(POINT_MIN_YEN)}円</span></span></div>
    <table class="pt-table"><tbody>
      <tr><td>数える額</td><td id="d-judge">—</td></tr>
    </tbody></table>
    <p class="pt-foot" id="r-foot">商品の値段を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <p class="note">マラソンもスーパーSALEも同じ決まりです。</p>
  <div class="calc-tools"><a class="tool-btn tool-link span-3" href="/point/">お買い物マラソンのポイント計算</a></div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '1,000円の数え方',
  `<div class="formula">
<span>数える額 ＝ 商品の値段（税込） − クーポン</span>
<span>1店舗 ＝ 数える額が${fmt(POINT_MIN_YEN)}円以上</span>
</div>
<p>送料とラッピング料は入れず、ポイントで払う分は入れます。同じ店で何回か買ったときは合計します。例：${fmt(EX.price)}円の商品に${fmt(EX.coupon)}円のクーポンを使うと、数える額は${fmt(EX.judge)}円で、1店舗に数えません。</p>`,
)}

${section(
  'list',
  '数えるもの・数えないもの',
  `<div class="tbl-wrap"><table class="tbl-text">
<thead><tr><th>もの</th><th>数えるか</th><th>決まり</th></tr></thead>
<tbody>
${LIST_ROWS}
</tbody>
</table></div>
<p class="note">${jaDate(POINT_COUNT_SOURCES[0].checked)}に公式で確かめました。</p>
<p>数える買い物でも、特典をつける時点でキャンセルされている注文は入りません。買いまわりのカウンターに出るまで時間がかかることがあります。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '買いまわりの1店舗の判定｜ふるさと納税・送料・クーポンは数える？（お買い物マラソン）',
    description: `お買い物マラソンとスーパーSALEで、買い物が1店舗に数えられるかを判定します。${fmt(EX.price)}円の商品に${fmt(EX.coupon)}円のクーポンを使うと${fmt(EX.judge)}円で、${fmt(POINT_MIN_YEN)}円に届かず数えません。ふるさと納税や送料など${LIST.length}の決まりの表もあります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, 'お買い物マラソンと楽天スーパーSALEの買いまわりで、買い物が1店舗に数えられるかを判定するツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['taishou.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
