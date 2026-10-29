// 楽天のポイントのコーナー：楽天とAmazonのポイント比較 /point/amazon/（10/23 しょーくん「Amazon の人は SPU をそもそも知らない」。しくみのページと両方）
// 同じ額を買ったときのポイントの目安：楽天は「いつもの1倍・SPU・キャンペーン」（src/lib/shikumi.mjs）、Amazon は商品のポイントの%と Amazon Mastercard（src/lib/hikaku.mjs）
// 数字は src/data/spu.mjs・point.mjs・amazon.mjs（公式で確かめたものだけ）。例は tests/hikaku.test.mjs
// 決まり：「お得」などの言葉は使わない（/point/ の点検）。楽天や Amazon のロゴ・色を使わない。どちらとも関係のない個人のサイトと書く
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { SPU_ITEMS, SPU_SOURCES, SPU_BASE, POINT_DAY } from '../data/spu.mjs';
import { POINT_EVENTS, POINT_MIN_YEN, POINT_MAX_SHOPS } from '../data/point.mjs';
import { AMAZON_CARD, AMAZON_SOURCES } from '../data/amazon.mjs';
import { shikumiPoints, SHIKUMI_SHOPS } from '../lib/shikumi.mjs';
import { amazonPoints } from '../lib/hikaku.mjs';
import { fmt } from '../lib/number.mjs';
import { stair, zBox } from '../zukai.mjs';

const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
const CAP = [...POINT_EVENTS].reverse().find((e) => e.cap)?.cap ?? 7000;
const CFG = { items: SPU_ITEMS, base: SPU_BASE, dayRate: POINT_DAY.rate, dayCap: POINT_DAY.cap, cap: CAP, minYen: POINT_MIN_YEN, maxShops: POINT_MAX_SHOPS };
const EX_R = shikumiPoints({ total: 30000, card: true, day: true }, CFG);
const EX_A = amazonPoints({ total: 30000, pct: 1, card: true, prime: true }, AMAZON_CARD);
// 図解（#80）：同じ買い物から、楽天とAmazonの2枚のカードへ（30,000円）
export const Z_HIKAKU = { r: EX_R.points, rRate: EX_R.rate, a: EX_A.points };
const ZUKAI = stair(zBox('買い物（税込）', `${fmt(30000)}円`), { b: '×倍率・%', small: `楽天${EX_R.rate}倍・Amazon${1 + AMAZON_CARD.prime}%` }, `<div class="fz-tks">${zBox(`楽天 ${EX_R.rate}倍`, `${fmt(EX_R.points)}ポイント`, true)}${zBox(`Amazon ${1 + AMAZON_CARD.prime}%`, `${fmt(EX_A.points)}ポイント`, true)}</div>`, ['楽天 ＝ いつもの1倍 ＋ SPU ＋ キャンペーン', 'Amazon ＝ 商品のポイント ＋ Amazon Mastercard']);

const CHECKS = [
  ['card', '楽天カード', 'SPU +2倍'],
  ['acard', 'Amazonカード', `+${AMAZON_CARD.normal}%`],
  ['mobile', '楽天モバイル', 'SPU +4倍'],
  ['prime', 'プライム会員', `カードで${AMAZON_CARD.prime}%`],
  ['day', '5と0のつく日', `+${POINT_DAY.rate}倍`],
  ['marathon', `マラソン${SHIKUMI_SHOPS}店舗`, `+${SHIKUMI_SHOPS - 1}倍`],
]
  .map(([k, name, small]) => `<button type="button" class="spu-chk" data-k="${k}" aria-pressed="false"><span>${name}</span><small>${small}</small></button>`)
  .join('\n    ');

const FAQS = [
  {
    q: 'Amazonの商品のポイントはどこで見ますか？',
    a: '<p>商品ページに「◯ポイント（◯%）」と出ます。対象の商品だけで、付与率は商品ごとにちがいます。</p>',
  },
  {
    q: 'Amazon Mastercardのポイントは？',
    a: `<p>Amazon.co.jpで使うと、プライム会員は100円につき${AMAZON_CARD.prime}ポイント、会員でない人は${AMAZON_CARD.normal}ポイントです。</p>`,
  },
  {
    q: '楽天とAmazonのポイントは同じ価値ですか？',
    a: '<p>どちらも1ポイント1円として使えます。楽天もAmazonも、キャンペーンなどでふえる分には期限の短いポイントがあります。</p>',
  },
  {
    q: 'プライムデーなどのキャンペーンは入っていますか？',
    a: '<p>Amazonのポイントアップキャンペーンは入っていません。楽天は、5と0のつく日とお買い物マラソンをえらんだときだけ入ります。</p>',
  },
  {
    q: '楽天の倍率はどう決まりますか？',
    a: '<p>いつもの1倍に、楽天のサービスを使うと上がるSPUと、キャンペーンの分が重なります。<a href="/point/shikumi/">楽天のポイントのしくみ</a>にまとめました。</p>',
  },
  {
    q: 'これは楽天やAmazonのツールですか？',
    a: '<p>いいえ。個人が作ったもので、楽天グループともAmazonとも関係ありません。</p>',
  },
];

const SRC = [SPU_SOURCES[0], POINT_DAY, ...AMAZON_SOURCES];
const SOURCES = `<ul class="src-list">${SRC.map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人が作っているツールで、楽天グループやAmazonとは関係ありません。倍率や還元率は変わることがあるので、公式のページで確かめてください。</p>`;

export default function render() {
  const tool = toolBySlug('point-amazon');
  const path = '/point/amazon/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">同じ買い物のポイントをくらべます。</p>

<div class="calc" id="calc" data-cap="${CAP}">
  <div class="box-rows">
    ${boxField('total', '買い物の額', '円', '30,000', '', '税込。送料はのぞく')}
    ${boxField('apct', 'Amazonの商品のポイント', '%', '1', '', '商品ページの「◯ポイント（◯%）」の%')}
  </div>
  <div class="pt-card" aria-live="polite">
    <p class="pt-title">ポイントくらべ<small id="r-rate"></small></p>
    <button type="button" class="clear-btn pt-clear" id="clear">クリア</button>
    <ol class="sk-floors" aria-label="ポイント">
      <li class="sk-floor"><span class="sk-k">楽天</span><span class="sk-bar"><i id="b-r"></i></span><b id="v-r">—</b></li>
      <li class="sk-floor is-ink"><span class="sk-k">Amazon</span><span class="sk-bar"><i id="b-a"></i></span><b id="v-a">—</b></li>
    </ol>
    <p class="pt-sum"><span class="pt-k" id="r-k">ちがい</span><span class="pt-v"><b id="r-num">？</b><small>ポイント</small></span></p>
    <p class="pt-foot" id="r-foot">買い物の額を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="spu-list sk-list" role="group" aria-label="使っているもの">
    ${CHECKS}
  </div>
  <p class="note">目安です。付与はそれぞれの計算によります。</p>
  <div class="calc-tools"><a class="tool-btn tool-link span-3" href="/point/shikumi/">楽天のポイントのしくみ</a></div>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `${ZUKAI}
<p>楽天は税抜の額に倍率をかけ、SPUとキャンペーンはそれぞれの上限までにします。Amazonは税込の額に、商品ページの%と、Amazon Mastercardの${AMAZON_CARD.normal}%か、プライム会員なら${AMAZON_CARD.prime}%をかけます。どちらも1ポイント未満は切り捨てです。</p>
<p>例：${fmt(30000)}円を、楽天は楽天カードで5と0のつく日に買うと${EX_R.rate}倍で${fmt(EX_R.points)}ポイントです。Amazonはポイント1%の商品をプライム会員がAmazon Mastercardで買うと${fmt(EX_A.points)}ポイントです。</p>`,
)}

${section(
  'chigai',
  'ポイントのつき方のちがい',
  `<div class="tbl-wrap"><table class="tbl-text">
<thead><tr><th></th><th>楽天市場</th><th>Amazon</th></tr></thead>
<tbody>
<tr><td class="nw">いつも</td><td>税抜100円ごとに1ポイント</td><td>商品ごとに決まった%</td></tr>
<tr><td class="nw">カード</td><td>楽天カードでSPU＋2倍</td><td>Amazon Mastercardで${AMAZON_CARD.normal}%、プライム会員は${AMAZON_CARD.prime}%</td></tr>
<tr><td class="nw">ふやし方</td><td>楽天のサービスを使うSPUと、エントリーするキャンペーン</td><td>プライムデーなどのキャンペーン</td></tr>
</tbody>
</table></div>
<p>楽天市場は、使っている楽天のサービスやキャンペーンで、買う人ごとに倍率が変わります。Amazonは、同じ商品なら商品のポイントの%はだれでも同じです。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '楽天とAmazonのポイント比較｜同じ買い物でどちらが多いか計算',
    description: `同じ額を楽天市場とAmazonで買ったときのポイントの目安をくらべます。${fmt(EX_R.total)}円を楽天カードで5と0のつく日に買うと楽天は${fmt(EX_R.points)}ポイント、ポイント1%の商品をプライム会員がAmazon Mastercardで買うと${fmt(EX_A.points)}ポイントです。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '同じ額を楽天市場とAmazonで買ったときのポイントの目安をくらべるツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['hikaku.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
