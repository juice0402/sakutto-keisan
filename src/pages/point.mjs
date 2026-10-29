// 楽天のポイントのコーナー（10/22 統合。claude/sakutto-tougou-plan.md）。テーマは方眼ノート（生活・お買い物と同じ）
// /point/：お買い物マラソンのポイント計算。買い物の合計（税込）と店舗の数と上限のマスから、買いまわりの特典の目安・上限まで・上限に届く合計・あと1店舗の分
// 結果は10マスのスタンプカード（えらんだ店舗の数だけ赤ペンの丸）。楽天APIは使わない（計算だけなので）
// 回の数字は src/data/point.mjs（公式で確かめたものだけ。公開前の日程や予想は書かない）。計算は src/lib/point.mjs、例は tests/point.test.mjs
// 決まり：楽天のロゴ・赤い帯・公式に似た表を使わない。「目安」「付与は楽天の計算」「楽天グループとは関係のない個人のサイト」を書く
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { POINT_EVENTS, POINT_SOURCES, POINT_CAPS, POINT_MIN_YEN, POINT_MAX_SHOPS } from '../data/point.mjs';
import { marathonPoints, pointReach } from '../lib/point.mjs';
import { fmt } from '../lib/number.mjs';

const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
const capName = (c) => (c >= 10000 ? `${c / 10000}万` : fmt(c));
const EX = marathonPoints({ total: 30000, shops: 5, cap: 7000, minYen: POINT_MIN_YEN, maxShops: POINT_MAX_SHOPS });

// 店舗の数：大きな −／＋ と、名前を中に書いたまん中の欄（ほかの欄と左右のはしをそろえる）
const STEPPER = `<div class="stepper box-stepper">
      <button type="button" class="step-btn" id="shops-minus" aria-label="店舗を1つへらす">${icon('<path d="M5 12h14"/>')}</button>
      <div class="field box-field" id="f-shops"><label for="shops">店舗</label><div class="input"><input id="shops" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="5" data-hint="1店舗1,000円以上の注文がある店の数"><span class="unit">店</span></div></div>
      <button type="button" class="step-btn" id="shops-plus" aria-label="店舗を1つふやす">${icon('<path d="M5 12h14M12 5v14"/>')}</button>
    </div>`;

const CAP_TILES = `<div class="tiles tiles-3" role="group" aria-label="上限">
      ${POINT_CAPS.map((c) => `<button type="button" class="tile" data-cap="${c}" aria-pressed="false"><b>${capName(c)}</b><small>上限</small></button>`).join('\n      ')}
    </div>`;

// スタンプカードの10マス（えらんだ店舗の数だけ丸。11店舗からも10マスのまま）
const STAMPS = Array.from({ length: POINT_MAX_SHOPS }, (_, i) => `<span class="pt-stamp" id="st-${i}">${i + 1}</span>`).join('');

// 上限に届く合計（税込）の早見表
const REACH_ROWS = Array.from({ length: POINT_MAX_SHOPS - 1 }, (_, i) => i + 2)
  .map((n) => `<tr><td class="num">${n}店舗</td><td class="num">${n}倍</td>${POINT_CAPS.map((c) => `<td class="num">${fmt(pointReach(n, c))}</td>`).join('')}</tr>`)
  .join('\n');

// 付与日と有効期限がわかっている、いちばん新しい回（よくある質問に出す）
const GRANT = [...POINT_EVENTS].reverse().find((e) => e.grant && e.expires);
const mdJa = (s) => `${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;

const EVENT_ROWS = POINT_EVENTS.map(
  (e) => `<tr><td><span class="nw">${esc(e.name)}</span><br><span class="nw">${jaDate(e.start)} ${e.start.slice(11)}〜</span><wbr><span class="nw">${jaDate(e.end)} ${e.end.slice(11)}</span></td><td class="num nw">${e.cap ? fmt(e.cap) : '公式で確かめる'}</td></tr>`,
).join('\n');

const FAQS = [
  {
    q: '1店舗はどう数えますか？',
    a: '<p>1回の注文が税込1,000円以上で1店舗です。同じ店の注文は合計で数え、送料やラッピング料は入りません。予約商品や定期購入は<a href="/point/taishou/">買いまわりの1店舗の判定</a>で確かめられます。</p>',
  },
  {
    q: '何店舗まで増えますか？',
    a: '<p>10店舗で10倍です。11店舗より多くても10倍のままです。回によってちがうことがあるので、公式のページで確かめてください。</p>',
  },
  {
    q: '上限はいくらですか？',
    a: '<p>回によって、5,000・7,000・10,000ポイントのどれかです。今回の上限は、公式のページで確かめてからえらんでください。</p>',
  },
  {
    q: 'エントリーは買ったあとでもいいですか？',
    a: '<p>期間中にエントリーすれば、エントリーの前の買い物も対象になります。ポイントアップの期間の外で買った分は入りません。</p>',
  },
  {
    q: '買う順番で変わりますか？',
    a: '<p>変わりません。期間の合計の金額と店舗の数で決まり、はじめに買った店にも最後の倍率がかかります。</p>',
  },
  {
    q: 'ふるさと納税は1店舗に数えますか？',
    a: '<p>数えません。2025年10月1日からの楽天ふるさと納税の寄付は、店舗の数にも、ポイントの計算にも入りません。</p>',
  },
  {
    q: 'なぜ税込で入れるのですか？',
    a: '<p>1店舗の1,000円は税込で数え、ポイントは税抜の金額にかかるからです。このツールは税込を10％で割って税抜にするので、食品が多いと少し多めに出ます。</p>',
  },
  {
    q: 'クーポンやポイントで払った分は？',
    a: '<p>クーポンで値引きされたあとの金額を入れます。ポイントで払った分も、支払いの金額に入ります。</p>',
  },
  {
    q: 'キャンセルしたら？',
    a: '<p>特典をつける時点でキャンセルされている注文は、キャンペーンの対象になりません。</p>',
  },
  {
    q: 'SPUの分は入っていますか？',
    a: '<p>入っていません。SPUの上限は買いまわりとは別に数え、<a href="/point/spu/">SPUのポイント計算</a>で出せます。</p>',
  },
  {
    q: 'ポイントはいつもらえて、いつまで使えますか？',
    a: `<p>通常の1倍の分は、買った日からおよそ20日後です。買いまわりの特典は期間限定ポイントで、${GRANT ? `${mdJa(GRANT.start)}からの回は${mdJa(GRANT.grant)}ごろにつき、${mdJa(GRANT.expires)}まで使えます` : 'キャンペーンが終わった翌月の15日ごろにつきます'}。</p>`,
  },
  {
    q: 'スーパーSALEも同じ計算ですか？',
    a: '<p>買いまわりの数え方は同じで、1店舗1,000円以上・送料をのぞく・期間の合計で決まります。上限は回ごとにちがうので、公式のページで確かめてください。</p>',
  },
  {
    q: 'これは楽天のツールですか？',
    a: '<p>いいえ。個人が作ったもので、楽天グループとは関係ありません。楽天公式のシミュレーターとも別のものです。</p>',
  },
];

const SOURCES = `<ul class="src-list">${POINT_SOURCES.map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人が作っているツールで、楽天グループとは関係ありません。キャンペーンの決まりは変わることがあるので、買う前に公式のページで確かめてください。</p>`;

export default function render() {
  const tool = toolBySlug('point');
  const path = '/point/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">買いまわりでもらえるポイントを出します。</p>

<div class="calc" id="calc" data-events="${esc(JSON.stringify(POINT_EVENTS.map(({ start, end, cap, name, grant, expires }) => ({ start, end, cap, name, grant, expires }))))}" data-min="${POINT_MIN_YEN}" data-max="${POINT_MAX_SHOPS}">
  <p class="pt-event" id="pt-event" hidden></p>
  <div class="box-rows">
    ${boxField('total', '合計', '円', '30,000', '', '税込。クーポンのあと、送料はのぞく')}
    ${STEPPER}
    ${CAP_TILES}
  </div>
  <div class="pt-card" aria-live="polite">
    <p class="pt-title">買いまわりカード<small id="r-rate"></small></p>
    <button type="button" class="clear-btn pt-clear" id="clear">クリア</button>
    <div class="pt-stamps" aria-hidden="true">${STAMPS}</div>
    <p class="pt-sum"><span class="pt-k" id="r-cap">特典</span><span class="pt-v"><b id="r-num">？</b><small>ポイント</small></span></p>
    <table class="pt-table"><tbody>
      <tr><td>通常（1倍）</td><td id="d-base">—</td></tr>
      <tr><td>上限まで</td><td id="d-left">—</td></tr>
      <tr><td id="d-reach-k">上限に届く合計</td><td id="d-reach">—</td></tr>
      <tr><td>あと1店舗で</td><td id="d-next">—</td></tr>
      <tr id="r-grant" hidden><td>付与と期限</td><td id="d-grant">—</td></tr>
    </tbody></table>
    <p class="pt-foot" id="r-foot">合計を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <p class="note">目安です。付与は楽天の計算によります。</p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>特典 ＝ 通常のポイント ×（店舗の数 − 1）</span>
<span>通常のポイント ＝ 税抜の合計の1%</span>
</div>
<p>例：合計${fmt(EX.total)}円・${EX.shops}店舗なら、税抜${fmt(EX.zeinuki)}円で通常のポイントは${fmt(EX.base)}、特典は${fmt(EX.bonus)}ポイントです。もう1店舗で1,000円ふやすと、特典は${fmt(EX.next)}ポイント増えます。</p>
<p>税抜は税込を10％で割って出し、1ポイント未満は切り捨てです。実際は注文ごとに計算するので、少しずれることがあります。</p>`,
)}

${section(
  'table',
  '上限に届く合計の早見表',
  `<div class="tbl-wrap"><table class="tbl-tight pt-quick">
<thead><tr><th class="num">店舗</th><th class="num">倍率</th>${POINT_CAPS.map((c) => `<th class="num">上限${capName(c)}</th>`).join('')}</tr></thead>
<tbody>
${REACH_ROWS}
</tbody>
</table></div>
<p class="note">税込の合計（円）です。</p>
<p>この合計より多く買っても、買いまわりの特典は上限のままです。上限をこえた分には、買いまわりの特典はつきません。</p>`,
)}

${section(
  'events',
  '開催の期間',
  `<div class="tbl-wrap"><table class="tbl-text">
<thead><tr><th>回と期間</th><th class="num">上限</th></tr></thead>
<tbody>
${EVENT_ROWS}
</tbody>
</table></div>
<p>楽天市場の公式のページで確かめた回だけをのせています。次の回の日程は、公式に出てから足します。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: 'お買い物マラソンのポイント計算｜上限の計算と上限に届く金額（スーパーSALEも・早見表）',
    description: `楽天市場のお買い物マラソンやスーパーSALEで、買い物の合計と店舗の数から特典ポイントの目安を計算します。合計${fmt(EX.total)}円・${EX.shops}店舗なら特典は${fmt(EX.bonus)}ポイントで、あと1店舗で${fmt(EX.next)}ポイントふえます。上限に届く合計もわかります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, 'お買い物マラソンの買いまわりで、合計と店舗の数から特典ポイントの目安と上限に届く金額を出すツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['point.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
