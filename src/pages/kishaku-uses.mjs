// 希釈率の使いみち別のページ（めんつゆ・塩素系漂白剤・液体肥料）。計算カードは希釈率の計算と同じ部品で、マスと呼び名だけ変える
// 数字は出典のページでたしかめたもの（2026-10-17）。表の数字は tests/kishaku.test.mjs でも確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { mixTiles, mixStage } from '../mix.mjs';
import { boxField } from '../fields.mjs';
import { volumeText, dilute, ratioFromPercent, capText, mlValue } from '../lib/kishaku.mjs';
import { fmt, fix } from '../lib/number.mjs';
import { stair, band, zBox } from '../zukai.mjs';
import { HYOHAKU_SRC, HYOHAKU_CAP, HYOHAKU_TARGETS, HYOHAKU_CAUTIONS, HYOHAKU_AMOUNT_SOURCES, HYOHAKU_CAUTION_SOURCES, hyohakuAmount } from '../data/hyohakuzai.mjs';
import { printLink } from '../prints.mjs';

const head = (labelId, label) =>
  `<div class="field-head calc-head"><p class="label" id="${labelId}">${label}</p><button type="button" class="clear-btn" id="clear">クリア</button></div>`;

const src = (items) => `<p class="note">出典：${items.map(([name, url]) => `<a href="${url}">${name}</a>`).join('、')}</p>`;

// 図解（#81）：「計算のしかた」の絵の式と、表の上の帯（できあがりや水の量を、原液と水に分ける）。数字は tests/zukai-seikatsu.test.mjs
const ZT = dilute({ ratio: 3, amount: 100 }); // めんつゆ3倍濃縮でつけつゆ100ml
const ZH_RATIO = ratioFromPercent(HYOHAKU_SRC, 0.05).ratio; // 6％を0.05％に
const ZH = dilute({ ratio: ZH_RATIO, amount: 1000, from: 'water' }); // 水1L
const ZE = dilute({ ratio: 500, amount: 1000, from: 'water' }); // 液肥500倍を水1L
export const Z_USES = { tsuyu: volumeText(ZT.concentrate), tsuyuWater: volumeText(ZT.water), hyohakuRatio: ZH_RATIO, hyohaku: volumeText(ZH.concentrate), ekihi: volumeText(ZE.concentrate) };
const thin = (ml, total) => Math.max(2, Number(((ml / total) * 100).toFixed(1))); // 細い原液の帯も見えるように2％から
const Z_MENTSUYU = {
  stair: stair(zBox('つけつゆ', `${volumeText(ZT.total)}`), { b: '÷3', small: '3倍濃縮' }, zBox('つゆ', Z_USES.tsuyu, true), ['つゆの量 ＝ できあがりの量 ÷ 何倍濃縮', '水の量 ＝ できあがりの量 − つゆの量', `例：3倍濃縮でつけつゆを100ml作るなら、つゆ${Z_USES.tsuyu}・水${Z_USES.tsuyuWater}です。`], `水は 100 − 33 ＝ <b class="fz-red">${Z_USES.tsuyuWater}</b>`),
  band: band({ head: `つけつゆ ${volumeText(ZT.total)}`, parts: [{ w: 33.3, kind: 'off', text: `つゆ ${Z_USES.tsuyu}` }, { w: 66.7, text: `水 ${Z_USES.tsuyuWater}` }], ans: `3倍濃縮はつゆ1：水2 → <b>つゆ ${Z_USES.tsuyu}</b>`, label: `つけつゆ100mlの帯を、つゆ${Z_USES.tsuyu}と水${Z_USES.tsuyuWater}に分けた図` }),
};
const Z_HYOHAKU = {
  stair: stair(zBox('水', '1L'), { b: `÷${ZH_RATIO - 1}`, small: `${HYOHAKU_SRC}％を0.05％に` }, zBox('漂白剤', Z_USES.hyohaku, true), ['倍率 ＝ 漂白剤の濃度 ÷ 作りたい濃度', '漂白剤の量 ＝ 水の量 ÷（倍率 − 1）', `例：${HYOHAKU_SRC}％の漂白剤で0.05％を作るなら${ZH_RATIO}倍。水1Lなら、1,000 ÷ ${ZH_RATIO - 1} で漂白剤${Z_USES.hyohaku}です。`]),
  band: band({ head: `水1L ＋ 漂白剤${Z_USES.hyohaku}`, parts: [{ w: thin(ZH.concentrate, ZH.total), kind: 'off', text: '' }, { w: 100 - thin(ZH.concentrate, ZH.total), text: '水 1,000ml' }], ruler: [[0, `漂白剤 ${Z_USES.hyohaku}`, true], [100, `約${volumeText(ZH.total)}`]], ans: `${HYOHAKU_SRC}％を0.05％に → <b>${ZH_RATIO}倍</b>`, label: `水1Lと漂白剤${Z_USES.hyohaku}を合わせた帯の図。${ZH_RATIO}倍に薄める` }),
};
// 次亜塩素酸ナトリウムの薄め方：計算のしくみと、使う場面・まちがえやすいところ（AdSense の再審査 #96。数字は tests/scenes-c.test.mjs）
const hyMl = (pct, water) => volumeText(hyohakuAmount(pct, water));
const HY_C = {
  ex: hyMl('0.02', 2000),
  vomit: hyohakuAmount('0.1', 500),
  table2l: hyohakuAmount('0.05', 2000),
  cap: fix((HYOHAKU_CAP * HYOHAKU_SRC) / (1000 + HYOHAKU_CAP)), // 水1Lにキャップ1杯を入れたときの濃度（％）
  weak: fix((Number(mlValue(ZH.concentrate)) * 4) / (1000 + Number(mlValue(ZH.concentrate)))), // 4％に下がった漂白剤を8.4ml入れたときの濃度（％）
  weakNeed: volumeText(dilute({ ratio: ratioFromPercent(4, 0.05).ratio, amount: 1000, from: 'water' }).concentrate),
  total1l: volumeText(dilute({ ratio: ZH_RATIO, amount: 1000, from: 'total' }).concentrate),
};
const HY = {
  how: `<p>水で薄めても、漂白剤の中の次亜塩素酸ナトリウムの量は変わらず、液の量だけがふえます。${HYOHAKU_SRC}％を0.05％にするには液を${ZH_RATIO}倍にすればよいので、漂白剤1に水${ZH_RATIO - 1}の割合です。水の量を${ZH_RATIO - 1}で割ると、入れる漂白剤の量になります。</p>
<p>例：0.02％を水2Lで作るなら${ratioFromPercent(HYOHAKU_SRC, 0.02).ratio}倍なので、2,000 ÷ ${ratioFromPercent(HYOHAKU_SRC, 0.02).ratio - 1} で漂白剤は約${HY_C.ex}です。ほかの液の薄め方は<a href="/kishaku/">希釈率の計算</a>で出せます。</p>`,
  scenes: `<p>家の中で吐いたものを片づけるときは、0.1％を使います。水500mlのペットボトルなら漂白剤は約${volumeText(HY_C.vomit)}で、ハイターのキャップで${capText(HY_C.vomit, HYOHAKU_CAP)}です。</p>
<p>テーブルやドアノブを拭く0.05％を、2Lのペットボトルで作るなら、漂白剤は約${volumeText(HY_C.table2l)}です。キャップでは${capText(HY_C.table2l, HYOHAKU_CAP)}になります。</p>
<p>清掃の現場でトイレの消毒液を作るときは、<a href="/genba/">現場手帳</a>の作業計画書に、バケツの水の量に合わせた原液の量が出ます。</p>`,
  mistakes: `<p>キャップ1杯をそのまま水1Lに入れると、濃すぎます。${HYOHAKU_CAP}mlを入れると約${fmt(HY_C.cap, 2)}％になり、0.05％の約3倍です。</p>
<p>濃度が下がった漂白剤を${HYOHAKU_SRC}％のつもりで使うと、薄くなります。濃度が4％に下がったものに水1Lで${Z_USES.hyohaku}を入れると、できる液は約${fmt(HY_C.weak, 3)}％です。0.05％にするには、濃度の欄を4にして約${HY_C.weakNeed}です。</p>
<p>水の量とできあがりの量は、少しちがいます。水1Lに${Z_USES.hyohaku}を入れると約${volumeText(ZH.total)}になるので、できあがり1Lで作るときの漂白剤は約${HY_C.total1l}です。</p>`,
};
const Z_EKIHI = {
  stair: stair(zBox('水', '1L'), { b: '÷499', small: '500倍' }, zBox('原液', Z_USES.ekihi, true), ['原液の量 ＝ 水の量 ÷（倍率 − 1）', '原液の量 ＝ できあがりの量 ÷ 倍率', `例：500倍で水1Lなら、1,000 ÷ 499 で原液約${Z_USES.ekihi}です。`]),
  band: band({ head: `水1L ＋ 原液${Z_USES.ekihi}`, parts: [{ w: 2, kind: 'off', text: '' }, { w: 98, text: '水 1,000ml' }], ruler: [[0, `原液 ${Z_USES.ekihi}`, true], [100, `約${volumeText(ZE.total)}`]], ans: `原液1：水499 → <b>500倍</b>`, label: `水1Lと原液${Z_USES.ekihi}を合わせた帯の図。500倍に薄める` }),
};

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
    zukai: Z_MENTSUYU.stair,
    how: `<p>表示の割合が「つゆ1：水2」なら、できあがりはつゆの3倍の量です。だから、できあがりの量を3で割るとつゆの量になり、残りが水の量です。4倍濃縮のつけつゆは1：3なので、4で割ります。例：4倍濃縮でつけつゆを240ml作るなら、つゆ60ml・水180mlです。</p>`,
    more: `${section(
      'scenes',
      '使う場面の例',
      `<p>そうめんのつけつゆを1人100mlとして、4人分の400mlを3倍濃縮で作るとき。つゆは約133ml、水は約267mlです。人数に合わせてほかの材料も変えるときは、<a href="/recipe/">レシピの人数換算</a>で計算できます。</p>
<p>1人分の60mlだけを2倍濃縮で作るなら、つゆも水も30mlです。45ml以下なのでスプーンの量も出て、つゆは大さじ2です。</p>
<p>2倍濃縮でかけつゆを500ml作るときは、ボトルの表示の1：3の3を「かけなど」のマスに入れます。つゆ125ml・水375mlです。</p>`,
    )}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>つけつゆの割合のまま、かけつゆを作る</h3>
<p>2倍濃縮をつけつゆと同じ1：1で薄めると、表示の1：3で作るかけつゆより2倍濃くなります。かけつゆ400mlなら、つゆ100mlのところが200mlになります。</p>
<h3>ボトルの濃縮の倍率を見ずに作る</h3>
<p>3倍濃縮のつゆを2倍濃縮と同じ1：1で薄めると、表示どおりに作ったつけつゆの1.5倍の濃さです。つけつゆ300mlなら、つゆ100mlのところに150ml入ります。</p>`,
)}`,
    body: `${section(
      'table',
      '濃縮ごとの割合',
      `${Z_MENTSUYU.band}<div class="tbl-wrap"><table>
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
      {
        q: '3倍濃縮のめんつゆ大さじ1に、水はどれくらいですか？',
        a: '<p>つけつゆなら水は大さじ2で、合わせて45mlです。</p>',
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
    calc: `<div class="calc" id="calc" data-how="pct" data-conc="漂白剤" data-label="pct" data-cap="${HYOHAKU_CAP}" data-cap-name="ハイターのキャップ" data-spoon="0" data-empty="作りたい濃度をえらんでください">
  ${head('l-target', '作りたい濃度')}
  <div class="field" id="f-tiles">
    ${mixTiles(
      'l-target',
      HYOHAKU_TARGETS.map((t) => ({ key: 'target', value: t.pct, big: `${t.pct}%`, small: t.ppm, long: true })),
      { id: 'target', post: '%', label: 'その他' },
    )}
  </div>
  <div class="src-box">${boxField('src', '漂白剤の濃度', '％', String(HYOHAKU_SRC), String(HYOHAKU_SRC), `ボトルの表示の濃度。ハイターは${HYOHAKU_SRC}％`)}</div>
  ${mixStage({ conc: '漂白剤', label: '？％', hint: '作りたい濃度をえらんでください' })}
  <p class="note calc-note">手や指に使わず、酸性のものとまぜない</p>
</div>`,
    zukai: Z_HYOHAKU.stair,
    body: `${section(
      'table',
      '濃度ごとの量',
      `${printLink('hyohakuzai')}${Z_HYOHAKU.band}<div class="tbl-wrap"><table>
<thead><tr><th>作る濃度</th><th class="num">水500ml</th><th class="num">水1L</th></tr></thead>
<tbody>
${HYOHAKU_TARGETS.map((t) => `<tr><td>${t.pct}％</td>${[500, 1000].map((w) => `<td class="num">${volumeText(hyohakuAmount(t.pct, w))}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table></div>
<p>漂白剤が${HYOHAKU_SRC}％のときの量です。古い漂白剤は濃度が下がっています。</p>`,
    )}
${section(
  'use',
  '濃度ごとの使いみち',
  `<div class="tbl-wrap"><table>
<thead><tr><th>濃度</th><th>使いみちの例</th></tr></thead>
<tbody>
${HYOHAKU_TARGETS.map((t) => `<tr><td>${t.pct}％</td><td>${t.use}</td></tr>`).join('\n')}
</tbody>
</table></div>
<p>ノロウイルスの対策では、調理器具やトイレなどの消毒に0.02％、吐いたものや便の処理に0.1％を使います。</p>
${src(HYOHAKU_AMOUNT_SOURCES)}`,
)}
${section(
  'caution',
  '使うときの注意',
  `<ul>
${HYOHAKU_CAUTIONS.map((c) => `<li>${c}</li>`).join('\n')}
</ul>
${src(HYOHAKU_CAUTION_SOURCES)}`,
)}
${section('scenes', '使う場面の例', HY.scenes)}
${section('mistakes', 'まちがえやすいところ', HY.mistakes)}`,
    how: HY.how,
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
      {
        q: '0.05％は何ppmですか？',
        a: '<p>500ppmです。1％が10,000ppmなので、0.02％は200ppm、0.1％は1,000ppmです。</p>',
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
    zukai: Z_EKIHI.stair,
    how: `<p>液体肥料の倍率は、原液をできあがりの何分の1にするかを表します。500倍なら原液はできあがりの500分の1で、水は原液の499倍です。倍率が大きいので、水の量を倍率で割っても、原液の量はほとんど変わりません。例：じょうろの水4Lを1000倍にするなら、原液は約4mlです。</p>`,
    more: `${section(
      'scenes',
      '使う場面の例',
      `<p>観葉植物の鉢にあげる分だけ、水500mlを500倍で作るとき。原液は約1mlで、水1Lに入れる2mlの半分です。</p>
<p>庭木に250倍であげるときは、バケツの水5Lに原液を約20ml入れます。上の植物ごとの倍率の表では、庭木・果樹・芝生が250倍です。</p>
<p>原液が残り10mlのとき、1000倍なら水9,990mlで、できあがりは約10Lです。2000倍なら約20Lぶん作れます。</p>`,
    )}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>倍率の数字が大きいほど、薄くなります</h3>
<p>2000倍は1000倍の半分の濃さで、水1Lに入れる原液は0.5mlです。逆に覚えて250倍で作ると、2000倍の8倍の濃さになります。</p>
<h3>どの植物にも同じ倍率で作る</h3>
<p>草花や野菜の500倍の液を、鉢花や洋ランにもあげると、目安の1000倍より2倍濃くなります。水1Lなら、原液1mlのところに2ml入ります。</p>
<h3>1000倍は1％ではありません</h3>
<p>1000倍は原液が1,000分の1なので、0.1％です。1％にあたるのは100倍で、1000倍のつもりで1％の液を作ると、10倍の濃さになります。％と倍の言いかえは<a href="/percent/">パーセントの計算</a>でも確かめられます。</p>`,
)}`,
    body: `${section(
      'table',
      '倍率ごとの量',
      `${Z_EKIHI.band}<div class="tbl-wrap"><table>
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
        q: '500倍は水2Lに何mlですか？',
        a: '<p>約4mlです。1000倍なら約2mlです。</p>',
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

${p.calc.replace(/<\/div>$/, `  ${memoHtml(tool)}\n</div>`)}

${section('formula', '計算のしかた', `${p.zukai}${p.how || ''}`)}

${p.body}
${p.more ? `\n${p.more}\n` : ''}
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
