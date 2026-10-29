// FX の3つのページ（証拠金維持率・ロスカット・スワップ）。計算カードの部品は src/fx.mjs、計算は src/lib/fx.mjs
// むずかしい言葉は使わない。ロスカットは％より金額（あと何円の損か）で見せる（しょーくんの方針・10/18）
// 証拠金維持率は「口座のお金で、レバレッジ何倍（何通貨）にすると何％か」、ロスカットは「あと何円の損か」（10/19）
// ページに載せる計算例は tests/fx.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { fxTop, fxTopPair, qtyTiles, noteAndNoscript } from '../fx.mjs';
import { boxField } from '../fields.mjs';
import { stair, band, zBox } from '../zukai.mjs';
import { FX_PAIRS, FX_MAX_LEV, FX_LOT_PCTS, swapPerDay, fxSwapEstimate, fxRatio, fxPosition, fxLot, swapText, rateDigits, qtyText } from '../lib/fx.mjs';
import { fmt } from '../lib/number.mjs';
import { POLICY_RATES, FX_RATES_CHECKED, FX_SPOT_DATE, FX_SPOT_URL } from '../data/fx-swap.mjs';

// いまのレートの欄のうすい例（参考のレート。通貨ペアを変えると、スクリプトがその通貨ペアの数字にする）
const RATE_EX = FX_PAIRS[0].example.toFixed(rateDigits(FX_PAIRS[0].example));
const CAUTION = '<p class="note">FXの会社ごとにルールが違うので、目安です。</p>';
// 説明文（meta description）の例。本文の計算例と同じ（tests/fx.test.mjs）
const DESC_IJI = fxRatio({ money: 100000, rate: 150, lev: 10 });
const DESC_CUT = fxPosition({ money: 100000, qty: 10000, rate: 150 });
const DESC_LOT = fxLot({ money: 100000, loss: 2000, width: 0.2, rate: 150 });
const DESC_LOT2 = fxLot({ money: 100000, loss: 2000, width: 0.5, rate: 150 });
const DESC_SWAP = fxSwapEstimate({ pair: FX_PAIRS[0].id, side: 'buy', qty: 10000 });
// 図解（#83）：4つのページの絵の式と帯の図（口座のお金を、取引に必要なお金と余裕・損に分ける）。数字は tests/zukai-shigoto.test.mjs
const man = (x) => `${fmt(x / 10000, 1).replace(/\.0$/, '')}万円`;
const SWAP_EX = swapPerDay(10000, 150, 3);
export const Z_FX = { ijiNeed: DESC_IJI.need, iji: DESC_IJI.ratio, qty: qtyText(DESC_IJI.qty), cutNeed: DESC_CUT.need, room: DESC_CUT.room, cutPrice: DESC_CUT.buyPrice, swap: Math.round(SWAP_EX), lotQty: DESC_LOT.qty, lotNeed: DESC_LOT.need };
const IJI_ZUKAI = stair(zBox('口座のお金 10万円', 'レバレッジ10倍'), { b: `÷ ${man(DESC_IJI.need)}`, small: '取引額100万円 × 4％' }, zBox('維持率', `${fmt(DESC_IJI.ratio)}％`, true), ['取引額 ＝ レート × 通貨の量', 'レバレッジ ＝ 取引額 ÷ 口座のお金', '取引に必要なお金 ＝ 取引額 × 4％', '維持率 ＝ 口座のお金 ÷ 取引に必要なお金 × 100', `例：口座のお金10万円で、150円のドルをレバレッジ10倍。取引額は100万円で約${qtyText(DESC_IJI.qty)}通貨、取引に必要なお金は${man(DESC_IJI.need)}、維持率は${fmt(DESC_IJI.ratio)}％です。`], `ドル円150円なら 約${qtyText(DESC_IJI.qty)}通貨`);
const IJI_BAND = band({ head: '口座のお金 10万円', parts: [{ w: 40, text: `必要 ${man(DESC_IJI.need)}` }, { w: 60, kind: 'alt', text: '余裕 6万円' }], ruler: [[0, '0'], [40, '4万'], [100, '10万']], ans: `10万 ÷ 4万 → 維持率 <b>${fmt(DESC_IJI.ratio)}％</b>`, label: '口座のお金10万円の帯を、取引に必要なお金4万円と余裕6万円に分けた図' });
const CUT_ZUKAI = stair(zBox('口座のお金 10万円', '150円のドルを1万通貨'), { b: `− ${man(DESC_CUT.cutMoney)}`, small: '必要なお金 × 基準100％' }, zBox('ロスカットまでの損', `約${man(DESC_CUT.room)}`, true), ['取引に必要なお金 ＝ レート × 通貨の量 × 4％', '維持率 ＝ 口座のお金 ÷ 取引に必要なお金 × 100', 'ロスカットまでの損 ＝ 口座のお金 − 取引に必要なお金 × 基準', `例：口座のお金10万円で、150円のドルを1万通貨。取引に必要なお金は${man(DESC_CUT.need)}、維持率は約167％です。`], `買いなら、レート約${fmt(DESC_CUT.buyPrice)}円が目安`);
const CUT_BAND = band({ head: '口座のお金 10万円', parts: [{ w: 60, text: `基準 ${man(DESC_CUT.cutMoney)}` }, { w: 40, kind: 'off', text: '耐えられる損' }], ruler: [[0, '0'], [60, '6万'], [100, '10万']], ans: `ロスカットまで → あと <b>約${man(DESC_CUT.room)}の損</b>`, label: '口座のお金10万円の帯を、ロスカットの基準6万円と耐えられる損4万円に分けた図' });
const SWAP_ZUKAI = stair(zBox('150円のドルを1万通貨', '金利の差 3％'), { b: '× 3％ ÷ 365', small: '150万円の1年の金利を日割り' }, zBox('1日のスワップ', `約${Math.round(SWAP_EX)}円`, true), ['1日のスワップ ＝ 通貨の量 × レート × 金利の差 ÷ 365', '金利の差 ＝ 買う通貨の金利 − 売る通貨の金利', `例：金利の差が3％で、1ドル150円のドルを1万通貨買うと、150万円 × 3％ ÷ 365 で1日 約${Math.round(SWAP_EX)}円です。`], `1年で約${fmt(Math.round(SWAP_EX * 365))}円・会社ごとにちがう目安`);
const LOT_ZUKAI = stair(zBox('口座のお金10万円の2％', '許せる損 2,000円'), { b: '÷ 0.20円', small: '損切りの幅' }, zBox('通貨の量', `${qtyText(DESC_LOT.qty)}通貨`, true), ['許せる損 ＝ 口座のお金 × ％', '通貨の量 ＝ 許せる損 ÷ 損切りの幅', '取引に必要なお金 ＝ レート × 通貨の量 × 4％', `例：口座のお金10万円の2％は2,000円です。損切りの幅が0.20円なら、2,000 ÷ 0.20 ＝ ${qtyText(DESC_LOT.qty)}通貨で、取引に必要なお金は${qtyText(DESC_LOT.need)}円です。`], `取引に必要なお金 ${man(DESC_LOT.need)}`);
const LOT_BAND = band({ head: '口座のお金 10万円', parts: [{ w: 98, kind: 'alt', text: '損切りしても残る 98,000円' }, { w: 2, kind: 'off' }], ruler: [[0, '0'], [100, '10万']], ans: `損切りで減るのは2％ → <b>2,000円</b>`, label: '口座のお金10万円の帯を、損切りしても残る98,000円と許せる損2,000円に分けた図' });
const jpDate = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${m}月${d}日`; };
// スワップの目安の表：通貨ペアごとに、その通貨の政策金利（中央銀行へのリンク＝出典）と、1万通貨を買ったときの1日の額（src/data/fx-swap.mjs から作る）
const bankLink = (c) => `<a href="${POLICY_RATES[c].url.replace(/&/g, '&amp;')}">${fmt(POLICY_RATES[c].rate, 3)}％</a>`;
const SWAP_ROWS = FX_PAIRS.map((p) => {
  const r = fxSwapEstimate({ pair: p.id, side: 'buy', qty: 10000 });
  return `<tr><td>${p.name}</td><td class="num">${bankLink(p.cur)}</td><td class="num">${r.day < 0 ? '払う ' : ''}約${swapText(r.day)}円</td></tr>`;
}).join('\n');
// 取引に必要なお金（取引額の4％）の出典
const SRC_FSA = '<p class="note">出典：<a href="https://www.fsa.go.jp/news/21/syouken/20090731-6.html">金融庁</a></p>';

// 結果は、トレードアプリの画面（10/21 しょーくん「FXならチャート画面風」）。インラインSVG で、外の画像は読まない
// 証拠金維持率は口座の画面（大きな半円のメーターの中に維持率）、ロスカットはチャート（いまのレートとロスカットのライン）、
// スワップはチャート（1年でたまる額の階段の線）。答えの数字は、ロスカットはチャートの上の段（1画面に入るように）、スワップはチャートの中の左上（払うときは左下）
const GRID = '<path class="chart-grid" d="M0 25H100M0 50H100M0 75H100M25 0V100M50 0V100M75 0V100"/>';
const ARC = 'M20 112A90 90 0 0 1 200 112'; // メーターの半円（中心 110,112・半径 90）
const ACCOUNT = `<div class="chart" aria-live="polite">
    <p class="chart-bar"><span id="c-pair">ドル円</span><span class="cb-r"><span>口座の状況</span><button type="button" class="clear-btn" id="clear">クリア</button></span></p>
    <div class="acct">
      <svg class="acct-gauge" viewBox="0 0 220 126" aria-hidden="true">
        <path class="gauge-arc" d="${ARC}"/><path class="gauge-zone" d="${ARC}" pathLength="500" stroke-dasharray="100 600"/><path class="gauge-val" id="g-val" d="${ARC}" pathLength="500" stroke-dasharray="0 600"/>
        <text x="20" y="125" text-anchor="middle">0</text><text x="24" y="47" text-anchor="end">100</text><text x="200" y="125" text-anchor="middle">500%</text>
      </svg>
      <p class="acct-ans"><span class="fx-cap" id="r-cap">証拠金維持率</span><span class="fx-big" id="r-big"><span id="r-num">？</span><small>％</small></span></p>
    </div>
    <p class="chart-foot"><span id="r-amount"></span><span id="r-need">口座のお金を入れてください</span></p>
  </div>`;
const CUT_CHART = `<div class="chart" aria-live="polite">
    <p class="chart-bar"><span id="c-pair">ドル円・買い</span><span class="cb-r"><span id="c-ratio"></span><button type="button" class="clear-btn" id="clear">クリア</button></span></p>
    <div class="chart-ans is-static"><p class="fx-cap" id="r-cap">ロスカットまで、あと</p><p class="fx-big" id="r-big"><span id="r-num">？</span><small id="r-unit">円の損</small></p></div>
    <div class="chart-plot is-short">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${GRID}<rect class="chart-band" id="c-band" x="0" y="0" width="100" height="0"/><path class="chart-cut" id="c-cut" d=""/><path class="chart-now" id="c-now" d=""/><path class="chart-line" id="c-line" d=""/></svg>
      <span class="chart-dot" id="c-dot" hidden></span><span class="chart-tag is-now" id="t-now" hidden></span><span class="chart-tag is-cut" id="t-cut" hidden></span>
    </div>
    <p class="chart-foot"><span id="r-price"></span><span id="r-need">通貨の量をえらんでください</span></p>
  </div>`;
const SWAP_CHART = `<div class="chart" aria-live="polite">
    <p class="chart-bar"><span id="c-pair">ドル円・買い</span><span class="cb-r"><span id="c-diff"></span><button type="button" class="clear-btn" id="clear">クリア</button></span></p>
    <div class="chart-plot has-axis">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${GRID}<path class="chart-area" id="s-area" d=""/><path class="chart-step" id="s-line" d=""/></svg>
      <span class="chart-dot" id="d-month" hidden></span><span class="chart-dot" id="d-year" hidden></span><span class="chart-label" id="t-month" hidden></span><span class="chart-label" id="t-year" hidden></span>
      <div class="chart-ans" id="c-ans"><p class="fx-cap" id="r-cap">1日に</p><p class="fx-big" id="r-big"><span id="r-num">？</span><small id="r-unit">円</small></p></div>
      <p class="chart-axis"><span>0日</span><span>半年</span><span>1年</span></p>
    </div>
    <p class="chart-foot"><span id="r-per">通貨の量をえらんでください</span><span id="r-base"></span></p>
  </div>`;

// ロット：許せる損のマス（口座のお金の何％か。口座のお金を入れると、下の小さな字が円になる）
const LOT_TILES = `<div class="tiles tiles-4" role="group" aria-label="口座のお金の何％を許せる損にするか">${FX_LOT_PCTS.map(
  (p) => `<button type="button" class="tile" data-pct="${p}" aria-pressed="false"><b>${p}%</b><small>口座の</small></button>`,
).join('')}</div>`;
const LOT_CHART = `<div class="chart" aria-live="polite">
    <p class="chart-bar"><span id="c-pair">ドル円</span><span class="cb-r"><span id="c-ratio"></span><button type="button" class="clear-btn" id="clear">クリア</button></span></p>
    <div class="chart-ans is-static"><p class="fx-cap" id="r-cap">取引できる通貨の量</p><p class="fx-big" id="r-big"><span id="r-num">？</span><small id="r-unit">通貨</small></p></div>
    <div class="chart-plot is-short">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${GRID}<rect class="chart-band" id="c-band" x="0" y="0" width="100" height="0"/><path class="chart-cut" id="c-cut" d=""/><path class="chart-now" id="c-now" d=""/><path class="chart-line" id="c-line" d=""/></svg>
      <span class="chart-dot" id="c-dot" hidden></span><span class="chart-tag is-now" id="t-now" hidden></span><span class="chart-tag is-cut" id="t-cut" hidden></span><span class="chart-label lot-loss" id="t-loss" hidden></span>
    </div>
    <p class="chart-foot"><span id="r-price"></span><span id="r-need">口座のお金を入れてください</span></p>
  </div>`;
// ロットの計算例の表：損切りの幅 × 許せる損（1,000通貨に届かないときは —）
const LOT_LOSSES = [1000, 2000, 5000];
const LOT_ROWS = [0.1, 0.2, 0.3, 0.5, 1, 2].map((w) => `<tr><td>${w.toFixed(2)}円</td>${LOT_LOSSES.map((l) => {
  const r = fxLot({ money: 1000000, loss: l, width: w, rate: 150 });
  return `<td class="num">${r.under ? '—' : `${qtyText(r.qty)}通貨`}</td>`;
}).join('')}</tr>`).join('\n');

const PAGES = [
  {
    slug: 'fx-iji-ritsu',
    title: '証拠金維持率の計算｜レバレッジ何倍で何％になるか',
    description:
      `FXの証拠金維持率を、口座のお金とレバレッジか通貨の量から計算します。口座のお金10万円で1ドル150円をレバレッジ10倍なら約${qtyText(DESC_IJI.qty)}通貨で、維持率は${fmt(DESC_IJI.ratio, 0)}％です。レバレッジは${FX_MAX_LEV}倍まで入れられます。`,
    lead: 'レバレッジや量から、維持率を計算します。',
    ld: '口座のお金・レート・レバレッジか通貨の量から、取引したときの証拠金維持率を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="iji">
  ${fxTopPair()}
  <div class="fx-inputs">
    ${boxField('money', '口座のお金', '円', '100,000', '', 'アプリの有効証拠金。まだなら入金した額')}
    ${boxField('rate', 'いまのレート', '円', RATE_EX)}
    <div class="pair pair-lev">${boxField('lev', 'レバレッジ', '倍', '10')}${boxField('qty', '通貨の量', '通貨', '10,000')}</div>
  </div>
  ${ACCOUNT}
  ${noteAndNoscript(toolBySlug('fx-iji-ritsu'))}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `${IJI_ZUKAI}
<p>取引した直後の維持率は、2,500 ÷ レバレッジ（％）になります。</p>
${CAUTION}
${SRC_FSA}`,
    )}
${section(
  'examples',
  '計算例',
  `${IJI_BAND}<div class="tbl-wrap"><table>
<thead><tr><th>レバレッジ</th><th class="num">通貨の量</th><th class="num">維持率</th></tr></thead>
<tbody>
<tr><td>1倍</td><td class="num">666通貨</td><td class="num">2,500％</td></tr>
<tr><td>5倍</td><td class="num">3,333通貨</td><td class="num">500％</td></tr>
<tr><td>10倍</td><td class="num">6,666通貨</td><td class="num">250％</td></tr>
<tr><td>25倍</td><td class="num">16,666通貨</td><td class="num">100％</td></tr>
</tbody>
</table></div>
<p>口座のお金10万円、ドル円150円のときです。</p>`,
)}`,
    faqs: [
      {
        q: '証拠金維持率とは何ですか？',
        a: '<p>口座のお金が、取引に必要なお金の何％あるかです。損が出て低くなると、ロスカットに近づきます。</p>',
      },
      {
        q: 'レバレッジとは何ですか？',
        a: '<p>口座のお金の何倍の金額で取引しているかです。日本の個人のFXは25倍までです。</p>',
      },
      {
        q: '1ロットは何通貨ですか？',
        a: '<p>会社によって、1,000通貨や1万通貨などと違います。このツールでは、ロットではなく通貨の数で入れてください。</p>',
      },
      {
        q: '「口座のお金」には何を入れますか？',
        a: '<p>アプリの「有効証拠金」です。まだ取引していないときは、入金したお金です。</p>',
      },
      {
        q: '取引に必要なお金が、取引額の4％なのはなぜですか？',
        a: '<p>日本の個人のFXは、レバレッジが25倍までと決まっているからです。1÷25＝4％です。4％は最低の決まりなので、会社や通貨によってはもっと多いこともあります。</p>',
      },
    ],
  },
  {
    slug: 'fx-losscut',
    title: 'ロスカットの計算｜あと何円の損でロスカットか・追証の目安',
    description:
      `FXのロスカットまで、あと何円の損かを計算します。口座のお金10万円で1ドル150円を1万通貨買うなら、あと${fmt(DESC_CUT.buyRoom)}円の損、${fmt(DESC_CUT.buyPrice)}円でロスカットです（基準${DESC_CUT.cut}％）。売りのときと、足りないお金も出します。`,
    lead: 'ロスカットまで、あと何円の損か計算します。',
    ld: '口座のお金・通貨の量・レートから、ロスカットまでの金額とロスカットになるレートを出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="cut">
  ${fxTop()}
  <div class="field" id="f-tiles"><p class="sr-only" id="l-qty">通貨の量</p>${qtyTiles('l-qty')}</div>
  <div class="fx-inputs">
    ${boxField('money', '口座のお金', '円', '100,000', '', 'アプリの有効証拠金。入金に損益を足した額')}
    <div class="pair">${boxField('rate', 'いまのレート', '円', RATE_EX)}${boxField('cut', 'ロスカットの基準', '％', '100', '100', '会社で違います。50％や100％が多いです')}</div>
  </div>
  ${CUT_CHART}
  ${noteAndNoscript(toolBySlug('fx-losscut'))}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `${CUT_ZUKAI}
<p>売りは、レートが上がると取引に必要なお金も増えるので、少し早くロスカットになります。その分も入れて計算しています。</p>
${CAUTION}
${SRC_FSA}`,
    )}
${section(
  'examples',
  '計算例',
  `${CUT_BAND}<div class="tbl-wrap"><table>
<thead><tr><th>口座のお金・量</th><th class="num">買い</th><th class="num">売り</th></tr></thead>
<tbody>
<tr><td>10万円・1万通貨</td><td class="num">4万円</td><td class="num">約3.8万円</td></tr>
<tr><td>30万円・1万通貨</td><td class="num">24万円</td><td class="num">約23万円</td></tr>
<tr><td>10万円・1,000通貨</td><td class="num">9.4万円</td><td class="num">約9万円</td></tr>
</tbody>
</table></div>
<p>ドル円150円、ロスカットの基準100％のときの、ロスカットまでに耐えられる損の額です。</p>`,
)}`,
    faqs: [
      {
        q: 'ロスカットとは何ですか？',
        a: '<p>損が大きくなったとき、FXの会社が取引を自動で終わらせることです。損がふくらみすぎないようにするためです。</p>',
      },
      {
        q: '「口座のお金」には何を入れますか？',
        a: '<p>アプリの「有効証拠金」です。入金したお金に、いまの損や得を足した額です。</p>',
      },
      {
        q: 'ロスカットの基準は何％ですか？',
        a: '<p>会社によって違い、50％や100％が多いです。自分で選べる会社もあるので、使っている会社のページで確かめてください。</p>',
      },
      {
        q: '追証とは何ですか？',
        a: '<p>口座のお金が足りなくなったとき、FXの会社から求められる追加の入金です。追証がある会社の多くは、1日の取引の終わりに維持率が100％を下回ると求めます。基準を100％にすると、足りないお金がわかります。</p>',
      },
      {
        q: '取引に必要なお金が、取引額の4％なのはなぜですか？',
        a: '<p>日本の個人のFXは、レバレッジが25倍までと決まっているからです。1÷25＝4％です。4％は最低の決まりなので、会社や通貨によってはもっと多いこともあります。</p>',
      },
      {
        q: 'ロスカットになれば、損はそこで止まりますか？',
        a: '<p>相場が急に大きく動くと、口座のお金より大きな損が出ることがあります。そのときは、足りない分を払う必要があります。</p>',
      },
    ],
  },
  {
    slug: 'fx-swap',
    title: 'スワップポイントの計算｜1日いくらもらえるか（目安）',
    description:
      `FXのスワップポイントの目安を、2つの国の政策金利の差から計算します。${FX_PAIRS[0].name}を1万通貨買うと1日約${swapText(DESC_SWAP.day)}円です。金利は${jpDate(FX_RATES_CHECKED)}に確かめたもので、${FX_PAIRS.length}の通貨ペアの1日の目安の表もあります。`,
    lead: '1日にいくらもらえるか、目安を計算します。',
    ld: '通貨ペア・買いか売りか・通貨の量から、金利の差でスワップポイントの目安を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="swap">
  ${fxTop()}
  <div class="field" id="f-tiles"><p class="sr-only" id="l-qty">通貨の量</p>${qtyTiles('l-qty')}</div>
  ${SWAP_CHART}
  ${noteAndNoscript(toolBySlug('fx-swap'))}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `${SWAP_ZUKAI}
${CAUTION}`,
    )}
${section(
  'examples',
  '通貨ペアごとの目安',
  `<div class="tbl-wrap"><table>
<thead><tr><th>通貨ペア</th><th class="num">金利</th><th class="num">1日</th></tr></thead>
<tbody>
${SWAP_ROWS}
</tbody>
</table></div>
<p>1万通貨を買ったときです。円の金利は${bankLink('JPY')}です。金利は各国の中央銀行が${jpDate(FX_RATES_CHECKED)}までに決めたもの、レートは${jpDate(FX_SPOT_DATE)}の<a href="${FX_SPOT_URL}">欧州中央銀行の参照レート</a>です。</p>`,
)}`,
    faqs: [
      {
        q: 'スワップポイントとは何ですか？',
        a: '<p>2つの国の金利の差で、毎日受け取ったり払ったりするお金です。金利の高い通貨を買うと受け取れることが多いです。</p>',
      },
      {
        q: '実際の額とちがうのはなぜですか？',
        a: '<p>FXの会社は、市場の金利をもとに自分で額を決めています。会社ごと・日ごとに違うので、ここの額は目安です。</p>',
      },
      {
        q: '売りだと払うのはなぜですか？',
        a: '<p>金利の高い通貨を売ると、金利の差を払う側になるからです。払う額は、もらう額より大きいことが多いです。</p>',
      },
      {
        q: '土日もスワップはつきますか？',
        a: '<p>つきます。土日の分は、水曜日などにまとめてつきます。何曜日かは会社や通貨で違います。</p>',
      },
      {
        q: '金利はいつの数字ですか？',
        a: '<p>各国の中央銀行が決めた政策金利です。毎月たしかめて、変わっていれば直しています。</p>',
      },
    ],
  },
  {
    slug: 'fx-lot',
    title: 'FXのロット計算｜許せる損と損切りの幅から通貨の量を出す',
    description:
      `FXのロット（通貨の量）を、許せる損と損切りの幅から計算します。口座のお金10万円の2％、2,000円までの損で、損切りの幅が0.20円なら${qtyText(DESC_LOT.qty)}通貨、0.50円なら${qtyText(DESC_LOT2.qty)}通貨です。取引に必要なお金が足りるかも出します。`,
    lead: '損切りの幅から、取引できる量を計算します。',
    ld: '口座のお金・許せる損・損切りの幅・レートから、取引できる通貨の量（ロット）を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="lot">
  ${fxTopPair()}
  <div class="fx-inputs">
    <div class="pair">${boxField('money', '口座のお金', '円', '100,000', '', 'アプリの有効証拠金。まだなら入金した額')}${boxField('rate', 'いまのレート', '円', RATE_EX)}</div>
    <div class="field" id="f-tiles">${LOT_TILES}</div>
    <div class="pair">${boxField('loss', '許せる損', '円', '2,000', '', '損切りになったら失ってよい額')}${boxField('width', '損切りの幅', '円', '0.20', '', '150円で買い149.5円で切るなら0.5')}</div>
  </div>
  ${LOT_CHART}
  ${noteAndNoscript(toolBySlug('fx-lot'))}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `${LOT_ZUKAI}
<p>通貨の量は、1,000通貨未満を切り捨てています。</p>
${CAUTION}
${SRC_FSA}`,
    )}
${section(
  'examples',
  '計算例',
  `${LOT_BAND}<div class="tbl-wrap"><table>
<thead><tr><th>損切りの幅</th>${LOT_LOSSES.map((l) => `<th class="num">${fmt(l)}円</th>`).join('')}</tr></thead>
<tbody>
${LOT_ROWS}
</tbody>
</table></div>
<p>上の段は許せる損です。—は1,000通貨に届かないときです。</p>`,
)}`,
    faqs: [
      {
        q: 'ロットとは何ですか？',
        a: '<p>取引する量の単位です。1ロットが1,000通貨の会社も1万通貨の会社もあるので、このツールは通貨の数で出します。</p>',
      },
      {
        q: '損切りの幅には何を入れますか？',
        a: '<p>買ったレートと、損切りするレートの差です。150.00円で買って149.50円で損切りするなら0.50円です。</p>',
      },
      {
        q: '許せる損は、口座の何％にしますか？',
        a: '<p>決まりはありません。損切りが何回か続いても、口座のお金が大きく減らない額にします。マスは1〜5％です。</p>',
      },
      {
        q: '売りのときも同じですか？',
        a: '<p>同じ量になります。売りは、いまのレートより上に損切りのラインを置きます。</p>',
      },
      {
        q: '1,000通貨未満を切り捨てるのはなぜですか？',
        a: '<p>取引の単位に合わせるためです。1通貨から取引できる会社なら、もう少し多く取引できます。</p>',
      },
      {
        q: '損切りのレートを飛びこえて動いたときは？',
        a: '<p>相場が急に動くと、決めたレートより悪いところで決済されることがあります。そのときの損は、許せる損より大きくなります。</p>',
      },
    ],
  },
];

const SCRIPTS = { 'fx-iji-ritsu': 'fx-iji.js', 'fx-losscut': 'fx-losscut.js', 'fx-swap': 'fx-swap.js', 'fx-lot': 'fx-lot.js' };

export default function render() {
  return PAGES.map((p) => {
    const tool = toolBySlug(p.slug);
    const path = `/${tool.slug}/`;
    const body = `
<h1>${tool.name}</h1>
<p class="lead">${p.lead}</p>

${p.calc}

${p.body}

${section('faq', 'よくある質問', faqHtml(p.faqs))}

${relatedHtml(tool)}
`;
    const html = page({
      path,
      title: p.title,
      description: p.description,
      breadcrumbs: [
        { name: 'ホーム', path: '/' },
        { name: tool.name, path },
      ],
      jsonLd: [toolLd(tool, p.ld), faqLd(p.faqs)],
      theme: themeOf(tool),
      ogImage: `/og/${tool.slug}.png`,
      scripts: [SCRIPTS[p.slug]],
      body,
    });
    return { path, html, sitemap: true, updated: tool.updated };
  });
}
