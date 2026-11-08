// 読みもの：冬の暖房代を1か月でくらべる（灯油ファンヒーター・エアコン・電気のヒーター）
// 数字は src/data/touyu.mjs・src/data/denki.mjs と src/lib の計算から作る。確かめは tests/yomimono-danbou-hikaku.test.mjs
import { section } from '../layout.mjs';
import { band } from '../zukai.mjs';
import { TOUYU_PRICE, TOUYU_HEATERS } from '../data/touyu.mjs';
import { DENKI_PRICE, DENKI_USES, DENKI_MORE, DENKI_CHECKED } from '../data/denki.mjs';
import { touyu } from '../lib/touyu.mjs';
import { denki } from '../lib/denki.mjs';
import { fmt } from '../lib/number.mjs';

const H = 8; // 1日に使う時間
const FAN = TOUYU_HEATERS[0]; // ダイニチ FW-32S6（木造9畳）
const CERA = DENKI_USES.find((u) => u.slug === 'ceramic-heater');
const OIL = DENKI_USES.find((u) => u.slug === 'oil-heater');
const watt = (u, b) => u.modes.find((m) => m.b === b).watt;
// 6畳用エアコンの暖房の定格消費電力（パナソニック CS-J226D）。家電別のページ（src/pages/denki-uses.mjs）と同じ数字で、出典は DENKI_MORE.aircon
export const AIRCON_WATT = 470;

const P = DENKI_PRICE.value;
const tm = (lph, hours = H, price = TOUYU_PRICE.can) => touyu({ lph, hours, price });
const dm = (w, hours = H) => denki({ watt: w, hours, price: P });

const fanMax = tm(FAN.max);
const fanMin = tm(FAN.min);
const fanUp = tm(FAN.max, H, fanMax.liter + 10); // 1Lが10円上がったとき
const mix = { fan: tm(FAN.max, 2).month, air: dm(AIRCON_WATT, 6).month };

export const NUMS = {
  liter: fanMax.liter,
  fanMax: fanMax.month,
  fanMin: fanMin.month,
  fanHourMax: fanMax.hour,
  fanHourMin: fanMin.hour,
  cansMax: fanMax.cans,
  cansMin: fanMin.cans,
  litersMonth: fanMax.litersMonth,
  fanDay: fanMax.day,
  air: dm(AIRCON_WATT).month,
  airHour: dm(AIRCON_WATT).hour,
  ceraStrong: dm(watt(CERA, '強')).month,
  ceraWeak: dm(watt(CERA, '弱')).month,
  ceraHourStrong: dm(watt(CERA, '強')).hour,
  ceraHourWeak: dm(watt(CERA, '弱')).hour,
  oilStrong: dm(watt(OIL, '強')).month,
  oilMid: dm(watt(OIL, '中')).month,
  oilWeak: dm(watt(OIL, '弱')).month,
  oilHourStrong: dm(watt(OIL, '強')).hour,
  oilHourWeak: dm(watt(OIL, '弱')).hour,
  up10: fanUp.month - fanMax.month,
  mixFan: mix.fan,
  mixAir: mix.air,
  mixTotal: mix.fan + mix.air,
};
const N = NUMS;
const y = (x) => fmt(x, 0);
const y1 = (x) => fmt(x, 1);

// 強（最大）のままの1か月の帯。いちばん高いものを100％にする
const TOP = Math.max(N.fanMax, N.oilStrong, N.ceraStrong, N.air);
const bar = (name, v) =>
  band({
    head: name,
    parts: [{ w: Number(((v / TOP) * 100).toFixed(1)), text: `約${y(v)}円` }, { w: Number((100 - (v / TOP) * 100).toFixed(1)), kind: 'alt', text: '' }],
    label: `${name}の1か月約${y(v)}円の帯`,
  });

const row = (name, cond, hour, month) => `<tr><td>${name}</td><td>${cond}</td><td class="num">約${y1(hour)}円</td><td class="num">約${y(month)}円</td></tr>`;

export default {
  slug: 'danbou-hikaku',
  title: '冬の暖房代を1か月でくらべる：灯油ファンヒーター・エアコン・電気のヒーター',
  lead: '1日8時間・30日で4つの暖房を並べます。',
  category: 'seikatsu',
  tools: ['touyu-dai', 'denki-dai', 'ceramic-heater', 'oil-heater'],
  published: '2026-11-08',
  updated: '2026-11-08',
  description: `1日8時間・30日で、灯油ファンヒーターは強で約${y(N.fanMax)}円、6畳用エアコンは定格で約${y(N.air)}円。セラミックヒーターとオイルヒーターも入れて、強と弱の1か月の暖房代を1つの表にしました。`,
  body: `
${section(
  'kotae',
  '1日8時間・30日の1か月',
  `<p>1日8時間を30日、いちばん強いまま使うと、9畳用の灯油ファンヒーターは約${y(N.fanMax)}円、6畳用エアコンの暖房は定格で約${y(N.air)}円です。セラミックヒーターは約${y(N.ceraStrong)}円、オイルヒーターは約${y(N.oilStrong)}円になりました。</p>
${bar('灯油ファンヒーター 強', N.fanMax)}
${bar('オイルヒーター 強', N.oilStrong)}
${bar('セラミックヒーター 強', N.ceraStrong)}
${bar('エアコン 定格', N.air)}
<p>灯油は資源エネルギー庁の価格調査の18L ${fmt(TOUYU_PRICE.can)}円（2026年${TOUYU_PRICE.date}）で、1Lにすると約${y1(N.liter)}円です。電気は1kWh ${P}円で計算しました。どれもメーカーの仕様の数字で、強のままの値は上のほうの目安です。部屋が暖まると、どの暖房も弱くなったり止まったりします。</p>`,
)}
${section(
  'hyou',
  '強と弱を並べた表',
  `<div class="tbl-wrap"><table>
<thead><tr><th>暖房</th><th>運転</th><th class="num">1時間</th><th class="num">1か月</th></tr></thead>
<tbody>
${row('ファンヒーター', '強', N.fanHourMax, N.fanMax)}
${row('ファンヒーター', '最小', N.fanHourMin, N.fanMin)}
${row('エアコン', '定格', N.airHour, N.air)}
${row('セラミック', '強', N.ceraHourStrong, N.ceraStrong)}
${row('セラミック', '弱', N.ceraHourWeak, N.ceraWeak)}
${row('オイル', '強', N.oilHourStrong, N.oilStrong)}
${row('オイル', '弱', N.oilHourWeak, N.oilWeak)}
</tbody>
</table></div>
<p>灯油ファンヒーターはダイニチの${FAN.model}で、${FAN.cond}がめやすの機種です。1時間に使う灯油は強で${FAN.max}L、最小で${FAN.min}Lです。エアコンはパナソニックのCS-J226Dで、暖房の定格の消費電力は${AIRCON_WATT}Wです。セラミックヒーターはパナソニックのDS-FS1200で強${fmt(watt(CERA, '強'))}W・弱${watt(CERA, '弱')}W、オイルヒーターはデロンギのRHJ10F1015-DGで強${fmt(watt(OIL, '強'))}W・弱${watt(OIL, '弱')}Wです。オイルヒーターには中の${watt(OIL, '中')}Wもあり、1か月なら約${y(N.oilMid)}円になります。</p>
<p>灯油ファンヒーターは強と最小の差がとても大きく、1か月で約${y(N.fanMax - N.fanMin)}円ちがいます。18Lのポリタンクなら、強のままで月に約${y1(N.cansMax)}缶、最小なら約${y1(N.cansMin)}缶です。</p>`,
)}
${section(
  'shiki',
  '同じ式で出している',
  `<p>灯油は、1時間に使う灯油の量に、1日の時間と30日と1Lの値段をかけます。電気は、消費電力をkWに直して、1日の時間と30日と1kWhの単価をかけます。もとになる数字が、灯油はLで、電気はWで書かれているだけで、時間と日数をかけるところは同じです。</p>
<p>そのため、くらべるときは時間と日数をそろえるのが先です。ある暖房を1日4時間、別の暖房を1日8時間で出した数字を並べると、使い方の差まで暖房の差に見えてしまいます。ここでは全部を1日8時間・30日にそろえました。</p>
<p>ただし、この表は同じ部屋を同じ温かさにしたときの数字ではありません。9畳用のファンヒーターと6畳用のエアコンでは、もともと暖める広さのめやすがちがいます。4つの暖房の暖める力が同じとはかぎらないので、表は1時間あたりの燃料や電気の代金のくらべとして読んでください。手元の機種で出すときは、灯油は<a href="/touyu-dai/">灯油代の計算</a>、エアコンやヒーターは<a href="/denki-dai/">電気代の計算</a>に、同じ時間を入れます。</p>`,
)}
${section(
  'rei',
  '場面ごとの計算の例',
  `<h3>灯油が1L 10円上がったら</h3>
<p>ファンヒーターを強で1日8時間なら、1か月に約${y1(N.litersMonth)}Lを使います。1Lが10円上がると、1か月の灯油代は約${y(N.up10)}円ふえます。灯油の値段は毎週の調査で動くので、自分が買った値段で計算し直すと、手元の数字に近づきます。</p>
<h3>朝はファンヒーター、夜はエアコンにする</h3>
<p>朝の2時間だけファンヒーターを強で使い、夜の6時間はエアコンにするとき。ファンヒーターが1か月約${y(N.mixFan)}円、エアコンが定格で約${y(N.mixAir)}円で、合わせて約${y(N.mixTotal)}円です。8時間ともファンヒーターの強で使う約${y(N.fanMax)}円より、約${y(N.fanMax - N.mixTotal)}円低くなります。</p>
<h3>オイルヒーターを弱で使う</h3>
<p>寝室でオイルヒーターを弱の${watt(OIL, '弱')}Wのまま1日8時間なら、1か月約${y(N.oilWeak)}円です。強の約${y(N.oilStrong)}円とは、約${y(N.oilStrong - N.oilWeak)}円の差があります。サーモスタットで温度が上がると電気が止まる時間もあるので、実際にはこれより下がることがあります。強さごとの金額は<a href="/oil-heater/">オイルヒーターの電気代</a>と<a href="/ceramic-heater/">セラミックヒーターの電気代</a>のページにもあります。</p>`,
)}
${section(
  'machigai',
  'まちがえやすいところ',
  `<h3>エアコンの定格は、いつも同じ電力ではない</h3>
<p>エアコンが使う電力は、部屋の温度や外の気温しだいで上下します。定格の${AIRCON_WATT}Wで出した約${y(N.air)}円は、その途中のひとつの目安です。1年の目安を知りたいときは、カタログの期間消費電力量に単価をかけます。</p>
<h3>1か月は30日で数えている</h3>
<p>12月や1月は31日あるので、ファンヒーターの強なら1日分の約${y(N.fanDay)}円がさらに足されます。ひと冬で数えるときは、月ごとの日数で足し直すと差が出ません。</p>
<h3>電気の単価は家ごとにちがう</h3>
<p>1kWh ${P}円は、家電のカタログの電気代に使われる目安の単価です。電力会社やプラン、使った量で単価は変わるので、検針票の数字に入れかえると自分の家の金額になります。</p>`,
)}
`,
  faqs: [
    { q: '灯油ファンヒーターとエアコン、1か月でどちらが安いですか？', a: `<p>1日8時間・30日で強のままくらべると、9畳用のファンヒーターは約${y(N.fanMax)}円、6畳用エアコンは定格で約${y(N.air)}円です。部屋の広さや外の気温、灯油と電気の単価で変わるので、自分の数字で出し直してください。</p>` },
    { q: 'セラミックヒーターとオイルヒーターでは、どちらが電気代が高いですか？', a: `<p>強どうしなら、${fmt(watt(OIL, '強'))}Wのオイルヒーターが約${y(N.oilStrong)}円、${fmt(watt(CERA, '強'))}Wのセラミックヒーターが約${y(N.ceraStrong)}円です。消費電力が大きいほうが、同じ時間では高くなります。</p>` },
  ],
  sources: [
    { name: 'ダイニチ 石油ファンヒーター Sタイプ', url: FAN.url, checked: '2026-10-21', what: `${FAN.model}の燃料消費量` },
    { name: TOUYU_PRICE.src, url: TOUYU_PRICE.url, checked: '2026-10-21', what: `灯油18Lの店頭価格（${TOUYU_PRICE.date}）` },
    { name: '資源エネルギー庁 家庭でできる省エネ', url: DENKI_PRICE.url, checked: '2026-10-21', what: `電気の目安単価${P}円/kWh` },
    { name: 'パナソニック CS-J226D', url: DENKI_MORE.aircon.url, checked: DENKI_CHECKED, what: 'エアコンの暖房の定格消費電力' },
    { name: 'パナソニック DS-FS1200', url: CERA.url, checked: DENKI_CHECKED, what: 'セラミックヒーターの消費電力' },
    { name: 'デロンギ RHJ10F1015-DG', url: OIL.url, checked: DENKI_CHECKED, what: 'オイルヒーターの消費電力' },
  ],
};
