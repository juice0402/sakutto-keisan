// 読みもの：委託料30％は何掛け？卸と委託で受け取る額をくらべる
// 委託販売で売ったことになる日は、国税庁の消費税法基本通達9-1-3（2026-11-22 に開いて確かめた）
// 受け取る額は src/lib/kakeritsu.mjs、材料費を引いた残りの割合は src/lib/rieki.mjs で出す。確かめは tests/yomimono-itaku-kakeritsu.test.mjs
import { section } from '../layout.mjs';
import { band } from '../zukai.mjs';
import { kakeritsu, kakeText } from '../lib/kakeritsu.mjs';
import { rieki, pctText } from '../lib/rieki.mjs';
import { fmt } from '../lib/number.mjs';

/** 委託料（％）から、作り手が受け取る額（上代 ×（100 − 委託料）％）と掛け率 */
export function uketori(jodai, itaku) {
  const r = kakeritsu({ jodai, rate: 100 - itaku, gedai: null, out: 'gedai' });
  return { pct: r.pct, kake: kakeText(r.pct), uketori: r.gedai, itakuryo: r.profit };
}

const JODAI = 2400;
export const HAYAMI = [10, 15, 20, 25, 30, 35, 40, 45, 50].map((itaku) => ({ itaku, ...uketori(JODAI, itaku) }));

const main = uketori(JODAI, 30);
const r2500 = uketori(2500, 35);
const gyaku = kakeritsu({ jodai: null, rate: 60, gedai: 1800, out: 'jodai' });
const oroshi = kakeritsu({ jodai: JODAI, rate: 60, gedai: null, out: 'gedai' });
const zairyo = rieki({ price: main.uketori, cost: 600, rate: null, out: 'rate' });

export const NUMS = {
  jodai: JODAI,
  uketori30: main.uketori, // 1,680円
  itakuryo30: main.itakuryo, // 720円
  kake30: main.kake, // 7
  u2500: r2500.uketori, // 1,625円
  kake2500: r2500.kake, // 6.5
  gyakuJodai: gyaku.jodai, // 3,000円
  oroshi6: oroshi.gedai, // 1,440円
  sa: main.uketori - oroshi.gedai, // 240円
  oroshi10: oroshi.gedai * 10, // 14,400円
  itaku6: main.uketori * 6, // 10,080円
  hitsuyou: Math.ceil((oroshi.gedai * 10) / main.uketori), // 9個
  zan: zairyo.profit, // 1,080円
  zanRate: zairyo.rate, // 64.28…％
};
const N = NUMS;
const y = (x) => `${fmt(x)}円`;

const BAND = band({
  head: `上代 ${y(JODAI)}・委託料30％`,
  parts: [
    { w: 70, text: `受け取る ${y(N.uketori30)}` },
    { w: 30, kind: 'alt', text: `委託料 ${y(N.itakuryo30)}` },
  ],
  ruler: [[0, '0'], [70, fmt(N.uketori30)], [100, fmt(JODAI)]],
  ans: `受け取るのは上代の70％ → <b>7掛け</b>`,
  label: `上代${fmt(JODAI)}円の帯を、作り手が受け取る${fmt(N.uketori30)}円と委託料${fmt(N.itakuryo30)}円に分けた図`,
});

const BAND2 = band({
  head: `同じ上代 ${y(JODAI)}を卸の6掛けにしたとき`,
  parts: [
    { w: 60, text: `卸値 ${y(N.oroshi6)}` },
    { w: 40, kind: 'alt', text: `お店 ${y(JODAI - N.oroshi6)}` },
  ],
  ruler: [[0, '0'], [60, fmt(N.oroshi6)], [100, fmt(JODAI)]],
  ans: `委託料30％より1個あたり <b>${y(N.sa)}</b> 少ない`,
  label: `上代${fmt(JODAI)}円の6掛けの卸値${fmt(N.oroshi6)}円と、お店の取り分を分けた図`,
});

const row = (h) => `<tr><td class="num">${h.itaku}％</td><td class="num">${h.kake}掛け</td><td class="num">${fmt(h.uketori)}円</td></tr>`;

export default {
  slug: 'itaku-kakeritsu',
  title: '委託料30％は何掛け？卸と委託で受け取る額をくらべる',
  lead: '委託料を掛け率に読みかえます。',
  category: 'shigoto',
  tools: ['kakeritsu', 'rieki-ritsu'],
  published: '2026-11-22',
  updated: '2026-11-22',
  description: `委託料30％で受け取るのは上代の70％で、7掛けの卸と同じ額です。上代2,400円なら1,680円。委託料10〜50％の早見表と、6掛けの卸とのくらべ、委託で売ったことになる日の決まりも書きました。`,
  body: `
${section(
  'kotae',
  '委託料30％なら7掛けと同じ額',
  `<p>委託料が上代の30％なら、作り手が受け取るのは残りの70％で、7掛けで卸したときと同じ額です。上代${y(JODAI)}の作品なら、1つ売れるごとに${y(N.uketori30)}を受け取り、${y(N.itakuryo30)}がお店の取り分になります。</p>
${BAND}
<p>委託料はお店が取る割合で、掛け率は作り手が受け取る割合なので、同じ取引でも見ている側が反対です。100から委託料を引いた数が掛け率になる、と覚えておくと読みかえられます。委託料35％なら65％で6.5掛け、委託料40％なら6掛けです。</p>
<p>お店によって呼び方がちがっても、上代のうち何％をお店が取るかという話なら、同じ引き算で掛け率に直せます。</p>`,
)}
${section(
  'hayami',
  '委託料と掛け率の早見表',
  `<p>上代${y(JODAI)}の作品で、委託料ごとに受け取る額を並べました。</p>
<div class="tbl-wrap"><table>
<thead><tr><th class="num">委託料</th><th class="num">掛け率</th><th class="num">受け取る額</th></tr></thead>
<tbody>
${HAYAMI.map(row).join('\n')}
</tbody>
</table></div>
<p class="note">上代${fmt(JODAI)}円のとき。1円未満は出ない値です。</p>
<p>委託料が5％上がるごとに、受け取る額は上代の5％ずつ、この作品なら120円ずつ減ります。上代がちがう作品は、上代と掛け率を<a href="/kakeritsu/">掛け率の計算</a>に入れると、受け取る額が出ます。委託料の割合はお店ごとに決まっていて、どのくらいの割合が多いかを示す公的な資料は見つからなかったので、ここでは書きません。</p>`,
)}
${section(
  'rei',
  '場面ごとの計算の例',
  `<p>上代2,500円のアクセサリーを、委託料35％のお店に置く場合です。掛け率は${N.kake2500}掛けで、1つ売れると${y(N.u2500)}を受け取ります。</p>
<p>反対に、手元に1つ1,800円は残したいとき、委託料40％のお店なら上代はいくらにすればよいか。受け取るのは上代の60％なので、1,800円を0.6で割って${y(N.gyakuJodai)}です。掛け率の計算で、下代の欄に1,800、掛け率の欄に60を入れると、この上代が出ます。</p>
<p>受け取る額から材料費を引いた残りは、<a href="/rieki-ritsu/">利益率の計算</a>で見られます。上代${y(JODAI)}を委託料30％で売り、材料費が600円なら、受け取る${y(N.uketori30)}から引いて${y(N.zan)}が残ります。受け取る額を売値、材料費を原価として入れると、利益率は${pctText(N.zanRate)}％です。お客さんが払う上代ではなく、受け取る額を売値の欄に入れるところが、お店で売るときとちがいます。</p>`,
)}
${section(
  'oroshi',
  '6掛けの卸と委託料30％をくらべる',
  `<p>同じ上代${y(JODAI)}の作品を、6掛けで卸すお店と、委託料30％のお店があるとします。1つあたりでは、卸値は${y(N.oroshi6)}で、委託のほうが${y(N.sa)}多く受け取れます。</p>
${BAND2}
<p>ただし、卸で10個を買い取ってもらう約束なら、受け取るのは${y(N.oroshi10)}です。委託で10個を置いて6個売れたときは${y(N.itaku6)}で、卸のほうが多くなります。委託で${y(N.oroshi10)}以上を受け取るには、10個のうち${N.hitsuyou}個が売れる必要があります。何個売れそうかで、どちらの受け取りが多くなるかが入れかわります。売れ残った作品をどう扱うかは、お店との取り決めによります。</p>`,
)}
${section(
  'hi',
  '委託で売ったことになる日',
  `<p>受け取る額が同じでも、委託と卸では、作り手が売ったことになる日がちがいます。国税庁の消費税法基本通達では、品物を売った日は、引き渡した日とされています。引き渡した日は、出荷した日や相手が検収した日などのうち、続けて使っている日で決めます。</p>
<p>委託販売については別の項目があり、作り手が売ったことになるのは、原則としてお店がその品をお客さんに売った日とされています。お店に作品を並べた日ではありません。11月に置いた作品が12月に売れたなら、12月に売ったことになります。</p>
<p>ただし書きもあります。お店が売れるつどに売上計算書を作っていて、作り手が続けてその計算書が届いた日を売った日にしているときは、その扱いも認められます。週や月ごとにまとめて作る計算書も、売れるつどに作るものに当たると注に書かれています。ここで書いたのは通達の文の範囲です。自分の取引がどれに当たるか迷うときは、税務署や税理士に確かめてください。</p>`,
)}
${section(
  'mistakes',
  'まちがえやすいところ',
  `<p>委託料30％を3掛けと読みちがえると、受け取る額を上代の30％で見積もってしまいます。上代${y(JODAI)}なら720円と${y(N.uketori30)}で、2倍以上の差です。30％オフの値引きとも別の話で、委託料はお客さんが払う額を変えません。</p>
<p>委託料が税込みの上代にかかるのか、税抜きにかかるのかも、お店との取り決めで変わります。上代を税込みで決めていて、委託料も税込みにかかるなら、受け取る額も税込みの額から出ます。契約書や取り決めの紙で、どちらにかかるかを見ておくと、計算の数字が合います。</p>`,
)}
`,
  faqs: [
    { q: '委託料30％は何掛けですか？', a: `<p>100から30を引いた70％なので、7掛けと同じです。上代${y(JODAI)}なら、受け取るのは${y(N.uketori30)}です。</p>` },
    { q: '委託販売の売上は、いつの売上になりますか？', a: '<p>国税庁の消費税法基本通達では、原則としてお店がその品を売った日です。売上計算書が届いた日にするただし書きもあります。</p>' },
  ],
  sources: [
    { name: '国税庁 消費税法基本通達 第9章 資産の譲渡等の時期', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/shohi/09/01/01.htm', checked: '2026-11-22', what: '9-1-1の引渡しの日と、9-1-3の委託販売で売ったことになる日・売上計算書のただし書きと注' },
  ],
};
