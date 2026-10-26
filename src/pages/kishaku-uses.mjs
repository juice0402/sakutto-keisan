// 希釈率の使いみち別のページ（めんつゆ・塩素系漂白剤・液体肥料）。計算カードは希釈率の計算と同じ部品で、マスと呼び名だけ変える
// 数字は出典のページでたしかめたもの（2026-10-17）。表の数字は tests/kishaku.test.mjs でも確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { mixTiles, mixStage } from '../mix.mjs';
import { boxField } from '../fields.mjs';

const head = (labelId, label) =>
  `<div class="field-head calc-head"><p class="label" id="${labelId}">${label}</p><button type="button" class="clear-btn" id="clear">クリア</button></div>`;

const src = (items) => `<p class="note">出典：${items.map(([name, url]) => `<a href="${url}">${name}</a>`).join('、')}</p>`;

const PAGES = [
  {
    slug: 'mentsuyu',
    title: 'めんつゆの薄め方｜2倍・3倍・4倍濃縮のつゆと水の量',
    description:
      '2倍・3倍・4倍濃縮のめんつゆを、つけつゆやかけつゆにするときのつゆと水の量を計算します。3倍濃縮でつけつゆを100ml作るなら、つゆ33ml・水67mlです。45ml以下なら大さじ・小さじでも出します。',
    lead: 'つゆと水を何mlずつ入れるか計算します。',
    ld: '何倍濃縮かと作りたい量から、めんつゆと水の量を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-how="times" data-conc="つゆ" data-label="parts" data-custom="water" data-empty="何倍濃縮かをえらんでください">
  ${head('l-tsuyu', '何倍濃縮？')}
  <div class="field" id="f-tiles">
    ${mixTiles('l-tsuyu', [2, 3, 4].map((v) => ({ key: 'ratio', value: v, big: `${v}倍`, small: `1：${v - 1}` })), { id: 'ratio', pre: '1：', label: 'かけなど' })}
  </div>
  ${mixStage({ conc: 'つゆ', label: '1：？', hint: '何倍濃縮かをえらんでください', cls: 'is-tsuyu' })}
</div>`,
    body: `${section(
      'table',
      '濃縮ごとの割合',
      `<div class="tbl-wrap"><table>
<thead><tr><th>濃縮</th><th>つけつゆ</th><th>かけつゆ</th></tr></thead>
<tbody>
<tr><td>2倍</td><td>1：1</td><td>1：3</td></tr>
<tr><td>3倍</td><td>1：2</td><td>製品の表示</td></tr>
<tr><td>4倍</td><td>1：3</td><td>製品の表示</td></tr>
</tbody>
</table></div>
<p>割合は「つゆ：水」です。かけつゆや煮物の割合は製品で違うので、ボトルの表示を見てください。</p>
<p>例：3倍濃縮でつけつゆを100ml作るなら、つゆ33ml・水67mlです。</p>
${src([
  ['ミツカン', 'https://faq.mizkan.co.jp/faq/show/5527?site_domain=default'],
  ['ヤマキ', 'https://www.yamaki.co.jp/faq/02.html'],
  ['キッコーマン', 'https://www.kikkoman.co.jp/homecook/tsushin/0085/'],
])}`,
    )}`,
    faqs: [
      {
        q: '2倍濃縮のめんつゆは、どう薄めますか？',
        a: '<p>つけつゆなら、つゆと同じ量の水で薄めます。ミツカンとヤマキの2倍濃縮では、かけつゆは1：3です。</p>',
      },
      {
        q: 'かけつゆを作るときは？',
        a: '<p>ボトルに書いてある割合の、水のほうの数字を「かけなど」のマスに入れてください。1：3なら3です。</p>',
      },
      {
        q: '大さじで量れますか？',
        a: '<p>つゆが45ml以下なら、計量スプーンでの量も出します。大さじ1は15mlです。</p>',
      },
    ],
  },
  {
    slug: 'hyohakuzai',
    title: '次亜塩素酸ナトリウムの薄め方｜ハイターで作るノロウイルスの消毒液',
    description:
      '塩素系漂白剤（次亜塩素酸ナトリウム約6％）で、0.02〜0.1％の消毒液を作るときの漂白剤と水の量を計算します。水1Lで0.05％なら漂白剤8.4ml、0.1％なら17mlです。水の量やできあがりの量から計算できます。',
    lead: 'ハイターで作る消毒液の量を計算します。',
    ld: '塩素系漂白剤（次亜塩素酸ナトリウム）の濃度と作りたい濃度から、漂白剤と水の量を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-how="pct" data-conc="漂白剤" data-label="pct" data-cap="25" data-cap-name="ハイターのキャップ" data-spoon="0" data-empty="作りたい濃度をえらんでください">
  ${head('l-target', '作りたい濃度')}
  <div class="field" id="f-tiles">
    ${mixTiles(
      'l-target',
      [
        ['0.02', '200ppm'],
        ['0.05', '500ppm'],
        ['0.1', '1000ppm'],
      ].map(([v, small]) => ({ key: 'target', value: v, big: `${v}%`, small, long: true })),
      { id: 'target', post: '%', label: 'その他' },
    )}
  </div>
  <div class="src-box">${boxField('src', '漂白剤の濃度', '％', '6', '6', 'ボトルの表示の濃度。ハイターは6％')}</div>
  ${mixStage({ conc: '漂白剤', label: '？％', hint: '作りたい濃度をえらんでください' })}
  <p class="note calc-note">手や指に使わず、酸性のものとまぜない</p>
</div>`,
    body: `${section(
      'table',
      '濃度ごとの量',
      `<div class="tbl-wrap"><table>
<thead><tr><th>作る濃度</th><th class="num">水500ml</th><th class="num">水1L</th></tr></thead>
<tbody>
<tr><td>0.02％</td><td class="num">1.7ml</td><td class="num">3.3ml</td></tr>
<tr><td>0.05％</td><td class="num">4.2ml</td><td class="num">8.4ml</td></tr>
<tr><td>0.1％</td><td class="num">8.5ml</td><td class="num">17ml</td></tr>
</tbody>
</table></div>
<p>漂白剤が6％のときの量です。古い漂白剤は濃度が下がっています。</p>`,
    )}
${section(
  'use',
  '濃度ごとの使いみち',
  `<div class="tbl-wrap"><table>
<thead><tr><th>濃度</th><th>使いみちの例</th></tr></thead>
<tbody>
<tr><td>0.02％</td><td>調理器具・ドアノブ・便座</td></tr>
<tr><td>0.05％</td><td>テーブル・ドアノブ</td></tr>
<tr><td>0.1％</td><td>吐いたもの・便の処理</td></tr>
</tbody>
</table></div>
<p>ノロウイルスの対策では、調理器具やトイレなどの消毒に0.02％、吐いたものや便の処理に0.1％を使います。</p>
${src([
  ['厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/kanren/yobou/040204-1.html'],
  ['目黒区', 'https://www.city.meguro.tokyo.jp/smph/kurashi/hoken_eisei/shinryo/yobo/jiaensosannatoriumuekinotukurika.html'],
])}`,
)}
${section(
  'caution',
  '使うときの注意',
  `<ul>
<li>手や指など、体には使わない</li>
<li>酸性の洗剤などとまぜない</li>
<li>スプレーで吹きかけない</li>
<li>換気をする</li>
<li>薄めた液は使うたびに作り、使い切る</li>
</ul>
${src([
  ['厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/syoudoku_00001.html'],
  ['花王', 'https://www.kao.com/jp/qa/detail/18916/'],
])}`,
)}`,
    faqs: [
      {
        q: 'キャップ1杯は何mlですか？',
        a: '<p>花王のハイターとキッチンハイターは、キャップ1杯が約25mlです。ほかの製品は表示を見てください。</p>',
      },
      {
        q: '買ってから時間がたった漂白剤は？',
        a: '<p>濃度が下がるので、多めに入れます。花王の目安では、0.05％を作るとき水1Lに、買って1年以内なら約15ml、3年以内なら約25mlです。</p>',
      },
      {
        q: '漂白剤の濃度がわからないときは？',
        a: '<p>ボトルの表示を見てください。花王のハイターとキッチンハイターは、作ったときに6％です。</p>',
      },
      {
        q: '「次亜塩素酸水」と同じものですか？',
        a: '<p>ちがうものです。次亜塩素酸ナトリウムを水で薄めても、次亜塩素酸水にはなりません。</p>',
      },
      {
        q: '手の消毒に使えますか？',
        a: '<p>使えません。手や指には使わないでください。</p>',
      },
    ],
  },
  {
    slug: 'ekihi',
    title: '液体肥料の薄め方｜500倍・1000倍は水1Lに何ml',
    description:
      '液体肥料を500倍・1000倍などに薄めるときの、原液と水の量を計算します。水1Lなら500倍で原液2ml、1000倍で1mlです。じょうろの水の量やできあがりの量からも計算でき、植物ごとの倍率の目安ものせています。',
    lead: '液肥と水を何mlずつ入れるか計算します。',
    ld: '何倍に薄めるかと水の量から、液体肥料の原液と水の量を出す計算ツール。',
    calc: `<div class="calc" id="calc" data-how="times">
  ${head('l-ratio', '何倍に薄める？')}
  <div class="field" id="f-tiles">
    ${mixTiles(
      'l-ratio',
      [
        [50, '20ml'],
        [100, '10ml'],
        [200, '5ml'],
        [250, '4ml'],
        [500, '2ml'],
        [1000, '1ml'],
        [2000, '0.5ml'],
      ].map(([v, ml]) => ({ key: 'ratio', value: v, big: `${v}倍`, small: `1Lに${ml}`, long: v >= 1000 })),
      { id: 'ratio', post: '倍', label: 'その他' },
    )}
  </div>
  ${mixStage({ hint: '何倍に薄めるかをえらんでください' })}
</div>`,
    body: `${section(
      'table',
      '倍率ごとの量',
      `<div class="tbl-wrap"><table>
<thead><tr><th>倍率</th><th class="num">水1L</th><th class="num">水2L</th><th class="num">水10L</th></tr></thead>
<tbody>
<tr><td>250倍</td><td class="num">4ml</td><td class="num">8ml</td><td class="num">40ml</td></tr>
<tr><td>500倍</td><td class="num">2ml</td><td class="num">4ml</td><td class="num">20ml</td></tr>
<tr><td>1000倍</td><td class="num">1ml</td><td class="num">2ml</td><td class="num">10ml</td></tr>
<tr><td>2000倍</td><td class="num">0.5ml</td><td class="num">1ml</td><td class="num">5ml</td></tr>
</tbody>
</table></div>`,
    )}
${section(
  'plants',
  '植物ごとの倍率',
  `<div class="tbl-wrap"><table>
<thead><tr><th>植物の例</th><th class="num">倍率</th></tr></thead>
<tbody>
<tr><td>庭木・果樹・芝生</td><td class="num">250倍</td></tr>
<tr><td>草花・野菜・観葉植物</td><td class="num">500倍</td></tr>
<tr><td>鉢花・洋ラン・球根・ハーブ</td><td class="num">1000倍</td></tr>
<tr><td>サボテン・山野草・盆栽</td><td class="num">2000倍</td></tr>
</tbody>
</table></div>
<p>ハイポネックス原液の目安です。ほかの肥料は、製品の表示の倍率で計算してください。</p>
${src([
  ['ハイポネックスジャパン', 'https://www.hyponex.co.jp/products/products-637/'],
])}`,
    )}`,
    faqs: [
      {
        q: '1000倍は水1Lに何mlですか？',
        a: '<p>約1mlです。500倍なら約2ml、2000倍なら約0.5mlです。</p>',
      },
      {
        q: '「500倍」は原液1に水500ですか？',
        a: '<p>正しくは原液1に水499です。水1Lに原液2mlのように、水の量で考えても、ほぼ同じになります。</p>',
      },
      {
        q: '濃くするとよく育ちますか？',
        a: '<p>濃すぎると、根をいためることがあります。迷ったときは薄めにします。</p>',
      },
    ],
  },
];

export default function render() {
  const parent = toolBySlug('kishaku');
  return PAGES.map((p) => {
    const tool = toolBySlug(p.slug);
    const path = `/${tool.slug}/`;
    const body = `
<h1${tool.name.length > 12 ? ' class="is-long"' : ''}>${tool.name}</h1>
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
        { name: parent.name, path: `/${parent.slug}/` },
        { name: tool.name, path },
      ],
      jsonLd: [toolLd(tool, p.ld), faqLd(p.faqs)],
      theme: themeOf(tool),
      ogImage: `/og/${tool.slug}.png`,
      scripts: ['kishaku.js'],
      body,
    });
    return { path, html, sitemap: true, updated: tool.updated };
  });
}
