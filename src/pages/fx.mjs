// FX の3つのページ（証拠金維持率・追証・スワップ）。計算カードの部品は src/fx.mjs、計算は src/lib/fx.mjs
// むずかしい言葉は使わない。ロスカットは％より金額（あと何円の損か）で見せる（しょーくんの方針・10/18）
// ページに載せる計算例は tests/fx.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField, fxHead, fxTop, qtyTiles, noteAndNoscript } from '../fx.mjs';
import { SWAP_PERIODS } from '../lib/fx.mjs';

const CAUTION = '<p class="note">FXの会社ごとにルールが違うので、目安です。</p>';
// 取引に必要なお金（取引額の4％）の出典
const SRC_FSA = '<p class="note">出典：<a href="https://www.fsa.go.jp/news/21/syouken/20090731-6.html">金融庁</a></p>';

// メーター（維持率）：半円。赤いところがロスカットの基準より下。針は 0〜500％
const GAUGE = `<figure class="gauge" aria-hidden="true">
  <svg viewBox="0 0 112 62"><path class="gauge-arc" d="M8 56 A48 48 0 0 1 104 56"/><path class="gauge-cut" id="g-cut" d="M8 56 A48 48 0 0 1 104 56" pathLength="500" stroke-dasharray="100 600"/><line class="gauge-needle" id="g-needle" x1="56" y1="56" x2="16" y2="56"/><circle class="gauge-hub" cx="56" cy="56" r="4"/></svg>
  <figcaption>維持率<b id="r-ratio">？</b></figcaption>
</figure>`;

const PAGES = [
  {
    slug: 'fx-iji-ritsu',
    title: '証拠金維持率の計算｜ロスカットまであと何円の損か',
    description:
      'FXの証拠金維持率と、ロスカットまであと何円の損まで耐えられるかを計算します。通貨ペアと買いか売りかをえらび、通貨の量・口座のお金・いまのレートを入れると、ロスカットになるレートもわかります。',
    lead: 'ロスカットまで、あと何円の損か計算します。',
    ld: '口座のお金・通貨の量・レートから、証拠金維持率とロスカットまでの金額を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="iji">
  ${fxTop()}
  <div class="field" id="f-tiles"><p class="sr-only" id="l-qty">通貨の量</p>${qtyTiles('l-qty')}</div>
  <div class="fx-inputs">
    ${boxField('money', '口座のお金', '円', '100,000')}
    <div class="pair">${boxField('rate', 'いまのレート', '円', '150.00')}${boxField('cut', 'ロスカットの基準', '％', '100', '100')}</div>
  </div>
  <div class="fx-result" aria-live="polite">
    ${GAUGE}
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
    slug: 'fx-oisho',
    title: '追証の計算｜あといくら入金すればいいか',
    description:
      'FXの追証（追加証拠金）で、あといくら入金すれば維持率が基準にもどるかを計算します。このレートまで動いても維持率を保ちたいときの入金額も出せます。',
    lead: 'あといくら入金すればいいか計算します。',
    ld: '口座のお金・通貨の量・レートから、追証の目安と、入金するといいお金を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="oisho">
  ${fxTop()}
  <div class="field" id="f-tiles"><p class="sr-only" id="l-qty">通貨の量</p>${qtyTiles('l-qty')}</div>
  <div class="fx-inputs">
    <div class="pair">${boxField('money', 'いまの口座のお金', '円', '50,000')}${boxField('level', '追証の基準', '％', '100', '100')}</div>
    <div class="pair">${boxField('rate', 'いまのレート', '円', '150.00')}${boxField('target', '耐えたいレート', '円', '145.00')}</div>
  </div>
  <div class="fx-result is-wide" aria-live="polite">
    <div class="fx-answer"><p class="fx-cap" id="r-cap">維持率100％までに足りないお金</p><p class="fx-big" id="r-big"><span id="r-num">？</span><small id="r-unit">円</small></p></div>
    <div class="short-bar" aria-hidden="true">
      <div class="short-track"><div class="short-have" id="b-have"></div><div class="short-need" id="b-need"></div><div class="short-line" id="b-line"></div></div>
      <p class="short-legend"><span id="b-left">口座のお金</span><span id="b-right">基準</span></p>
    </div>
    <p class="mix-foot"><span id="r-target"></span><span id="r-need">通貨の量・口座のお金・レートを入れてください</span></p>
  </div>
  ${noteAndNoscript}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `<div class="formula">
<span>取引に必要なお金 ＝ レート × 通貨の量 × 4％</span>
<span>足りないお金 ＝ 取引に必要なお金 × 基準 − 口座のお金</span>
<span>耐えたいレートまでの損 ＝ レートの差 × 通貨の量</span>
<span>入金 ＝ 取引に必要なお金 × 基準 ＋ 損 − 口座のお金</span>
</div>
<p>例：150円のドルを1万通貨で、口座のお金が5万円。取引に必要なお金は6万円なので、維持率100％まで1万円足りません。</p>
${CAUTION}
${SRC_FSA}`,
    )}
${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>耐えたいレート</th><th class="num">損</th><th class="num">入金</th></tr></thead>
<tbody>
<tr><td>いまのまま</td><td class="num">0円</td><td class="num">1万円</td></tr>
<tr><td>148円まで下がっても</td><td class="num">2万円</td><td class="num">3万円</td></tr>
<tr><td>145円まで下がっても</td><td class="num">5万円</td><td class="num">6万円</td></tr>
</tbody>
</table></div>
<p>ドル円150円で1万通貨の買い、口座のお金5万円、基準100％のときです。</p>`,
)}`,
    faqs: [
      {
        q: '追証とは何ですか？',
        a: '<p>口座のお金が足りなくなったとき、FXの会社から求められる追加の入金です。追証がある会社の多くは、1日の取引の終わりに維持率が100％を下回ると求めます。</p>',
      },
      {
        q: '追証がない会社もありますか？',
        a: '<p>あります。追証がなく、ロスカットだけの会社もあります。使っている会社のルールを確かめてください。</p>',
      },
      {
        q: '「耐えたいレート」は何を入れますか？',
        a: '<p>ここまで動いても、維持率が基準を下回らないようにしたいレートです。買いならいまより低いレート、売りなら高いレートを入れます。</p>',
      },
      {
        q: '入金のかわりに、取引を減らしてもいいですか？',
        a: '<p>はい。通貨の量を減らすと、取引に必要なお金も減ります。ここで量を変えて確かめられます。</p>',
      },
    ],
  },
  {
    slug: 'fx-swap',
    title: 'スワップポイントの計算｜1か月・1年でいくらになるか',
    description:
      'FXのスワップポイントを、持ち続けたときの合計で計算します。1万通貨あたりの1日の額と通貨の量を入れると、1か月・半年・1年でいくらたまるかがグラフでわかります。',
    lead: '持ち続けると、いくらたまるか計算します。',
    ld: '1日のスワップと通貨の量から、持ち続けたときのスワップの合計を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-tool="swap">
  ${fxHead('l-qty', '通貨の量')}
  <div class="field" id="f-tiles">${qtyTiles('l-qty')}</div>
  <div class="fx-inputs">
    ${boxField('swap', '1日のスワップ（1万通貨あたり）', '円', '150')}
    <div class="tiles tiles-4" role="group" aria-label="持つ期間">${SWAP_PERIODS.map((p) => `<button type="button" class="tile" data-days="${p.days}" aria-pressed="${p.days === 365}"><b>${p.label}</b><small>${p.days}日</small></button>`)
      .join('')}<div class="tile tile-input" id="f-days"><div class="tile-box"><input id="days" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done" placeholder="?"><span>日</span></div><label for="days">その他</label></div></div>
  </div>
  <div class="fx-result is-wide" aria-live="polite">
    <div class="fx-answer"><p class="fx-cap" id="r-cap">1年で</p><p class="fx-big" id="r-big"><span id="r-num">？</span><small id="r-unit">円</small></p></div>
    <figure class="swap-chart" aria-hidden="true"><div class="swap-bars" id="s-bars"></div><figcaption class="swap-axis"><span>0日</span><span id="s-end">365日</span></figcaption></figure>
    <p class="mix-foot"><span id="r-per">通貨の量とスワップを入れてください</span></p>
  </div>
  ${noteAndNoscript}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `<div class="formula">
<span>1日のスワップ ＝ 1万通貨あたりの額 × 通貨の量 ÷ 1万</span>
<span>合計 ＝ 1日のスワップ × 持つ日数</span>
</div>
<p>例：1万通貨あたり150円を3万通貨なら1日450円、1年（365日）で164,250円です。</p>
${CAUTION}`,
    )}
${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>1日の額・量</th><th class="num">1か月</th><th class="num">1年</th></tr></thead>
<tbody>
<tr><td>150円・1万通貨</td><td class="num">4,500円</td><td class="num">54,750円</td></tr>
<tr><td>150円・3万通貨</td><td class="num">13,500円</td><td class="num">164,250円</td></tr>
<tr><td>20円・10万通貨</td><td class="num">6,000円</td><td class="num">73,000円</td></tr>
</tbody>
</table></div>
<p>1か月は30日で計算しています。スワップの額は毎日変わります。</p>`,
)}`,
    faqs: [
      {
        q: 'スワップポイントとは何ですか？',
        a: '<p>2つの国の金利の差で、毎日受け取ったり払ったりするお金です。金利の高い通貨を買うと受け取れることが多いです。</p>',
      },
      {
        q: '1日の額はどこで見られますか？',
        a: '<p>FXの会社のアプリやサイトの、スワップの一覧です。1,000通貨あたりで書かれているときは、10倍して入れてください。</p>',
      },
      {
        q: '土日もスワップはつきますか？',
        a: '<p>つきます。土日の分は、水曜日などにまとめてつきます。何曜日かは会社や通貨で違います。</p>',
      },
      {
        q: 'マイナスのスワップはどう計算しますか？',
        a: '<p>同じ計算で、払う額になります。数字はマイナスをつけずに入れてください。</p>',
      },
    ],
  },
];

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
      scripts: [p.slug === 'fx-swap' ? 'fx-swap.js' : 'fx.js'],
      body,
    });
    return { path, html, sitemap: true, updated: tool.updated };
  });
}
