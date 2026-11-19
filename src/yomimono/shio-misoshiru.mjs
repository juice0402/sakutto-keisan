// 読みもの：1日の塩の目標は、みそ汁何杯分？
// 目標量は厚生労働省「日本人の食事摂取基準（2025年版）の策定ポイント」（2026-11-19 に開いて確かめた）、料理1杯の塩は木津川市の目安（同じ日に確かめた）、
// ナトリウムからの換算は消費者庁のページの資料（同じ日に確かめた）。1杯の量と濃さの例は src/lib/enbun.mjs の計算。確かめは tests/yomimono-shio-misoshiru.test.mjs
import { section } from '../layout.mjs';
import { stair, band, zBox } from '../zukai.mjs';
import { enbun } from '../lib/enbun.mjs';
import { fmt, fix } from '../lib/number.mjs';

// 食塩相当量の目標量（g/日・18歳以上。どの年齢の区分も同じ）と、高血圧・慢性腎臓病の重症化予防の量（男女とも）
export const GOAL = { male: 7.5, female: 6.5, juusho: 6.0 };
// 木津川市の目安（1杯・1つあたりの塩 g）。調理のしかたや具でかわる目安
export const DISH = [
  ['みそ汁（1杯）', 1.7],
  ['わかめスープ（1杯）', 0.9],
  ['食パン 6枚切り（1枚）', 0.7],
  ['塩鮭（1切れ）', 1.8],
  ['梅干し（1つ）', 2.2],
  ['きつねうどん（汁まで1杯）', 6.6],
  ['ラーメン（汁まで1杯）', 7.1],
];
const MISO = DISH[0][1];
const dish = (name) => DISH.find(([n]) => n.startsWith(name))[1];
export const NA_TO_SALT = 2.54; // 食塩相当量（g）＝ナトリウム（mg）× 2.54 ÷ 1,000

const salt = (base, pct) => enbun({ base, pct, salt: null, out: 'salt' }).salt;
const pctOf = (base, s) => enbun({ base, pct: null, salt: s, out: 'pct' }).pct;
const cups = (g) => fix(Math.round((g / MISO) * 10) / 10);
const DAY = ['食パン', 'みそ汁', '塩鮭', '梅干し']; // 帯の図の1日の例

export const per = (s, goal) => Math.round((s / goal) * 100);
export const NUMS = {
  male: cups(GOAL.male), // 約4.4杯
  female: cups(GOAL.female), // 約3.8杯
  juusho: cups(GOAL.juusho), // 約3.5杯
  s150_08: salt(150, 0.8), // 150gの汁で0.8％
  s200_08: salt(200, 0.8),
  s150_12: salt(150, 1.2),
  thin: pctOf(200, salt(150, 0.8)), // 0.8％の150gに湯を50g足したときの濃度
  wakame: fix(Math.round((GOAL.female / dish('わかめスープ')) * 10) / 10), // 約7.2杯
  day: fix(DAY.reduce((a, n) => a + dish(n), 0)),
  na1000: fix((1000 * NA_TO_SALT) / 1000),
  na400: fix((400 * NA_TO_SALT) / 1000),
};
const N = NUMS;
const pc = (s, goal) => `${per(s, goal)}％`;
const g = (x) => `${fmt(x, 2)}g`;
const row = ([name, s]) => `<tr><td>${name}</td><td class="num">約${g(s)}</td><td class="num">${pc(s, GOAL.female)}</td><td class="num">${pc(s, GOAL.male)}</td></tr>`;
export const dayParts = DAY.map((n) => ({ w: Number(((dish(n) / GOAL.female) * 100).toFixed(1)), text: dish(n) / GOAL.female < 0.15 ? '' : `${n} ${g(dish(n))}` }));
export const dayRest = Number((100 - dayParts.reduce((a, p) => a + p.w, 0)).toFixed(1));

const MHLW = 'https://www.mhlw.go.jp/content/10904750/001734207.pdf';
const KIZU = 'https://www.city.kizugawa.lg.jp/cmsfiles/contents/0000001/1103/20250326-085940.pdf';
const CAA = 'https://www.caa.go.jp/policies/policy/food_labeling/health_promotion/pdf/food_labeling_cms206_20191126_09.pdf';

export default {
  slug: 'shio-misoshiru',
  title: '1日の塩の目標は、みそ汁何杯分？',
  lead: '目標量を、みそ汁の杯数にしました。',
  category: 'seikatsu',
  tools: ['enbun-noudo'],
  published: '2026-11-19',
  updated: '2026-11-19',
  description: `食塩の1日の目標量は、18歳以上の男性${GOAL.male}g未満・女性${GOAL.female}g未満。みそ汁1杯約${MISO}gで数えると男性約${N.male}杯、女性約${N.female}杯分です。うどんやパンの塩との表と、汁の量と濃さで変わる塩の量の計算ものせました。`,
  body: `
${section(
  'kotae',
  '目標量をみそ汁の杯数にすると',
  `<p>厚生労働省の食事摂取基準（2025年版）では、18歳以上の食塩相当量の目標量は男性${GOAL.male}g未満、女性${GOAL.female}g未満です。木津川市の目安のみそ汁1杯約${MISO}gで割ると、男性は約${N.male}杯、女性は約${N.female}杯分になります。</p>
${stair(zBox('女性の目標量', `${GOAL.female}g`), { b: `÷${MISO}g`, small: 'みそ汁1杯' }, zBox('みそ汁', `約${N.female}杯`, true), [`${GOAL.female} ÷ ${MISO} で約${N.female}杯`, `男性は ${GOAL.male} ÷ ${MISO} で約${N.male}杯`])}
<p>この杯数は、1日の塩をみそ汁だけでとったときの数です。実際にはパンやおかずにも塩が入っているので、みそ汁に回せる分はこれより少なくなります。</p>
<p>同じ資料には、高血圧や慢性腎臓病の重症化を防ぐための量として、男女とも${fmt(GOAL.juusho, 1)}g未満とあります。1杯約${MISO}gのみそ汁なら約${N.juusho}杯で届く量です。病気で食事の指示を受けている人は、医師や管理栄養士に言われた量のほうを使ってください。</p>`,
)}
${section(
  'hoka',
  'ほかの料理の塩とくらべる',
  `<p>木津川市の目安には、みそ汁のほかに、よく食べる料理の塩の量がのっています。女性と男性の1日の目標量の何％にあたるかを並べると、次のようになります。</p>
<div class="tbl-wrap"><table>
<thead><tr><th>料理</th><th class="num">塩</th><th class="num">女性</th><th class="num">男性</th></tr></thead>
<tbody>
${DISH.map(row).join('\n')}
</tbody>
</table></div>
<p>汁まで飲んだきつねうどん1杯は約${g(dish('きつねうどん'))}で、女性の目標量${GOAL.female}gを1杯でこえます。ラーメンは約${g(dish('ラーメン'))}で、男性の目標量の${pc(dish('ラーメン'), GOAL.male)}にあたります。どちらも汁をふくんだ数字なので、汁を残せば塩はそのぶん減ります。</p>
${band({ head: `女性の目標量 ${GOAL.female}g`, parts: [...dayParts, { w: dayRest, kind: 'alt', text: '' }], ans: `食パン${g(dish('食パン'))}もふくめて4品で<b>約${g(N.day)}</b>`, label: `女性の目標量${GOAL.female}gのうち、4品で約${g(N.day)}になる帯` })}
<p>朝に食パン1枚、夜にみそ汁と塩鮭、梅干しを1つ食べると、それだけで約${g(N.day)}になり、女性の目標量の${pc(N.day, GOAL.female)}にあたります。ここには昼ごはんも、しょうゆやソースも入っていません。木津川市の目安は、作り方や具で変わる目安だと書いてあります。</p>`,
)}
${section(
  'noudo',
  '1杯の塩は、汁の量と濃さで決まる',
  `<p>みそ汁1杯の塩は、汁の重さに塩分濃度をかけた量です。お店や家で量も濃さもちがうので、約${MISO}gはひとつの目安と考えて、自分の家の1杯で計算しなおすと杯数が変わります。</p>
${stair(zBox('汁の重さ', '150g'), { b: '×0.8％', small: '塩分濃度の例' }, zBox('塩', `${g(N.s150_08)}`, true), ['塩 ＝ 汁の重さ × 濃度', `150 × 0.008 ＝ ${fmt(N.s150_08, 2)}`])}
<p>例の数字で計算すると、0.8％の汁を150g飲めば塩は${g(N.s150_08)}です。同じ濃さでも大きめのおわんに200g入れたときは${g(N.s200_08)}です。味を濃くして1.2％にすると、150gでも${g(N.s150_12)}まで上がります。塩は、汁の量にも濃さにも比例してふえます。</p>
<p>この例の濃さは計算のための数字で、みそ汁の決まった濃さではありません。家のみそ汁の濃さを知りたいときは、入れたみその塩の量と、できた汁の重さから<a href="/enbun-noudo/">塩分濃度の計算</a>で出せます。みその量の塩は、袋の栄養成分表示の食塩相当量から出せます。</p>`,
)}
${section(
  'mistakes',
  'まちがえやすいところ',
  `<p>お湯を足して味を薄くしても、塩の量は変わりません。0.8％の汁150gに湯を50g足すと濃さは${fmt(N.thin, 2)}％に下がりますが、全部飲めば塩は同じ${g(N.s150_08)}です。減るのは、みその量を減らしたときと、汁を残したときです。</p>
<p>食品の表示がナトリウムの量で書いてあるときは、そのまま塩の量として読まないでください。消費者庁のページの資料では、食塩相当量はナトリウムのmgに${NA_TO_SALT}をかけて1,000で割ります。ナトリウム1,000mgなら食塩相当量は約${g(N.na1000)}、400mgなら約${g(N.na400)}で、どちらも数字の2.5倍ほどになります。</p>
<p>目標量の数字には未満がついています。男性の${GOAL.male}gちょうどは、目標の内側ではなく外側の数です。このページの数字は18歳以上のもので、18歳未満の数字は資料の表で確かめてください。</p>`,
)}
`,
  faqs: [
    { q: 'わかめスープなら何杯分ですか？', a: `<p>木津川市の目安ではわかめスープ1杯が約${g(dish('わかめスープ'))}なので、女性の目標量${GOAL.female}gは約${N.wakame}杯分です。みそ汁の約${N.female}杯より多くなります。</p>` },
    { q: '高血圧の人の塩の目標は、みそ汁何杯分ですか？', a: `<p>食事摂取基準（2025年版）の重症化予防の量${fmt(GOAL.juusho, 1)}g未満を1杯約${MISO}gで割ると、約${N.juusho}杯分です。食事の指示を受けているときは医師の指示にしたがってください。</p>` },
  ],
  sources: [
    { name: '厚生労働省 日本人の食事摂取基準（2025年版）の策定ポイント', url: MHLW, checked: '2026-11-19', what: `食塩相当量の目標量（18歳以上 男性${GOAL.male}g未満・女性${GOAL.female}g未満）と重症化予防の量${fmt(GOAL.juusho, 1)}g未満` },
    { name: '木津川市 ご存じですか？食べ物に含まれる塩分量', url: KIZU, checked: '2026-11-19', what: 'みそ汁1杯など料理ごとの塩の目安' },
    { name: '消費者庁 栄養成分表示を活用しよう④ 減塩社会への道', url: CAA, checked: '2026-11-19', what: `ナトリウムから食塩相当量への換算（× ${NA_TO_SALT} ÷ 1,000）` },
  ],
};
