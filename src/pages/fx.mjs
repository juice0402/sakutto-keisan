// FX の3つのページ（証拠金維持率・ロスカット・スワップ）。計算カードの部品は src/fx.mjs、計算は src/lib/fx.mjs
// むずかしい言葉は使わない。ロスカットは％より金額（あと何円の損か）で見せる（しょーくんの方針・10/18）
// 証拠金維持率は「口座のお金で、レバレッジ何倍（何通貨）にすると何％か」、ロスカットは「あと何円の損か」（10/19）
// ページに載せる計算例は tests/fx.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField, fxTop, fxTopPair, qtyTiles, noteAndNoscript } from '../fx.mjs';
import { FX_PAIRS, fxSwapEstimate, swapText } from '../lib/fx.mjs';
import { fmt } from '../lib/number.mjs';
import { POLICY_RATES, FX_RATES_CHECKED, FX_SPOT_DATE, FX_SPOT_URL } from '../data/fx-swap.mjs';

const CAUTION = '<p class="note">FXの会社ごとにルールが違うので、目安です。</p>';
const jpDate = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${m}月${d}日`; };
// スワップの目安の表：通貨ペアごとの金利の差と、1万通貨を買ったときの1日の額（src/data/fx-swap.mjs から作る）
const SWAP_ROWS = FX_PAIRS.map((p) => {
  const r = fxSwapEstimate({ pair: p.id, side: 'buy', qty: 10000 });
  const way = r.day > 0 ? '' : r.day < 0 ? '払う ' : '';
  return `<tr><td>${p.name}</td><td class="num">${fmt(r.diff, 2)}％</td><td class="num">${way}約${swapText(r.day)}円</td></tr>`;
}).join('\n');
const BANKS = ['JPY', ...FX_PAIRS.map((p) => p.cur)].map((c) => `<a href="${POLICY_RATES[c].url}">${POLICY_RATES[c].bank}</a>`).join('・');
// 取引に必要なお金（取引額の4％）の出典
const SRC_FSA = '<p class="note">出典：<a href="https://www.fsa.go.jp/news/21/syouken/20090731-6.html">金融庁</a></p>';

// メーター（維持率）：半円。赤いところがロスカットの基準より下（証拠金維持率のページは100％より下）。針は 0〜500％
// withRatio：メーターの下に維持率の数字を出す（ロスカットのページ。維持率のページは右の大きな数字が維持率）
const gauge = (withRatio) => `<figure class="gauge" aria-hidden="true">
  <svg viewBox="0 0 112 62"><path class="gauge-arc" d="M8 56 A48 48 0 0 1 104 56"/><path class="gauge-cut" id="g-cut" d="M8 56 A48 48 0 0 1 104 56" pathLength="500" stroke-dasharray="100 600"/><line class="gauge-needle" id="g-needle" x1="56" y1="56" x2="16" y2="56"/><circle class="gauge-hub" cx="56" cy="56" r="4"/></svg>
  ${withRatio ? '<figcaption>維持率<b id="r-ratio">？</b></figcaption>' : ''}
</figure>`;

const PAGES = [
  {
    slug: 'fx-iji-ritsu',
    title: '証拠金維持率の計算｜レバレッジ何倍で何％になるか',
    description:
      'FXの証拠金維持率を、口座のお金とレバレッジから計算します。いまのレートとレバレッジ（何倍）か通貨の量を入れると、取引できる量やレバレッジと、取引したときの維持率がわかります。',
    lead: 'レバレッジや量から、維持率を計算します。',
    ld: '口座のお金・レート・レバレッジか通貨の量から、取引したときの証拠金維持率を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="iji">
  ${fxTopPair()}
  <div class="fx-inputs">
    ${boxField('rate', 'いまのレート', '円', '150.00')}
    ${boxField('money', '口座のお金', '円', '100,000')}
    <div class="pair pair-lev">${boxField('lev', 'レバレッジ', '倍', '10')}${boxField('qty', '通貨の量', '通貨', '10,000')}</div>
  </div>
  <div class="fx-result" aria-live="polite">
    ${gauge(false)}
    <div class="fx-answer"><p class="fx-cap" id="r-cap">証拠金維持率</p><p class="fx-big" id="r-big"><span id="r-num">？</span><small id="r-unit">％</small></p></div>
    <p class="mix-foot"><span id="r-amount"></span><span id="r-need">レバレッジか通貨の量を入れてください</span></p>
  </div>
  ${noteAndNoscript}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `<div class="formula">
<span>取引額 ＝ レート × 通貨の量</span>
<span>レバレッジ ＝ 取引額 ÷ 口座のお金</span>
<span>取引に必要なお金 ＝ 取引額 × 4％</span>
<span>維持率 ＝ 口座のお金 ÷ 取引に必要なお金 × 100</span>
</div>
<p>例：口座のお金10万円で、150円のドルをレバレッジ10倍。取引額は100万円で約6,666通貨、取引に必要なお金は4万円、維持率は250％です。</p>
<p>取引した直後の維持率は、2,500 ÷ レバレッジ（％）になります。</p>
${CAUTION}
${SRC_FSA}`,
    )}
${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
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
      'FXのロスカットまで、あと何円の損まで耐えられるかを計算します。通貨ペアと買いか売りかをえらび、通貨の量・口座のお金・いまのレートを入れると、ロスカットになるレートと証拠金維持率もわかります。基準より下のときは足りないお金を出します。',
    lead: 'ロスカットまで、あと何円の損か計算します。',
    ld: '口座のお金・通貨の量・レートから、ロスカットまでの金額とロスカットになるレートを出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="cut">
  ${fxTop()}
  <div class="field" id="f-tiles"><p class="sr-only" id="l-qty">通貨の量</p>${qtyTiles('l-qty')}</div>
  <div class="fx-inputs">
    ${boxField('money', '口座のお金', '円', '100,000')}
    <div class="pair">${boxField('rate', 'いまのレート', '円', '150.00')}${boxField('cut', 'ロスカットの基準', '％', '100', '100')}</div>
  </div>
  <div class="fx-result" aria-live="polite">
    ${gauge(true)}
    <div class="fx-answer"><p class="fx-cap" id="r-cap">ロスカットまで、あと</p><p class="fx-big" id="r-big"><span id="r-num">？</span><small id="r-unit">円の損</small></p></div>
    <p class="mix-foot"><span id="r-price"></span><span id="r-need">通貨の量・口座のお金・レートを入れてください</span></p>
  </div>
  ${noteAndNoscript}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `<div class="formula">
<span>取引に必要なお金 ＝ レート × 通貨の量 × 4％</span>
<span>維持率 ＝ 口座のお金 ÷ 取引に必要なお金 × 100</span>
<span>ロスカットまでの損 ＝ 口座のお金 − 取引に必要なお金 × 基準</span>
</div>
<p>例：口座のお金10万円で、150円のドルを1万通貨。取引に必要なお金は6万円、維持率は約167％です。</p>
<p>売りは、レートが上がると取引に必要なお金も増えるので、少し早くロスカットになります。その分も入れて計算しています。</p>
${CAUTION}
${SRC_FSA}`,
    )}
${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
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
      'FXのスワップポイントの目安を計算します。通貨ペアと買いか売りか、通貨の量をえらぶと、2つの国の金利の差から、1日・1か月・1年でいくらもらえるか（払うか）がわかります。',
    lead: '1日にいくらもらえるか、目安を計算します。',
    ld: '通貨ペア・買いか売りか・通貨の量から、金利の差でスワップポイントの目安を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="swap">
  ${fxTop()}
  <div class="field" id="f-tiles"><p class="sr-only" id="l-qty">通貨の量</p>${qtyTiles('l-qty')}</div>
  <div class="fx-result is-wide" aria-live="polite">
    <div class="fx-answer"><p class="fx-cap" id="r-cap">1日に</p><p class="fx-big" id="r-big"><span id="r-num">？</span><small id="r-unit">円</small></p></div>
    <figure class="swap-chart" aria-hidden="true"><div class="swap-bars" id="s-bars"></div><figcaption class="swap-axis"><span>0日</span><span>1年</span></figcaption></figure>
    <p class="mix-foot"><span id="r-per">通貨の量をえらんでください</span><span id="r-base"></span></p>
  </div>
  ${noteAndNoscript}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `<div class="formula">
<span>1日のスワップ ＝ 通貨の量 × レート × 金利の差 ÷ 365</span>
<span>金利の差 ＝ 買う通貨の金利 − 売る通貨の金利</span>
</div>
<p>例：金利の差が3％で、1ドル150円のドルを1万通貨買うと、150万円 × 3％ ÷ 365 で1日 約123円です。</p>
${CAUTION}`,
    )}
${section(
  'examples',
  '通貨ペアごとの目安',
  `<div class="tbl-wrap"><table>
<thead><tr><th>通貨ペア</th><th class="num">金利の差</th><th class="num">1日</th></tr></thead>
<tbody>
${SWAP_ROWS}
</tbody>
</table></div>
<p>1万通貨を買ったときです。金利は${jpDate(FX_RATES_CHECKED)}、レートは${jpDate(FX_SPOT_DATE)}の数字です。</p>
<p class="note">出典：${BANKS}・<a href="${FX_SPOT_URL}">欧州中央銀行の参照レート</a></p>`,
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
];

const SCRIPTS = { 'fx-iji-ritsu': 'fx-iji.js', 'fx-losscut': 'fx-losscut.js', 'fx-swap': 'fx-swap.js' };

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
