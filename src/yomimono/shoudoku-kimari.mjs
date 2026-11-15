// 読みもの：消毒液を薄めるとき、勤め先で決まっていること
// 勤め先の決まりは docs/yomimono-neta.md の「運営者から聞いた話」2 だけを使う。24時間の理由として書くのは広島市のページの範囲（2026-11-15 に開いて確かめた・更新 2026-01-30）
// 量は src/lib/kishaku.mjs の dilute と src/data/hyohakuzai.mjs の数字で出す。確かめは tests/yomimono-shoudoku-kimari.test.mjs
import { section } from '../layout.mjs';
import { stair, zBox } from '../zukai.mjs';
import { dilute, ratioFromPercent, volumeText, capText } from '../lib/kishaku.mjs';
import { fmt, fix } from '../lib/number.mjs';
import { HYOHAKU_SRC, HYOHAKU_CAP, HYOHAKU_AMOUNT_SOURCES, HYOHAKU_CAUTION_SOURCES } from '../data/hyohakuzai.mjs';
import { printLink } from '../prints.mjs';

export const PET_CAP = 5; // 500mlのペットボトルのキャップ（ml）。広島市のページの数字
export const SRC_LIST = [5, HYOHAKU_SRC, 10]; // くらべる原液の濃度（％）。5％と10％は広島市の表、6％は花王のハイター

/** 原液 src ％で target ％を作るとき、水 water（ml）に入れる原液の量（ml） */
export const amountFor = (src, target, water) => dilute({ ratio: ratioFromPercent(src, target).ratio, amount: water, from: 'water' }).concentrate;
/** 原液 src ％を ml だけ水 water（ml）に入れたときの濃度（％） */
const mixed = (src, ml, water) => fix((src * ml) / (water + ml));

export const NUMS = {
  r01: ratioFromPercent(HYOHAKU_SRC, 0.1).ratio, // 6％を0.1％に
  r002: ratioFromPercent(HYOHAKU_SRC, 0.02).ratio,
  pet01: amountFor(HYOHAKU_SRC, 0.1, 500), // 水500mlで0.1％
  l002: amountFor(HYOHAKU_SRC, 0.02, 1000),
  l01: amountFor(HYOHAKU_SRC, 0.1, 1000),
  b3: amountFor(HYOHAKU_SRC, 0.02, 3000), // バケツ3L
  b5: amountFor(HYOHAKU_SRC, 0.02, 5000),
  capRatio: HYOHAKU_CAP / PET_CAP, // ハイターのキャップはペットボトルのキャップの何倍か
  // 6％の漂白剤を5％の表の量（0.1％・水1L）で入れたとき／5％の原液を6％の量で入れたとき
  over: mixed(HYOHAKU_SRC, Number(volumeText(amountFor(5, 0.1, 1000)).replace('ml', '')), 1000),
  under: mixed(5, Number(volumeText(amountFor(HYOHAKU_SRC, 0.1, 1000)).replace('ml', '')), 1000),
};
const N = NUMS;
const v = volumeText;
const cap = (ml) => capText(ml, PET_CAP);
const tblRow = (src) => `<tr><td>${src}％${src === HYOHAKU_SRC ? '（ハイター）' : ''}</td><td class="num">${v(amountFor(src, 0.02, 1000))}</td><td class="num">${v(amountFor(src, 0.1, 1000))}</td></tr>`;

const HIROSHIMA = 'https://www.city.hiroshima.lg.jp/site/infectious-disease-joho/332.html';
const MHLW = HYOHAKU_CAUTION_SOURCES.find(([n]) => n === '厚生労働省')[1];
const KAO = HYOHAKU_CAUTION_SOURCES.find(([n]) => n === '花王')[1];
const ANZEN = 'https://anzen-benricho.com/shikaku/koushin/';

export default {
  slug: 'shoudoku-kimari',
  title: '消毒液を薄めるとき、勤め先で決まっていること',
  lead: '3つの決まりと、薄める量の表です。',
  category: 'seikatsu',
  tools: ['hyohakuzai', 'kishaku'],
  published: '2026-11-15',
  updated: '2026-11-15',
  description: `清掃の勤め先で消毒液を薄めるときの決まりと、6％の漂白剤で水1Lに0.02％なら約${v(N.l002)}、0.1％なら約${v(N.l01)}という量。5％と10％の原液の量とくらべた表と、ペットボトルのキャップ約${PET_CAP}mlでの杯数ものせました。`,
  body: `
${section(
  'kotae',
  '勤め先の決まりと、薄める量',
  `<p>運営者の勤め先では、消毒液を薄めるときにゴーグルをつけ、まぎらわしいボトルには入れず、薄めてから24時間以内に使い切ることになっています。量は6％の漂白剤なら、水1Lに0.02％で約${v(N.l002)}、0.1％で約${v(N.l01)}です。</p>
${stair(zBox('ペットボトルの水', '500ml'), { b: `÷${N.r01 - 1}`, small: `${HYOHAKU_SRC}％を0.1％に` }, zBox('漂白剤', v(N.pet01), true), ['漂白剤の量 ＝ 水の量 ÷（倍率 − 1）', `500 ÷ ${N.r01 - 1} で約${v(N.pet01)}。ペットボトルのキャップで${cap(N.pet01)}です。`])}
<p>運営者の仕事は、ビルや病院の清掃と、職場の安全衛生です。ここに書くのはその勤め先の決まりで、どの職場でも同じとはかぎりません。役所のページに書いてあることと重なる所もあれば、勤め先が数字や道具まで決めている所もあるので、1つずつ分けて見ていきます。濃度を変えた量は<a href="/hyohakuzai/">次亜塩素酸ナトリウムの薄め方</a>で出せます。</p>`,
)}
${section(
  'goggle',
  '薄めるときはゴーグルをつける',
  `<p>厚生労働省などの消毒のページには、次亜塩素酸ナトリウムが目に入ったり皮膚についたりしないよう注意する、と書いてあります。広島市のページは、ビニールなどの樹脂製の手袋を使い、皮膚についたときはすぐ水で洗い流すよう求めています。</p>
<p>どちらのページにもゴーグルという言葉は出てきません。勤め先では、目に入らないようにという注意を、薄める作業のときにかける道具まで決めているわけです。目に入ったときの手当ては、製品の表示を見て、医師に相談してください。</p>`,
)}
${section(
  'bottle',
  'まぎらわしいボトルに入れない',
  `<p>勤め先では、飲みものや別の洗剤と見まちがえるような容器に、薄めた消毒液を入れないことになっています。広島市のページも、ペットボトルで作ったときは、飲みまちがいを防ぐために消毒液だとはっきり書くよう求めています。</p>
<p>ペットボトルで作るときは、キャップが量りの代わりになります。広島市のページでは、500mlのペットボトルのキャップは約${PET_CAP}mlです。${HYOHAKU_SRC}％の漂白剤で0.1％を作るなら、水500mlに約${v(N.pet01)}で、キャップ${cap(N.pet01)}になります。0.02％を水1Lで作るなら約${v(N.l002)}で、キャップ${cap(N.l002)}です。</p>
<p>ハイターのキャップは約${HYOHAKU_CAP}mlなので、ペットボトルのキャップの${fmt(N.capRatio)}倍あります。同じ「キャップ1杯」と書いてあっても、どのキャップの話かで量が大きくちがいます。</p>`,
)}
${section(
  'jikan',
  '薄めてから24時間以内に使い切る',
  `<p>勤め先では、薄めた液は24時間以内に使い切る決まりです。広島市のページは、薄めた消毒液は時間がたつと効果がなくなるので、作り置きをせず、使うときに要る量だけ作るよう書いています。24時間という長さは勤め先の決まりで、広島市のページに時間の数字は出ていません。</p>
<p>原液のほうも、広島市は直射日光の当たる所や高温の所に置かないよう書いていて、塩素が日光で分解しやすいことを理由にあげています。</p>
<p>使い切るには、作業に合わせて作る量を先に決めます。床を拭く0.02％をバケツで作るなら、${HYOHAKU_SRC}％の漂白剤は水3Lに約${v(N.b3)}、水5Lに約${v(N.b5)}です。吐いたものの片づけに使う0.1％は、ペットボトル1本分の水500mlで約${v(N.pet01)}になります。</p>`,
)}
${section(
  'hyou',
  '原液の濃度ごとの量（水1L）',
  `<div class="tbl-wrap"><table>
<thead><tr><th>原液の濃度</th><th class="num">0.02％</th><th class="num">0.1％</th></tr></thead>
<tbody>
${SRC_LIST.map(tblRow).join('\n')}
</tbody>
</table></div>
${printLink('hyohakuzai')}
<p>塩素系の消毒剤には、原液が1％から12％くらいまでのものがあると広島市のページにあります。広島市の表は5％と10％の原液で作る量で、花王のハイターは作ったときに${HYOHAKU_SRC}％です。そのため役所の表の数字と、ハイターで作るときの数字は合いません。</p>
<p>${HYOHAKU_SRC}％の漂白剤を、5％の原液の量で水1Lに${v(amountFor(5, 0.1, 1000))}入れると、0.1％のつもりが約${fmt(N.over, 2)}％になります。反対に5％の原液を${HYOHAKU_SRC}％の量の${v(N.l01)}で作ると、約${fmt(N.under, 3)}％です。ボトルの表示で原液の濃度を見てから、その濃度の行を使ってください。</p>
<p>病院清掃受託責任者や清掃作業監督者の講習を受ける時期を知りたいときは、<a href="${ANZEN}">安全衛生の便利帳</a>に資格ごとの更新の目安があります。</p>`,
)}
`,
  faqs: [
    { q: '薄めた消毒液は、何時間まで使えますか？', a: '<p>広島市のページは時間の数字を出さず、作り置きをしないで使うときに作るよう書いています。運営者の勤め先では、薄めてから24時間以内に使い切る決まりです。</p>' },
    { q: 'ペットボトルのキャップは何mlですか？', a: `<p>広島市のページでは、500mlのペットボトルのキャップは約${PET_CAP}mlです。${HYOHAKU_SRC}％の漂白剤で0.1％を水500mlに作るなら、キャップ${cap(N.pet01)}です。</p>` },
  ],
  sources: [
    { name: '広島市 消毒液の作り方と使用上の注意（次亜塩素酸ナトリウム）', url: HIROSHIMA, checked: '2026-11-15', what: '5％と10％の原液の量・ペットボトルのキャップ約5ml・作り置きをしない・表示・手袋・原液の置き場所' },
    { name: '新型コロナウイルスの消毒・除菌方法について（厚生労働省・経済産業省・消費者庁）', url: MHLW, checked: '2026-11-15', what: '目に入ったり皮膚についたりしないよう注意すること' },
    { name: '花王 よくあるご質問', url: KAO, checked: '2026-10-17', what: `ハイターの濃度${HYOHAKU_SRC}％とキャップ1杯約${HYOHAKU_CAP}ml` },
    { name: '厚生労働省 ノロウイルスに関するQ&A', url: HYOHAKU_AMOUNT_SOURCES[0][1], checked: '2026-10-17', what: '0.02％と0.1％の使いみち' },
  ],
};
