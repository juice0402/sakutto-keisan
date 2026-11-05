// テスト用の見本の読みもの（本番には出ない。tests/yomimono.test.mjs と、棚のスクショを撮るときだけ使う）
import { section } from '../../../src/layout.mjs';
import { stair, zBox, zReceipt } from '../../../src/zukai.mjs';
import { TOUYU_PRICE, TOUYU_HEATERS } from '../../../src/data/touyu.mjs';
import { touyu } from '../../../src/lib/touyu.mjs';
import { fmt } from '../../../src/lib/number.mjs';

const P18 = TOUYU_PRICE.can;
const small = touyu({ lph: TOUYU_HEATERS[0].max, hours: 8, price: P18 });
const big = touyu({ lph: TOUYU_HEATERS[3].max, hours: 8, price: P18 });
export const NUMS = { smallMonth: Math.round(small.month), bigMonth: Math.round(big.month), smallDays: small.canDays, bigDays: big.canDays };

const ROWS = TOUYU_HEATERS.map((h) => {
  const r = touyu({ lph: h.max, hours: 8, price: P18 });
  return `<tr><td>${h.short}</td><td class="num">${fmt(r.litersDay, 1)}L</td><td class="num">約${fmt(r.month, 0)}円</td><td class="num">${fmt(r.canDays, 1)}日</td></tr>`;
}).join('');

export default {
  slug: 'touyu-mihon',
  title: 'ファンヒーターの大きさで灯油代はどれだけ変わる？',
  lead: '9畳用と17畳用を同じ時間でくらべます。',
  category: 'seikatsu',
  tools: ['touyu-dai', 'denki-dai'],
  published: '2026-11-03',
  updated: '2026-11-04',
  description: `見本の読みものです。18L ${fmt(P18)}円で1日8時間、強のまま使うと、9畳用は1か月約${fmt(small.month, 0)}円、17畳用は約${fmt(big.month, 0)}円でした。大きさごとの1か月の灯油代と18Lで何日もつかを表にしています。`,
  body: `
${section('kotae', '1か月の灯油代のちがい', `<p>これはテストのための見本の文です。18Lが${fmt(P18)}円のとき、1日8時間を強のまま使うと、9畳用のファンヒーターは1か月に約${fmt(small.month, 0)}円、17畳用は約${fmt(big.month, 0)}円になります。同じ時間を使っても、大きい機械ほど1時間に燃やす灯油が多いので、そのぶん1か月の額も大きくなります。</p>
${stair(zBox('9畳用・1日8時間', `${fmt(small.litersDay, 1)}L`), { b: '×30日×1Lの値段' }, zReceipt('1か月', `約${fmt(small.month, 0)}円`, true), ['1か月 ＝ 1日の灯油 × 30日 × 1Lの値段'])}
<p>部屋がじゅうぶん暖まると火が弱くなるので、実際の額は表より小さくなることが多いです。ここでは、いちばん多く使うときの目安として、強のときの量で計算しています。弱のときの量は、計算のページの表にあります。</p>`)}
${section('hyou', '大きさごとの早見表', `<div class="tbl-wrap"><table><thead><tr><th>大きさ</th><th class="num">1日</th><th class="num">1か月</th><th class="num">18Lで</th></tr></thead><tbody>${ROWS}</tbody></table></div>
<p>表の数字は、メーカーの仕様のページにある燃料消費量の強のときの値に、1日8時間と30日をかけて出しています。18Lの値段は、資源エネルギー庁の価格調査の全国平均です。地域やお店によって値段はちがうので、自分の買った値段を計算のページに入れると、自分の家の額がわかります。</p>
<p>9畳用と17畳用では、1時間の灯油が2倍ほどちがいます。そのため、18Lのポリタンク1つがもつ日数も、9畳用は${fmt(small.canDays, 1)}日、17畳用は${fmt(big.canDays, 1)}日と大きくちがいます。灯油を買いに行く回数を考えるときは、この日数が目安になります。</p>`)}
${section('erabi', '部屋より大きい機械を使うとき', `<p>部屋の広さより大きい機械を使うと、早く暖まって火が弱くなる時間が長くなります。そのため、表ほどの差にはならないことがあります。反対に、部屋より小さい機械を使うと、強のままの時間が長くなりやすく、表の強のときの値に近くなります。</p>
<p>どちらがよいかは、部屋の広さ、窓の数、家の断熱、外の気温によって変わります。ここでは言い切らずに、説明書の燃料消費量と、自分が使っている時間を入れて確かめる形にしています。暖房の種類をくらべたいときは、電気代の計算もいっしょに使えます。エアコンやこたつの電気代と、灯油代を同じ1か月でならべると、冬の暖房にかかる額の全体が見えます。</p>
<p>これは見本なので、本番のページには出ません。棚の形を確かめるために、表と図と文をひととおり入れています。文の長さは、読みものの決まりの1,200字をこえるようにしてあり、点検の字数の数え方が正しく動くかも、この見本で確かめます。数えるのは本文の節だけで、棚が下に足す節は数えません。表の中の字と見出しも数えません。</p>
<p>灯油の値段は週ごとに変わります。資源エネルギー庁は毎週の値段を公表しているので、冬のあいだは月に1回ほど、自分の家の近くのお店の値段と見くらべると、1か月の額の見当がずれにくくなります。値段が100円上がると、9畳用を1日8時間使う家では、1か月の灯油代が数百円ほど上がる計算です。こうした小さな差も、計算のページに数字を入れると、たしかめられます。</p>
<p>1日に使う時間も、家によって大きくちがいます。朝と夜だけ使う家と、日中も家にいて使う家では、1日の時間が倍ほどちがうこともあります。表は1日8時間で作っていますが、自分の家の時間を計算のページに入れれば、同じ機械でも1か月の額がどれだけ変わるかがわかります。</p>`)}
`,
  faqs: [
    { q: '弱のときの灯油代は？', a: '<p>計算のページの表に、強と弱の両方の1時間の灯油と灯油代があります。</p>' },
    { q: '1か月は何日で計算していますか？', a: '<p>30日です。</p>' },
  ],
  sources: [
    { name: TOUYU_PRICE.src, url: TOUYU_PRICE.url, checked: '2026-10-15', what: '灯油18Lの全国平均の店頭価格' },
    { name: 'ダイニチ工業 石油ファンヒーター', url: TOUYU_HEATERS[0].url, checked: '2026-10-15', what: '燃料消費量' },
  ],
};
