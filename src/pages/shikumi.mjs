// 楽天のポイントのコーナー：楽天のポイントのしくみ /point/shikumi/（10/23 しょーくん「楽天初心者向けが欲しい。Amazon の人は SPU をそもそも知らない」）
// 今月の楽天市場の買い物と、使っているもののチェック欄（楽天カード・楽天モバイル・5と0のつく日・お買い物マラソン5店舗）から、
// ポイントを「いつもの1倍・SPU・キャンペーン」の3段に分けて見せる。くわしい計算は SPU のポイント計算と、お買い物マラソンのポイント計算へ
// 計算は src/lib/shikumi.mjs、数字は src/data/spu.mjs・point.mjs・amazon.mjs（公式で確かめたものだけ）、例は tests/shikumi.test.mjs
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { SPU_ITEMS, SPU_SOURCES, SPU_BASE, SPU_MAX, POINT_DAY } from '../data/spu.mjs';
import { POINT_EVENTS, POINT_SOURCES, POINT_MIN_YEN, POINT_MAX_SHOPS } from '../data/point.mjs';
import { AMAZON_CARD, AMAZON_SOURCES } from '../data/amazon.mjs';
import { shikumiPoints, SHIKUMI_SHOPS } from '../lib/shikumi.mjs';
import { fmt } from '../lib/number.mjs';

const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
// お買い物マラソンの上限は、公式で確かめたいちばん新しい回の上限
const CAP = [...POINT_EVENTS].reverse().find((e) => e.cap)?.cap ?? 7000;
const CFG = { items: SPU_ITEMS, base: SPU_BASE, dayRate: POINT_DAY.rate, dayCap: POINT_DAY.cap, cap: CAP, minYen: POINT_MIN_YEN, maxShops: POINT_MAX_SHOPS };
const EX = shikumiPoints({ total: 30000, card: true, mobile: true, day: true, marathon: true }, CFG);
const EX0 = shikumiPoints({ total: 30000 }, CFG);

const CHECKS = [
  ['card', '楽天カード', 'SPU +2倍'],
  ['mobile', '楽天モバイル', 'SPU +4倍'],
  ['day', '5と0のつく日', `+${POINT_DAY.rate}倍`],
  ['marathon', `マラソン${SHIKUMI_SHOPS}店舗`, `+${SHIKUMI_SHOPS - 1}倍`],
]
  .map(([k, name, small]) => `<button type="button" class="spu-chk" data-k="${k}" aria-pressed="false"><span>${name}</span><small>${small}</small></button>`)
  .join('\n    ');

// 3段（上から キャンペーン・SPU・いつもの1倍）
const FLOORS = [
  ['camp', 'キャンペーン', 'sk-floor is-soft'],
  ['spu', 'SPU', 'sk-floor'],
  ['base', 'いつもの1倍', 'sk-floor is-ink'],
]
  .map(([k, name, cls]) => `<li class="${cls}"><span class="sk-k">${name}</span><span class="sk-bar"><i id="b-${k}"></i></span><b id="v-${k}">—</b></li>`)
  .join('\n      ');

const FAQS = [
  {
    q: 'SPUとは何ですか？',
    a: `<p>スーパーポイントアッププログラムの略で、楽天のサービスを使うほど、楽天市場の買い物のポイントの倍率が上がるしくみです。いまは全部そろうと${SPU_MAX}倍で、サービスごとに1か月の上限があります。</p>`,
  },
  {
    q: 'お買い物マラソンとは何ですか？',
    a: '<p>期間中にエントリーして、1,000円以上買った店の数だけポイントの倍率が上がる楽天市場のキャンペーンです。10店舗で10倍になり、特典には回ごとの上限があります。</p>',
  },
  {
    q: 'エントリーとは何ですか？',
    a: '<p>キャンペーンのページで「エントリー」を押して参加することです。お買い物マラソンや5と0のつく日は、エントリーしないと特典がつきません。</p>',
  },
  {
    q: '期間限定ポイントとは何ですか？',
    a: '<p>使える期限が決まっているポイントです。SPUやキャンペーンでふえる分の多くは期間限定ポイントで、SPUの分は付与された月の翌月末まで使えます。</p>',
  },
  {
    q: 'ポイントは何に使えますか？',
    a: '<p>1ポイント1円として使えます。楽天ペイを使うと、コンビニやスーパーなど街の店でも使えます。</p>',
  },
  {
    q: 'Amazonのポイントとのちがいは？',
    a: `<p>Amazonは商品ごとにポイントの付与率が決まっていて、商品ページに表示されます。楽天市場は、使っているサービスやキャンペーンで、買う人ごとに倍率が上がります。Amazon Mastercardで払うと、Amazonではプライム会員は${AMAZON_CARD.prime}%、会員でない人は${AMAZON_CARD.normal}%です。</p>`,
  },
  {
    q: 'これは楽天のツールですか？',
    a: '<p>いいえ。個人が作ったもので、楽天グループとは関係ありません。楽天公式のシミュレーターとも別のものです。</p>',
  },
];

const SRC = [
  SPU_SOURCES[0],
  POINT_SOURCES.find((s) => s.url.endsWith('/marathon/')),
  POINT_SOURCES.find((s) => s.url.endsWith('/guide/')),
  POINT_DAY,
  { name: '楽天カード「ポイントの使い方」', url: 'https://www.rakuten-card.co.jp/point/howto_use/', checked: '2026-10-23', what: '1ポイント1円・楽天ペイ' },
  ...AMAZON_SOURCES,
].filter(Boolean);
const SOURCES = `<ul class="src-list">${SRC.map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人が作っているツールで、楽天グループやAmazonとは関係ありません。倍率や条件は変わることがあるので、公式のページで確かめてください。</p>`;

export default function render() {
  const tool = toolBySlug('point-shikumi');
  const path = '/point/shikumi/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">楽天のポイントを3つに分けて出します。</p>

<div class="calc" id="calc" data-cap="${CAP}">
  <div class="box-rows">
    ${boxField('total', '今月の買い物', '円', '30,000', '', '楽天市場の税込の合計。送料はのぞく')}
  </div>
  <div class="pt-card" aria-live="polite">
    <p class="pt-title">今月のポイント<small id="r-rate">${SPU_BASE}倍</small></p>
    <button type="button" class="clear-btn pt-clear" id="clear">クリア</button>
    <ol class="sk-floors" aria-label="ポイントの内わけ">
      ${FLOORS}
    </ol>
    <p class="pt-sum"><span class="pt-k">ポイント</span><span class="pt-v"><b id="r-num">？</b><small>ポイント</small></span></p>
    <p class="pt-foot" id="r-foot">今月の買い物を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="spu-list sk-list" role="group" aria-label="使っているもの">
    ${CHECKS}
  </div>
  <p class="note">目安です。付与は楽天の計算によります。</p>
  <div class="calc-tools"><a class="tool-btn tool-link" href="/point/spu/">SPUの計算</a><a class="tool-btn tool-link span-2" href="/point/">お買い物マラソンの計算</a></div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'shikumi',
  '楽天市場のポイントの3つのしくみ',
  `<div class="tbl-wrap"><table class="tbl-text">
<thead><tr><th>しくみ</th><th>ふえ方</th></tr></thead>
<tbody>
<tr><td class="nw">いつもの1倍</td><td>楽天会員なら、楽天市場で税抜100円ごとに1ポイントつきます。</td></tr>
<tr><td class="nw">SPU</td><td>楽天カードで＋2倍、楽天モバイルで＋4倍のように、楽天のサービスを使うと楽天市場の倍率が上がります。サービスごとに1か月の上限があります。</td></tr>
<tr><td class="nw">キャンペーン</td><td>お買い物マラソンと楽天スーパーSALEは、1,000円以上買った店の数で倍率が上がります。5と0のつく日は、エントリーして楽天カードで払うと＋${POINT_DAY.rate}倍です。</td></tr>
</tbody>
</table></div>
<p>3つは重ねてつきます。SPUとキャンペーンでふえる分の多くは期間限定ポイントで、使える期限があります。SPUのサービスごとの倍率と上限は<a href="/point/spu/">SPUのポイント計算</a>に、買いまわりの上限に届く額は<a href="/point/">お買い物マラソンのポイント計算</a>にまとめました。</p>`,
)}

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>ポイント ＝ いつもの1倍 ＋ SPU ＋ キャンペーン</span>
<span>いつもの1倍 ＝ 税抜の額 × 1%</span>
</div>
<p>SPUとキャンペーンは、税抜の額に倍率をかけて、それぞれの上限までにします。楽天カードの通常分だけは税込の額にかかります。お買い物マラソンは${SHIKUMI_SHOPS}店舗で＋${SHIKUMI_SHOPS - 1}倍、上限は${fmt(CAP)}ポイントとして計算しています。5と0のつく日の上限は1か月${fmt(POINT_DAY.cap)}ポイントです。</p>
<p>例：今月の買い物が${fmt(EX.total)}円なら、いつもの1倍だけでは${fmt(EX0.points)}ポイントです。楽天カード・楽天モバイルを使って、5と0のつく日にお買い物マラソンで${SHIKUMI_SHOPS}店舗で買うと${EX.rate}倍で、${fmt(EX.points)}ポイントです。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '楽天のポイントのしくみ｜SPUとお買い物マラソンとは（はじめての人向けに計算で）',
    description: '楽天市場のポイントが「いつもの1倍・SPU・キャンペーン」の3つでふえるしくみを、今月の買い物の額から計算して見せます。楽天カード・楽天モバイル・5と0のつく日・お買い物マラソンでどれだけふえるか、Amazonとのちがいものせています。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '楽天市場のポイントを、いつもの1倍・SPU・キャンペーンの3つに分けて目安を出す、はじめての人向けのツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['shikumi.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
