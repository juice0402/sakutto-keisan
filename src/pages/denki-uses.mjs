// 家電別の電気代のページ（こたつ・電気毛布・ホットカーペット・セラミックヒーター・オイルヒーター）。電気代の計算の下のページ
// 計算カードは電気代の計算と同じ部品で、マスを「強・弱」などの強さにする。数字はメーカーの表示（src/data/denki.mjs に出典）
// 表の数字は tests/denki.test.mjs でも確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { denkiCard, hourYen, denkiZukai, denkiBars } from '../denki.mjs';
import { DENKI_PRICE, DENKI_USES, DENKI_MORE, DENKI_MAKER, DENKI_CHECKED } from '../data/denki.mjs';
import { denki } from '../lib/denki.mjs';
import { fmt } from '../lib/number.mjs';

const P = DENKI_PRICE.value;
const esc = (s) => s.replace(/&/g, '&amp;');
const link = (name, url) => `<a href="${esc(url)}">${name}</a>`;
const yen1 = (x) => fmt(x, 1);
const cost = (watt, hours) => denki({ watt, hours, price: P });
const yen0 = (x) => fmt(Math.round(x), 0);
const checked = `${Number(DENKI_CHECKED.slice(0, 4))}年${Number(DENKI_CHECKED.slice(5, 7))}月${Number(DENKI_CHECKED.slice(8))}日`;
// メーカーの数字の出典（確認日つき）
const srcLine = (...keys) => `<p>出典：${keys.map((k) => link(DENKI_MAKER[k].name, DENKI_MAKER[k].url)).join('・')}（${checked}に確認）</p>`;

// ページごとの文（よくある質問はメーカーの表示と、その数字から計算したものだけ）
const TEXT = {
  kotatsu: {
    title: 'こたつの電気代｜1時間・1か月はいくら？強と弱で計算',
    lead: 'こたつの電気代を、強と弱で計算します。',
    desc: (m) => `こたつの電気代を計算します。家具調こたつは1時間に強で約${yen1(cost(m[0].watt, 1).hour)}円、弱で約${yen1(cost(m[1].watt, 1).hour)}円（山善の表示・単価${P}円）。1日8時間なら1か月で強が約${fmt(cost(m[0].watt, 8).month, 0)}円です。使う時間と単価を変えて計算できます。`,
    note: '強と弱は、メーカーが出している1時間の消費電力量（強180Wh・弱70Wh）です。最大は消費電力（600W）のまま動いたときです。',
    faqs: (u) => [
      { q: 'こたつの電気代は1時間いくらですか？', a: `<p>${u.product}は、1時間の消費電力量が強で180Wh、弱で70Whです。単価${P}円なら、強で約5.6円、弱で約2.2円です。</p>` },
      { q: '消費電力が600Wなのに、電気代が安いのはなぜですか？', a: '<p>温かくなるとヒーターが止まったり弱くなったりするからです。600Wは、ヒーターがずっとついたときの値です。</p>' },
      { q: 'ほかのこたつではどれくらいですか？', a: `<p>${link(DENKI_MORE.nitoriKotatsu.name, DENKI_MORE.nitoriKotatsu.url)}の正方形のこたつ（ヒーター510W）は、1時間で弱が約2.5円、強が約5.3円と表示しています。室温20℃で、人が入らない状態の値です。</p>` },
      { q: 'エアコンとくらべるとどうですか？', a: `<p>6畳用のエアコンの暖房は、定格で470Wです（${link(DENKI_MORE.aircon.name, DENKI_MORE.aircon.url)}のCS-J226D）。こたつの強（1時間180Wh）は、その半分より小さい電力です。</p>` },
      { q: 'こたつをつけっぱなしにすると、1日いくらですか？', a: `<p>${u.product}を強で24時間なら、約${yen0(cost(180, 24).day)}円です。弱なら約${yen0(cost(70, 24).day)}円です。</p>` },
    ],
    how: `<p>こたつの温度調節のつまみは、ヒーターがついている時間の長さを変えるものです。山善のこたつの取扱説明書（GKR-802H）は、強でも弱でもヒーターの温度は同じで、ちがうのは点灯している時間だとしています。そのため、ヒーターが600Wの家具調こたつでも、強の1時間は180Wh、弱は70Whです。例：弱で1日5時間なら、0.07 × 31 × 5 ＝ 約${yen1(cost(70, 5).day)}円です。</p>`,
    more: `${section(
      'models',
      'こたつごとの電力量',
      `<div class="tbl-wrap"><table>
<thead><tr><th>こたつ</th><th class="num">ヒーター</th><th class="num">強</th><th class="num">弱</th></tr></thead>
<tbody>
<tr><td>山善 GKR-HDN802H</td><td class="num">600W</td><td class="num">180Wh</td><td class="num">70Wh</td></tr>
<tr><td>山善 GKR-802H</td><td class="num">300W</td><td class="num">約160Wh</td><td class="num">約80Wh</td></tr>
</tbody>
</table></div>
<p>1時間あたりの電力量です。単価${P}円なら、GKR-HDN802Hは強で約5.6円、弱で約2.2円、GKR-802Hは強で約5.0円、弱で約2.5円です。GKR-802Hの数字は、室温20℃で75×75cmのこたつに厚さ5cmのふとんを掛け、人が入らずに5時間動かしたときの平均です。取扱説明書は、厚めのふとんとこたつ用のマットを使うと熱が逃げにくいとしています。</p>
${srcLine('kotatsuHdn', 'kotatsuManual')}`,
    )}

${section(
  'scenes',
  '使う場面の例',
  `<p>夕方から寝るまで、強で1日6時間使うとき。GKR-HDN802Hなら1日約${yen1(cost(180, 6).day)}円で、30日では約${fmt(cost(180, 6).month, 0)}円です。</p>
<p>1日8時間のまま、強を弱にかえたとき。1か月は約${fmt(cost(180, 8).month, 0)}円から約${fmt(cost(70, 8).month, 0)}円になり、約${yen0(cost(180, 8).month - cost(70, 8).month)}円下がります。</p>
<p>ヒーターが300Wのこたつと600Wのこたつでまようとき。強で1日8時間・30日なら、160Whのほうは約${fmt(cost(160, 8).month, 0)}円、180Whのほうは約${fmt(cost(180, 8).month, 0)}円で、差は約${yen0(cost(180, 8).month - cost(160, 8).month)}円です。寝るときの電気代は<a href="/denki-moufu/">電気毛布の電気代</a>でくらべられます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>ヒーターの600Wで計算する</h3>
<p>600Wのまま1日8時間・30日で計算すると約${fmt(cost(600, 8).month, 0)}円になり、強の180Whで計算した約${fmt(cost(180, 8).month, 0)}円の3倍をこえます。こたつは温まるとヒーターが消えるので、1時間の電力量で計算します。</p>
<h3>メーカーの数字を、どんな部屋でも同じだと思う</h3>
<p>強の約160Whは、室温20℃で厚さ5cmのふとんを掛け、人が入らないときの値です。室温が低い部屋や、ふとんがうすいときは、ヒーターがついている時間が長くなり、これより多くなることがあります。</p>`,
)}`,
  },
  'denki-moufu': {
    title: '電気毛布の電気代｜1時間・ひと晩・1か月はいくら？',
    lead: '電気毛布の電気代を、目盛ごとに計算します。',
    desc: () => `電気毛布の電気代を計算します。電気しき毛布は1時間に「強」で約1.0円、目盛「3」で約0.6円（パナソニックの表示・室温10℃・単価${P}円）。ひと晩8時間なら「強」で約8円です。使う時間と単価を変えて計算できます。`,
    note: '強と目盛3は、メーカーが出している1時間の電気代（室温10℃）を31円で割って出した、目安の消費電力です。最大は定格の消費電力（54W）です。',
    faqs: (u) => [
      { q: '電気毛布の電気代は1時間いくらですか？', a: `<p>${u.product}は、室温10℃で「強」が約1.0円、目盛「3」が約0.6円です（単価${P}円）。</p>` },
      { q: 'ひと晩つけたままだといくらですか？', a: '<p>8時間なら、「強」で約8円、目盛「3」で約5円です。</p>' },
      { q: '定格54Wなのに、1時間1円くらいなのはなぜですか？', a: '<p>温かくなるとヒーターが止まったり弱くなったりするからです。54Wは、ヒーターがずっとついたときの値です。</p>' },
      { q: '電気毛布をつけたまま寝てもいいですか？', a: '<p>パナソニックの取扱説明書は、低温やけどを防ぐため、寝ているあいだは「切」か「弱」にするとしています。</p>' },
    ],
    how: `<p>電気毛布の電力は、毛布の大きさと温度の目盛で決まります。室温センサーが室温を見ながら毛布の温度を調節するので、1時間に使う電力は定格より小さくなります。メーカーの1時間の電気代は、室温10℃のときの値です。例：しき毛布の目盛3を6時間なら、約0.6円 × 6 ＝ 約${yen1(0.6 * 6)}円です。</p>`,
    more: `${section(
      'sizes',
      '毛布の大きさと電気代',
      `<div class="tbl-wrap"><table>
<thead><tr><th>毛布</th><th class="num">定格</th><th class="num">強</th><th class="num">目盛3</th></tr></thead>
<tbody>
<tr><td>しき毛布 約140×80cm</td><td class="num">54W</td><td class="num">約1.0円</td><td class="num">約0.6円</td></tr>
<tr><td>かけしき毛布 約188×137cm</td><td class="num">75W</td><td class="num">約1.7円</td><td class="num">約1.0円</td></tr>
</tbody>
</table></div>
<p>1時間の電気代で、室温10℃・単価${P}円のときです。しき毛布はDB-U12T、かけしき毛布はDB-R31Mで、表面の温度はどちらも「強」で51℃、目盛3で37℃です。大きい毛布は、同じ目盛でも電気代が上がります。</p>
${srcLine('moufuShiki', 'moufuKake', 'moufuManual')}`,
    )}

${section(
  'scenes',
  '使う場面の例',
  `<p>寝る約40分前に「強」で温めて、寝るときに切るとき。取扱説明書にある使いかたで、しき毛布なら40分で約${yen1((1.0 * 40) / 60)}円です。</p>
<p>12月から3月まで、しき毛布を目盛3で毎晩8時間使うとき。120日とすると、約0.6円 × 8時間 × 120日で約${yen0(0.6 * 8 * 120)}円です。</p>
<p>シーズンの始めに、取扱説明書のダニ対策で3〜4時間通電するとき。ヒーターがずっと入る定格54Wで考えても、4時間で約${yen1(cost(54, 4).day)}円です。ほかの家電とくらべるなら<a href="/denki-dai/">電気代の計算</a>が使えます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>定格の54Wで電気代を出す</h3>
<p>54Wのままひと晩8時間で計算すると約${yen1(cost(54, 8).day)}円で、表示の「強」で8時間の約8.0円より5円ほど高く出ます。</p>
<h3>かけしき毛布を、しき毛布の数字で見る</h3>
<p>「強」で毎晩8時間を120日使うと、しき毛布は約${yen0(1.0 * 8 * 120)}円、かけしき毛布は約${yen0(1.7 * 8 * 120)}円です。しき毛布の数字で見ていると、約${yen0((1.7 - 1.0) * 8 * 120)}円少なく見積もります。</p>`,
)}`,
  },
  'hot-carpet': {
    title: 'ホットカーペットの電気代｜1時間・1か月はいくら？',
    lead: 'ホットカーペットの電気代を計算します。',
    desc: () => `ホットカーペットの電気代を計算します。3畳用は1時間に「高」で約14.6円、「中」で約10.4円（パナソニックの表示・室温15℃・単価${P}円）。1日8時間なら1か月で「高」が約3,504円です。使う時間と単価を変えて計算できます。`,
    note: '高と中は、メーカーが出している1時間の電気代（室温15℃）を31円で割って出した、目安の消費電力です。最大は定格の消費電力（710W）です。',
    faqs: (u) => [
      { q: 'ホットカーペットの電気代は1時間いくらですか？', a: `<p>${u.product}は、室温15℃で「高」が約14.6円、「中」が約10.4円です（単価${P}円）。</p>` },
      { q: '1日8時間使うと1か月いくらですか？', a: `<p>「高」で約${fmt(cost(471, 8).month, 0)}円、「中」で約${fmt(cost(335, 8).month, 0)}円です（1か月30日）。</p>` },
      { q: '定格710Wなのに、1時間15円くらいなのはなぜですか？', a: '<p>温かくなるとヒーターが止まったり弱くなったりするからです。710Wは、ヒーターがずっとついたときの値です。</p>' },
      { q: 'ホットカーペットのワット数はどれくらいですか？', a: '<p>パナソニックのNKシリーズは、1畳用が230W、2畳用が490W、3畳用が710Wです。電気代は、このワット数より少ない1時間の表示で見ます。</p>' },
    ],
    how: `<p>ホットカーペットの電力は、広さと温度の設定で決まります。センサーで表面の温度を見て、温まるとヒーターを弱めるので、1時間の電力は定格よりかなり少なくなります。2面に分かれたものは、片方の面だけ温めると電気代が下がります。例：1畳用の「中」は1時間120Whなので、0.12 × 31 ＝ 約${yen1(cost(120, 1).hour)}円です。</p>`,
    more: `${section(
      'sizes',
      '畳数ごとの電気代',
      `<div class="tbl-wrap"><table>
<thead><tr><th>広さ</th><th class="num">定格</th><th class="num">高</th><th class="num">中</th></tr></thead>
<tbody>
<tr><td>1畳 約176×88cm</td><td class="num">230W</td><td class="num">約5.1円</td><td class="num">約3.7円</td></tr>
<tr><td>2畳 約176×176cm</td><td class="num">490W</td><td class="num">約10.4円</td><td class="num">約7.1円</td></tr>
<tr><td>3畳 約241×190cm</td><td class="num">710W</td><td class="num">約14.6円</td><td class="num">約10.4円</td></tr>
</tbody>
</table></div>
<p>パナソニックのDC-1NK・DC-2NK・DC-3NKの、1時間の電気代です。室温15℃・単価${P}円のときです。2畳と3畳は面積を2面に切りかえられ、片方だけ使うと電気代は全面の最大で約半分になります。1畳には切りかえがありません。メーカーは、つけはじめは「高」にして温まったら「中」にする使いかたや、下に断熱シートを敷く使いかたを挙げています。</p>
${srcLine('carpet1', 'carpet2', 'carpet3', 'carpetSeries', 'carpetUpLife')}`,
    )}

${section(
  'scenes',
  '使う場面の例',
  `<p>1畳用を、温まったら「高」から「中」にするとき。1時間の差は約${yen1(5.1 - 3.7)}円で、1日8時間・30日なら約${yen0((5.1 - 3.7) * 8 * 30)}円です。</p>
<p>2畳用と3畳用でまようとき。「中」の1時間は約7.1円と約10.4円で、1日8時間・30日なら差は約${yen0((10.4 - 7.1) * 8 * 30)}円です。</p>
<p>寝る前の2時間だけ、3畳用を2時間の切タイマーで使うとき。「中」なら約${yen1(10.4 * 2)}円です。エアコンなどの電気代も足すときは、<a href="/denki-dai/">電気代の計算</a>で出せます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>ワット数で電気代を出す</h3>
<p>3畳用の710Wで計算すると、1時間約${yen1(cost(710, 1).hour)}円です。表示の「中」の約10.4円の2倍をこえるので、1時間の表示で計算します。</p>
<h3>1人で座るのに、全面を温める</h3>
<p>3畳用の「中」を全面で使うと1時間約10.4円で、片方の面だけなら最大で約${yen1(10.4 / 2)}円まで下がります。1日8時間・30日なら、最大で約${fmt(10.4 / 2 * 8 * 30, 0)}円の差です。</p>`,
)}`,
  },
  'ceramic-heater': {
    title: 'セラミックヒーターの電気代｜1時間・1か月はいくら？',
    lead: 'セラミックヒーターの電気代を計算します。',
    desc: () => `セラミックヒーターの電気代を計算します。消費電力は強で1,170W、弱で640W（パナソニックの表示・50Hz）。単価${P}円なら1時間に強で約36.3円、弱で約19.8円です。使う時間と単価を変えて計算できます。`,
    note: '強と弱は、メーカーが出している消費電力（50Hz）です。温度の調節で止まる時間があれば、実際の電気代はこれより安くなります。',
    faqs: (u) => [
      { q: 'セラミックヒーターの電気代は1時間いくらですか？', a: `<p>${u.product}は、消費電力が強で1,170W、弱で640Wです（50Hz）。単価${P}円なら、強で約36.3円、弱で約19.8円です。</p>` },
      { q: '1日4時間使うと1か月いくらですか？', a: `<p>強で約${fmt(cost(1170, 4).month, 0)}円、弱で約${fmt(cost(640, 4).month, 0)}円です（1か月30日）。</p>` },
      { q: 'こたつとくらべるとどうですか？', a: '<p>セラミックヒーターの強（1,170W）は、こたつの強（1時間180Wh・山善の家具調こたつ）の6倍以上の電力です。</p>' },
      { q: '人感センサーで、電気代はどれくらい下がりますか？', a: '<p>パナソニックのDS-FZS1200は、強で在室45分・不在15分の1時間に、1,170Whが936Whになるとしています。約2割少なくなります。</p>' },
    ],
    how: `<p>セラミックヒーターの電力は、温風の強さで決まります。パナソニックの表示では、強の1時間の電気代36.3円が、1,170Wを1時間そのまま使った額と同じです。弱は640Wで、強の半分ほどです。例：弱で1日2時間なら、0.64 × 31 × 2 ＝ 約${yen1(cost(640, 2).day)}円です。</p>`,
    more: `${section(
      'models',
      '周波数とひとセンサーの電力',
      `<div class="tbl-wrap"><table>
<thead><tr><th>運転</th><th class="num">50Hz</th><th class="num">60Hz</th></tr></thead>
<tbody>
<tr><td>強</td><td class="num">1,170W</td><td class="num">1,120W</td></tr>
<tr><td>弱</td><td class="num">640W</td><td class="num">615W</td></tr>
<tr><td>強・ひとセンサーなし</td><td class="num">1,170Wh</td><td class="num">1,130Wh</td></tr>
<tr><td>強・ひとセンサーあり</td><td class="num">936Wh</td><td class="num">904Wh</td></tr>
</tbody>
</table></div>
<p>上の2行はDS-FS1200の消費電力です。下の2行は、ひとセンサーのあるDS-FZS1200で、強で1時間のうち在室45分・不在15分、室温20℃のときの電力量です。936Whなら、1時間は約${yen1(cost(936, 1).hour)}円です。人がいなくなると温風を止めるしくみで、メーカーは寝ころんだ人や動きのない人を検知しないことがあるとしています。</p>
${srcLine('ceramicFs', 'ceramicFzs', 'ceramicUpLife')}`,
    )}

${section(
  'scenes',
  '使う場面の例',
  `<p>おふろの前に、脱衣所を強で15分温めるとき。50Hzなら約${yen1(cost(1170, 0.25).day)}円です。</p>
<p>足もとだけを弱で、1日3時間・30日使うとき。640Wなら約${fmt(cost(640, 3).month, 0)}円です。</p>
<p>ひとセンサーのある機種を、強で1日4時間使うとき。在室45分・不在15分のくり返しなら1日約${yen0(cost(936, 4).day)}円で、センサーなしの約${yen0(cost(1170, 4).day)}円より約${yen0(cost(1170, 4).day - cost(936, 4).day)}円少なくなります。灯油のファンヒーターとくらべるなら、<a href="/touyu-dai/">灯油代の計算</a>が使えます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>小さいから、エアコンより電気代が安いと思う</h3>
<p>強の1,170Wは1時間約${yen1(cost(1170, 1).hour)}円で、6畳用エアコンの暖房の定格470W（${link('パナソニックのCS-J226D', DENKI_MORE.aircon.url)}）なら約${yen1(cost(470, 1).hour)}円なので、その2倍をこえます。パナソニックの記事も、小さくて風が少ないから節電になるという思いこみを挙げています。</p>
<h3>60Hzの地域で、50Hzの数字を使う</h3>
<p>強で1日4時間・30日なら、50Hzの1,170Wでは約${fmt(cost(1170, 4).month, 0)}円、60Hzの1,120Wでは約${fmt(cost(1120, 4).month, 0)}円です。約${yen0(cost(1170, 4).month - cost(1120, 4).month)}円多く見積もります。</p>
<h3>切り忘れ防止があるから、消し忘れても平気だと思う</h3>
<p>DS-FZS1200の切り忘れ防止は8時間です。強のまま8時間動くと、約${yen0(cost(1170, 8).day)}円かかります。</p>`,
)}`,
  },
  'oil-heater': {
    title: 'オイルヒーターの電気代｜1時間・1か月はいくら？',
    lead: 'オイルヒーターの電気代を計算します。',
    desc: () => `オイルヒーターの電気代を計算します。1500Wのものは、1時間に強で約46.5円、中（900W）で約27.9円、弱（600W）で約18.6円です（単価${P}円）。使う時間と単価を変えて計算できます。`,
    note: '強・中・弱は、メーカーが出している3段階の消費電力です。温度の調節で止まる時間があれば、実際の電気代はこれより安くなります。',
    faqs: (u) => [
      { q: 'オイルヒーターの電気代は1時間いくらですか？', a: `<p>${u.product}は、消費電力が600W・900W・1500Wの3段階です。単価${P}円なら、1時間に約18.6円・約27.9円・約46.5円です。</p>` },
      { q: 'メーカーはいくらと言っていますか？', a: `<p>${link(DENKI_MORE.delonghiFaq.name, DENKI_MORE.delonghiFaq.url)}は、1500Wのタイプで1時間に最大約47円、中で約28円、弱で約19円としています。</p>` },
      { q: '1日8時間使うと1か月いくらですか？', a: `<p>弱（600W）で約${fmt(cost(600, 8).month, 0)}円、強（1500W）で約${fmt(cost(1500, 8).month, 0)}円です（1か月30日）。</p>` },
      { q: 'オイルヒーターをつけっぱなしにすると、いくらですか？', a: `<p>1500Wのまま24時間なら、最大で約${fmt(cost(1500, 24).day, 0)}円です。サーモスタットで電源が切れている時間は、電気代がかかりません。</p>` },
    ],
    how: `<p>オイルヒーターは、輻射熱で部屋全体を暖める暖房です。消費電力は3段から選び、サーモスタットが室温に合わせて電源を入れたり切ったりします。デロンギは、サーモスタットで電源が切れているときは電気代がかからないとしています。例：600Wで電源が入っていた時間が3時間なら、0.6 × 31 × 3 ＝ ${yen1(cost(600, 3).day)}円です。</p>`,
    more: `${section(
      'types',
      '1500Wと1200Wのタイプ',
      `<div class="tbl-wrap"><table>
<thead><tr><th>タイプ</th><th class="num">最大</th><th class="num">中</th><th class="num">弱</th></tr></thead>
<tbody>
<tr><td>1500W</td><td class="num">約47円</td><td class="num">約28円</td><td class="num">約19円</td></tr>
<tr><td>1200W</td><td class="num">約37円</td><td class="num">約22円</td><td class="num">約16円</td></tr>
</tbody>
</table></div>
<p>デロンギが出している1時間の電気代で、単価${P}円のときです。RHJ10F1015-DGは600W・900W・1500Wを切りかえられて、24時間のタイマーで30分ごとに運転と停止を決められます。製品ページでは、部屋が適温になったら、温度のダイヤルを電源ランプが消えるところまでもどす使いかたです。</p>
${srcLine('oilFaq', 'oilProduct')}`,
    )}

${section(
  'scenes',
  '使う場面の例',
  `<p>1200Wのタイプを中で、1日8時間・30日使うとき。1時間約22円なので、約${fmt(22 * 8 * 30, 0)}円です。</p>
<p>強で8時間つけて、サーモスタットで電源が入っていた時間が合わせて5時間だったとき。使う時間に5を入れると約${yen0(cost(1500, 5).day)}円で、8時間ずっと入っていたときの約${yen0(cost(1500, 8).day)}円より少なくなります。</p>
<p>タイマーで、朝6時から7時30分まで900Wで動かすとき。1時間30分で約${yen0(cost(900, 1.5).day)}円です。部屋をすぐに暖めたいときの電気代は、<a href="/ceramic-heater/">セラミックヒーターの電気代</a>とくらべられます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>温度のダイヤルを最大のままにする</h3>
<p>電力を1500Wにしたまま温度のダイヤルも最大だと、電源が切れずに動きつづけることがあります。そのまま8時間なら約${yen0(cost(1500, 8).day)}円です。</p>
<h3>1200Wのタイプに、1500Wの数字を使う</h3>
<p>最大の1時間は、1500Wのタイプが約47円、1200Wのタイプが約37円です。1500Wの数字で見ると、1時間で約10円、8時間で約${10 * 8}円多く見積もります。</p>`,
)}`,
  },
};

function render(u) {
  const tool = toolBySlug(u.slug);
  const parent = toolBySlug('denki-dai');
  const t = TEXT[u.slug];
  const path = `/${u.slug}/`;
  const rows = u.modes
    .map((m) => {
      const r = cost(m.watt, u.hours);
      return `<tr><td>${m.b}</td><td class="num">${fmt(m.watt)}W</td><td class="num">${yen1(r.hour)}円</td><td class="num">${fmt(r.month, 0)}円</td></tr>`;
    })
    .join('\n');
  const faqs = t.faqs(u);
  const body = `
<h1>${tool.name}</h1>
<p class="lead">${t.lead}</p>

${denkiCard({ tool, tiles: u.modes.map((m) => ({ b: m.b, small: hourYen(m.watt), watt: m.watt })), label: '強さをえらぶ', name: u.name, empty: '強さをえらんでください', wattEx: String(u.modes[0].watt), hoursEx: String(u.hours) })}

${section(
  'table',
  '強さごとの電気代',
  `${denkiBars(u.name, u.modes, u.hours)}<div class="tbl-wrap"><table>
<thead><tr><th>強さ</th><th class="num">消費電力</th><th class="num">1時間</th><th class="num">1か月</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
<p class="note">1か月は1日${u.hours}時間・30日、単価${P}円です。</p>
<p>${t.note}</p>
<p>出典：${link(u.product, u.url)}</p>`,
)}

${section('formula', '計算式', `${denkiZukai(`${u.name}の${u.modes[0].b}`, u.modes[0].watt, u.hours).stair}${t.how || ''}`)}
${t.more ? `\n${t.more}\n` : ''}
${section('faq', 'よくある質問', faqHtml(faqs))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: t.title,
    description: t.desc(u.modes),
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: `/${parent.slug}/` },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, `${u.name}の強さと使う時間と単価から、1時間・1日・1か月・1年の電気代を出す計算ツール。`), faqLd(faqs)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['denki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function renderAll() {
  return DENKI_USES.filter((u) => toolBySlug(u.slug)?.published).map(render);
}
