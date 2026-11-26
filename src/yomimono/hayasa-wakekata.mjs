// 読みもの：速さのちがう2人で、同じ時刻に終わる場所の分け方
// 運営者から聞いた話3（docs/yomimono-neta.md）を入口に、面積を速さの割合で分ける計算。外の数字は使わない
// 1人で受けもったときの時間は src/lib/seisou.mjs の seisou() で出す。確かめは tests/yomimono-hayasa-wakekata.test.mjs
import { section } from '../layout.mjs';
import { band } from '../zukai.mjs';
import { seisou, minText, SEISOU_WORKS, SEISOU_SRC } from '../lib/seisou.mjs';
import { ROUMU_TANKA } from '../data/seisou-tanka.mjs';
import { fix, fmt } from '../lib/number.mjs';

/** 1人で area ㎡を受けもったときの分（1分未満は切り上げ。清掃の作業時間の計算と同じ） */
export const soloMin = (area, speed) => seisou({ area, people: 1, hours: null, speed, out: 'hours' }).minutes;

/**
 * 面積を速さの割合で分ける。shares は1㎡単位（最後の人が残りを受けもつ）、minutes は全員がいっしょに終わる時間
 * @param {number} area 面積（㎡）
 * @param {number[]} speeds 1人1時間に掃除できる面積（㎡）
 */
export function wakeru(area, speeds) {
  const sum = speeds.reduce((a, b) => a + b, 0);
  const shares = speeds.map((s) => Math.round(fix((area * s) / sum)));
  shares[shares.length - 1] = area - shares.slice(0, -1).reduce((a, b) => a + b, 0);
  const each = shares.map((a, i) => soloMin(a, speeds[i]));
  return { sum, shares, each, minutes: Math.max(...each) };
}

const AREA = 600;
const A = 120;
const B = 80;
const main = wakeru(AREA, [A, B]);
const half = AREA / 2;
const evenA = soloMin(half, A);
const evenB = soloMin(half, B);

// 早見表：600㎡を2人で。1人目は120㎡、2人目の速さを変える
export const HAYAMI = [120, 100, 80, 60].map((b) => {
  const w = wakeru(AREA, [A, b]);
  return { b, a: w.shares[0], bShare: w.shares[1], minutes: w.minutes, even: Math.max(soloMin(half, A), soloMin(half, b)) };
});

// 3人：960㎡を100・80・60㎡の3人で
const three = wakeru(960, [100, 80, 60]);

// 2人目が30分おくれて来る：1人目が先に30分ぶん進め、残りを2人の速さの割合で分ける
const LATE = 30;
const aloneArea = fix((A * LATE) / 60);
const rest = wakeru(AREA - aloneArea, [A, B]);
const lateTotal = LATE + rest.minutes;
const lateA = aloneArea + rest.shares[0];
const naiveB = LATE + main.each[1]; // おくれを考えずに360㎡と240㎡で分けたときの2人目の終わり

// 速さの測り方：150㎡を1時間30分
const measured = fix(150 / 1.5);

const toilet = SEISOU_WORKS.find((w) => w.id === 'toilet');
const office = SEISOU_WORKS.find((w) => w.id === 'office');

export const NUMS = {
  area: AREA,
  a: A,
  b: B,
  sum: main.sum, // 200㎡
  minutes: main.minutes, // 180分
  shareA: main.shares[0], // 360㎡
  shareB: main.shares[1], // 240㎡
  evenA, // 150分
  evenB, // 225分
  evenLate: evenB - main.minutes, // 45分
  evenWait: evenB - evenA, // 75分
  threeShares: three.shares, // 400・320・240㎡
  threeMinutes: three.minutes, // 240分
  aloneArea, // 60㎡
  lateTotal, // 192分
  lateA, // 384㎡
  lateB: rest.shares[1], // 216㎡
  naiveB, // 210分
  lateSave: naiveB - lateTotal, // 18分
  measured, // 100㎡
  toiletSpeed: toilet.speed, // 49㎡
  officeSpeed: office.speed, // 370㎡
  bai: Math.floor(office.speed / toilet.speed), // 7倍以上
};
const N = NUMS;
const m2 = (x) => `${fmt(x)}㎡`;

const BAND = band({
  head: `床 ${m2(AREA)}・1時間 ${A}㎡の人と${B}㎡の人`,
  parts: [
    { w: (N.shareA / AREA) * 100, text: `${A}㎡の人 ${m2(N.shareA)}` },
    { w: (N.shareB / AREA) * 100, kind: 'alt', text: `${B}㎡の人 ${m2(N.shareB)}` },
  ],
  ruler: [[0, '0'], [(N.shareA / AREA) * 100, m2(N.shareA)], [100, m2(AREA)]],
  ans: `2人とも <b>${minText(N.minutes)}</b> で終わる`,
  label: `${AREA}㎡の床の帯を、1時間${A}㎡の人の${N.shareA}㎡と、${B}㎡の人の${N.shareB}㎡に分けた図`,
});

const BAND_EVEN = band({
  head: `同じ ${m2(AREA)}を ${m2(half)}ずつに分けたとき`,
  parts: [
    { w: (evenA / evenB) * 100, text: `${A}㎡の人 ${minText(evenA)}` },
    { w: 100 - (evenA / evenB) * 100, kind: 'off', text: '' },
  ],
  ruler: [[0, '0'], [100, minText(evenB), true]],
  ans: `${B}㎡の人が終わるのは <b>${minText(evenB)}</b> 後`,
  label: `半分ずつ分けると、1時間${A}㎡の人は${minText(evenA)}で終わり、${B}㎡の人が終わる${minText(evenB)}まで待つことを、時間の帯で表した図`,
});

const row = (h) => `<tr><td class="num">${h.b}㎡</td><td class="num">${fmt(h.a)}・${fmt(h.bShare)}㎡</td><td class="num">${minText(h.minutes)}</td><td class="num">${minText(h.even)}</td></tr>`;

export default {
  slug: 'hayasa-wakekata',
  title: '速さのちがう2人で、同じ時刻に終わる場所の分け方',
  lead: '面積を速さの割合で分けます。',
  category: 'shigoto',
  tools: ['genba', 'seisou-jikan'],
  published: '2026-11-26',
  updated: '2026-11-26',
  description: `1時間に120㎡の人と80㎡の人で600㎡を掃除するなら、360㎡と240㎡に分けると2人とも3時間で終わります。半分ずつより45分早い分け方の式と早見表、3人のときや遅れて来る人がいるときの例です。`,
  body: `
${section(
  'kotae',
  '速さの割合で面積を分ける',
  `<p>1時間に${A}㎡掃除できる人と${B}㎡の人で${m2(AREA)}を受けもつなら、${m2(N.shareA)}と${m2(N.shareB)}に分けると、2人とも${minText(N.minutes)}で同じ時刻に終わります。2人の速さを足した1時間${N.sum}㎡で全体を割ると、いっしょに終わる時間が出ます。</p>
${BAND}
<p>受けもつ面積は、全体に自分の速さの割合をかけた数です。${A}㎡の人は${AREA} × ${A} ÷ ${N.sum}で${m2(N.shareA)}、${B}㎡の人は${AREA} × ${B} ÷ ${N.sum}で${m2(N.shareB)}になります。速さの比が3対2なので、面積も3対2です。</p>
<p>運営者の勤め先では、人数や時間割を決めるとき、組む人との相性と、各自の手の速さを見て調整することが多いそうです。この読みものでは、そのうち手の速さのほうだけを数字にしています。</p>`,
)}
${section(
  'hanbun',
  '半分ずつに分けると、どうなるか',
  `<p>同じ${m2(AREA)}を${m2(half)}ずつにすると、${A}㎡の人は${minText(evenA)}で終わり、${B}㎡の人は${minText(evenB)}かかります。全体が終わるのは${minText(evenB)}後で、速さに合わせて分けたときより${minText(N.evenLate)}おそくなります。</p>
${BAND_EVEN}
<p>先に終わった人は${minText(N.evenWait)}あくので、そのあいだにほかの場所を手伝えば、全体の時間は縮まります。はじめから速さに合わせて分けておけば、終わった人がどこを手伝うかを途中で決めなくてすみます。</p>`,
)}
${section(
  'hayami',
  '2人目の速さごとの早見表',
  `<p>${m2(AREA)}を2人で掃除し、1人目は1時間${A}㎡のときです。左の列の2人目の速さを変えて、1人目・2人目の順に分ける面積と、終わるまでの時間を並べました。右の列は、半分ずつに分けたときに全体が終わる時間です。</p>
<div class="tbl-wrap"><table>
<thead><tr><th class="num">2人目</th><th class="num">面積</th><th class="num">終わる</th><th class="num">半分ずつ</th></tr></thead>
<tbody>
${HAYAMI.map(row).join('\n')}
</tbody>
</table></div>
<p class="note">面積は1㎡単位、時間は1分未満を切り上げ。</p>
<p>2人の速さが同じなら、半分ずつと同じです。差が大きいほど、半分ずつにしたときの待ち時間が長くなります。2人目が1時間${HAYAMI[3].b}㎡なら、速さに合わせると${minText(HAYAMI[3].minutes)}、半分ずつでは${minText(HAYAMI[3].even)}で、${minText(HAYAMI[3].even - HAYAMI[3].minutes)}の差です。</p>`,
)}
${section(
  'rei',
  '3人のときと、おくれて来る人がいるとき',
  `<p>3人でも考え方は同じです。1時間100㎡・80㎡・60㎡の3人で960㎡なら、速さを足すと1時間240㎡で、${minText(N.threeMinutes)}で終わります。受けもつ面積は${N.threeShares.map(m2).join('・')}です。</p>
<p>2人目が${LATE}分おくれて来る日は、1人目が先に1人で進めます。${LATE}分で${m2(N.aloneArea)}が終わるので、残りの${m2(AREA - N.aloneArea)}を2人の速さの割合で分けます。1人目は合わせて${m2(N.lateA)}、2人目は${m2(N.lateB)}で、はじめてから${minText(N.lateTotal)}後に2人とも終わります。</p>
<p>おくれを考えずに${m2(N.shareA)}と${m2(N.shareB)}のまま分けると、2人目が終わるのは、はじめてから${minText(N.naiveB)}後です。おくれた分を1人目の面積に足しておくと、${minText(N.lateSave)}早く終わります。</p>`,
)}
${section(
  'hakaru',
  '一人ひとりの速さを数字にする',
  `<p>速さは、掃除した面積をかかった時間で割ると出ます。150㎡を1時間30分で終えた人なら、150 ÷ 1.5で1時間${m2(N.measured)}です。面積がわかっている部屋を何度か受けもったときの時間を控えておくと、その人の速さの目安になります。</p>
<p>はじめての人や、まだ測っていないときは、公共の建物の清掃を見積もるときの目安が使えます。<a href="/seisou-jikan/">清掃の作業時間の計算</a>に入っている目安では、1人1時間に事務室は約${m2(N.officeSpeed)}、トイレは約${m2(N.toiletSpeed)}です。これは多くの人の平均の目安なので、一人ひとりの速さのちがいは入っていません。分け方を決めるには、同じ場所で測った速さどうしをくらべます。</p>
<p>分け方が決まったら、<a href="/genba/">現場手帳</a>に場所と面積を入れると、場所ごとの時刻が入った1枚の作業計画書になります。</p>`,
)}
${section(
  'mistakes',
  'まちがえやすいところ',
  `<p>速さの差を、面積の差としてそのまま引いてしまうまちがいがあります。1時間に40㎡ちがうからといって、${m2(AREA)}を320㎡と280㎡のように40㎡だけずらしても、時間はそろいません。そろうのは、速さの比と面積の比が同じときです。</p>
<p>事務室で測った速さの比が、トイレでも同じとはかぎりません。清掃の作業時間の計算の目安でも、事務室とトイレでは1時間の面積が${N.bai}倍以上ちがい、作業の中身が大きくちがいます。場所の種類がちがうときは、場所ごとに測った速さで分けます。</p>
<p>面積は1㎡単位、時間は1分単位で丸めるので、割り切れないときは数分ずれます。早見表で2人目が1時間${HAYAMI[1].b}㎡のときは、${m2(HAYAMI[1].a)}と${m2(HAYAMI[1].bShare)}に分けます。それぞれの面積を自分の速さで割ると、どちらも1分未満を切り上げて${minText(HAYAMI[1].minutes)}になります。</p>`,
)}
`,
  faqs: [
    { q: '速さのちがう2人で、同じ時刻に終わるにはどう分けますか？', a: `<p>速さの比と同じ比で面積を分けます。速さが3対2なら、${m2(AREA)}は${m2(N.shareA)}と${m2(N.shareB)}です。</p>` },
    { q: '2人で掃除すると何時間で終わりますか？', a: `<p>速さを分け合ってそろえたときは、全体の面積 ÷ 2人の速さの合計です。1時間${N.sum}㎡なら${m2(AREA)}は${minText(N.minutes)}です。</p>` },
  ],
  sources: [
    { name: '札幌市 清掃業務の積算', url: SEISOU_SRC.daily, checked: ROUMU_TANKA.checked, what: '事務室とトイレの日常清掃の歩掛り' },
  ],
};
