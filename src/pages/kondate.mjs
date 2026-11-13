// 晩ごはんシミュレーター（#166。docs/kondate.md の「見た目（案B・ウィークリー手帳）」）：曜日ごとの決まりで1週間の晩ごはんを組む手帳
// 手帳（h1・リード・週の見出し・7日＋買うもの・ボタンの段）は page({ top }) で、パソコン（1080px〜）は左右の段にまたがって上に置く
// 左の段（#calc）＝冷蔵庫・苦手・これまでの献立、右の段＝本文。データはこの端末の localStorage（sakutto-kondate）だけ
// 本文の例と使う場面の数字は tests/kondate.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { KONDATE_ING, KONDATE_DISHES } from '../data/kondate.mjs';
import { KONDATE_RULES, KONDATE_KINDS, KONDATE_DOW, KONDATE_BY_ID, KONDATE_EXAMPLE, kondateExampleWeek, kondateShopping, kondateCandidates } from '../lib/kondate.mjs';
import { stair, band, zBox } from '../zukai.mjs';

const tool = toolBySlug('kondate');
const path = '/kondate/';

const ALL = KONDATE_DISHES.length;
const KIND_N = Object.fromEntries(KONDATE_KINDS.map((k) => [k, KONDATE_DISHES.filter((x) => x.kind === k).length]));
const ING_N = KONDATE_ING.reduce((n, g) => n + g.items.length, 0);

// 例：月 肉・火 魚・水 麺・木 おまかせ・金 丼・土 作らない・日 カレー。冷蔵庫に豚こま・キャベツ・玉ねぎ・卵
export const EX = kondateExampleWeek();
export const EX_DISHES = EX.dishes.map((id) => (id ? KONDATE_BY_ID.get(id) : null));
export const EX_BUY = kondateShopping(EX.dishes, KONDATE_EXAMPLE.fridge, 0);
export const EX_BUY_NOFRIDGE = kondateShopping(EX.dishes, [], 0);
// 使う場面の例
export const SC_FRIDGE = kondateCandidates('肉').filter((x) => x.ings.some((i) => KONDATE_EXAMPLE.fridge.includes(i))).length;
export const SC_NG = kondateCandidates('魚', ['さば', '鮭']).length;
export const SC_WED = kondateShopping(EX.dishes, KONDATE_EXAMPLE.fridge, 2);

const RULE_CLS = { 肉: 'r-niku', 魚: 'r-sakana', おまかせ: 'r-omakase', 作らない: 'r-off' };
const ruleHtml = (i, rule) =>
  `<label class="${['km-rt', RULE_CLS[rule]].filter(Boolean).join(' ')}"><span>${rule}</span><select aria-label="${KONDATE_DOW[i]}曜の決まり">${KONDATE_RULES.map((r) => `<option${r === rule ? ' selected' : ''}>${r}</option>`).join('')}</select></label>`;
// はじめの手帳（スクリプトが日付と料理を入れる）
const cellHtml = (i) =>
  `<div class="${['kb-cell', i === 5 ? 'is-sat' : '', i === 6 ? 'is-sun' : ''].filter(Boolean).join(' ')}"><div class="kb-top"><button type="button" class="kb-dow" aria-pressed="false" disabled><b class="d">${KONDATE_DOW[i]}</b><small></small></button>${ruleHtml(i, 'おまかせ')}</div><button type="button" class="kb-dish" disabled></button></div>`;
const BUY_EMPTY = '「1週間をつくる」を押すと出ます';
const ingGroups = (id) =>
  `<div class="km-groups" id="${id}">${KONDATE_ING.map(
    (g) => `<div class="km-group"><span class="km-gl">${g.group}</span>${g.items.map((x) => `<button type="button" class="km-ing" aria-pressed="false">${x}</button>`).join('')}</div>`,
  ).join('')}</div>`;

const TOP = `<div class="kb-full">
<h1>${tool.name}</h1>
<p class="lead">1週間の晩ごはんを曜日の決まりで組みます。</p>
<p class="kb-wk" id="kb-wk">今週</p>
<div class="kb-week" id="kb-week" aria-live="polite">${KONDATE_DOW.map((_, i) => cellHtml(i)).join('')}<div class="kb-cell kb-buy"><h2 class="km-h">買うもの<small id="kb-buy-n"></small></h2><p id="kb-buy">${BUY_EMPTY}</p><div id="cm-bar" data-tool="${tool.slug}" data-name="${tool.name}" hidden><button type="button" class="km-memo" id="cm-add" disabled>メモする</button></div></div></div>
<div class="kb-foot"><button type="button" class="wide-btn is-main" id="kb-make">1週間をつくる</button><p class="km-hint">料理を押すと入れかえ、曜日を押すととめます</p><button type="button" class="km-memo" id="kb-turn">来週の手帳へ</button></div>
<noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>
`;

// 計算のしくみの絵：火曜の決まり「魚」→ 冷蔵庫の食材を使う料理が先 → 1品
const ZUKAI = stair(
  zBox('火曜の決まり', '魚'),
  { b: `魚の料理${KIND_N['魚']}品から1つ`, small: '冷蔵庫の食材を使う料理が先' },
  zBox('火曜の晩ごはん', EX_DISHES[1].name, true),
  ['候補 ＝ 決まりに合う料理 − 苦手な食材の料理 − ほかの日の料理', '冷蔵庫に丸のある食材を使う候補があれば、その中から1品'],
  `買うもの ＝ 料理の食材 − 冷蔵庫に丸のある食材 ＝ <b class="fz-red">${EX_BUY.length}つ</b>`,
);
const W = Number((100 / 7).toFixed(2));
const BAND = band({
  head: '月曜から日曜の決まり',
  parts: KONDATE_EXAMPLE.routine.map((r, i) => ({ w: W, kind: r === '作らない' ? 'off' : i % 2 ? 'alt' : 'pay', text: r === '作らない' ? '' : KONDATE_DOW[i] })),
  ruler: [[0, '月'], [W * 5 + W / 2, '土は作らない', true], [100, '日']],
  ans: `6日の料理 → <b>買うもの${EX_BUY.length}つ</b>`,
  label: `月曜から日曜までの7日のうち、土曜は作らない日で、6日に料理が入り、買うものは${EX_BUY.length}つの図`,
});
const exRow = (r, i) => {
  const x = EX_DISHES[i];
  return `<tr><td>${KONDATE_DOW[i]}</td><td>${r}</td><td class="wrap">${x ? x.name : '作らない'}</td><td class="wrap">${x ? x.ings.join('・') : '—'}</td></tr>`;
};

const FAQS = [
  {
    q: '献立は保存されますか？',
    a: '<p>この端末のブラウザの中だけに残し、どこにも送りません。iPhone の Safari では7日ほど開かないと消えることがあり、ホーム画面に置いたものは消えにくくなります。</p>',
  },
  {
    q: '何人分の献立ですか？',
    a: '<p>人数と量は出しません。料理の名前と主な食材だけなので、家の人数に合わせて買ってください。</p>',
  },
  {
    q: '作り方は出ますか？',
    a: '<p>出ません。料理名で調べたり、いつものレシピを使ったりしてください。</p>',
  },
  {
    q: '同じ料理が続きませんか？',
    a: '<p>同じ週の中では、同じ料理は1回までです。週がかわると、また出ることがあります。</p>',
  },
  {
    q: '苦手な食材はどこで決めますか？',
    a: '<p>手帳の下の「苦手なもの」を開いて、食材の名前を押します。赤い線で消した食材を使う料理は出なくなります。</p>',
  },
  {
    q: '曜日の決まりは来週も残りますか？',
    a: '<p>残ります。決まりは曜日ごとに覚えるので、毎週の「金曜は麺」のような決まりは1回えらべば済みます。</p>',
  },
];

const KIND_TABLE = `<div class="tbl-wrap"><table>
<thead><tr><th>決まり</th><th class="num">料理の数</th><th>料理の例</th></tr></thead>
<tbody>
<tr><td>おまかせ</td><td class="num">${ALL}品</td><td class="wrap">下のどれでも。卵・豆腐・野菜が主役の${KIND_N['ほか']}品も入る</td></tr>
${KONDATE_KINDS.filter((k) => k !== 'ほか').map((k) => `<tr><td>${k}</td><td class="num">${KIND_N[k]}品</td><td class="wrap">${KONDATE_DISHES.filter((x) => x.kind === k).slice(0, 3).map((x) => x.name).join('・')}</td></tr>`).join('\n')}
<tr><td>作らない</td><td class="num">—</td><td class="wrap">外食や残りものの日。買うものに入らない</td></tr>
</tbody>
</table></div>`;

const SIDE = `<div class="km-side" id="calc">
<section class="km-sec" aria-labelledby="km-fr-h"><h2 class="km-h" id="km-fr-h">冷蔵庫にあるもの<button type="button" class="clear-btn" id="km-fr-clear">クリア</button></h2>${ingGroups('km-fridge')}</section>
<details class="km-sec km-ng"><summary>苦手なもの<small id="km-ng-now">なし</small></summary>${ingGroups('km-ngl')}</details>
<section class="km-sec km-past" id="km-past" aria-labelledby="km-past-h" hidden><h2 class="km-h" id="km-past-h">これまでの献立<small id="km-past-n"></small></h2><div id="km-past-list"></div></section>
<section class="cm cm2" id="cm-list" aria-labelledby="cm-h" hidden><h2 class="cm-h" id="cm-h">ちょいメモ</h2><ul></ul></section>
<p class="km-sub km-home">ホーム画面に置くと記録が消えにくくなります</p>
</div>
`;

export default function render() {
  const body = `${SIDE}
${section(
  'formula',
  '献立の組み方',
  `${ZUKAI}
<p>曜日ごとに決まりを1つえらぶと、その日はその種類の料理から1品を選びます。料理は全部で${ALL}品あり、肉${KIND_N['肉']}品・魚${KIND_N['魚']}品・麺${KIND_N['麺']}品・丼${KIND_N['丼']}品・カレー${KIND_N['カレー']}品・鍋${KIND_N['鍋']}品と、卵や豆腐が主役の${KIND_N['ほか']}品です。おまかせの日は、この全部から選びます。</p>
<p>同じ料理は1週間に1回までにしています。とめた日や、今週のもう過ぎた日に入っている料理も数えるので、月曜の料理が木曜にまた出ることはありません。</p>
<p>冷蔵庫にあるものに丸をつけると、その食材を1つでも使う料理を先に選びます。使い切りたい食材から献立が決まり、買うものも減ります。苦手なものに入れた食材は、1つでも使う料理を候補から外します。</p>
<p>出すのは料理の名前と主な食材だけで、作り方と分量は出しません。食材は${ING_N}種類で、米・調味料・油・小麦粉・ルウ・にんにく・しょうがは家にある前提で入れていません。</p>`,
)}

${section(
  'examples',
  '例：決まりを入れた1週間',
  `${BAND}<div class="tbl-wrap"><table>
<thead><tr><th>曜日</th><th>決まり</th><th>料理</th><th>主な食材</th></tr></thead>
<tbody>
${KONDATE_EXAMPLE.routine.map(exRow).join('\n')}
</tbody>
</table></div>
<p>冷蔵庫に${KONDATE_EXAMPLE.fridge.join('・')}がある家で、上の決まりで1週間をつくった例です。土曜は作らない日なので、料理は6品です。買うものは${EX_BUY.map((x) => x.ing).join('・')}の${EX_BUY.length}つになりました。</p>
<p>冷蔵庫に何も丸をつけないと、買うものは${EX_BUY_NOFRIDGE.length}になります。キャベツ・玉ねぎ・卵の3つが、家にあるものとして外れたぶんです。</p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>豚こま・キャベツ・玉ねぎ・卵が冷蔵庫にあるとき、肉の日は${KIND_N['肉']}品のうち、このどれかを使う${SC_FRIDGE}品から選びます。週末に残った野菜を平日のうちに使いたいときは、その野菜に丸をつけてから「1週間をつくる」を押します。</p>
<p>家族がさばと鮭を食べない家なら、苦手なものに2つを入れます。魚の日の候補は${KIND_N['魚']}品から${SC_NG}品になり、あじやぶり、たらの料理から選ばれます。</p>
<p>上の例の週を水曜日に開くと、月曜と火曜はもう過ぎた日なので、買うものは水曜から日曜の料理の${SC_WED.length}つです。週の途中で買い物に行くときは、その日から先の分だけを見れば足ります。</p>`,
)}

${section('table', '決まりごとの料理の数', `${KIND_TABLE}<p>料理の数は、苦手なものを入れる前の数です。苦手な食材をふやすと候補がへり、合う料理がない日は手帳のマスにその理由が出ます。</p>`)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<p>今週のもう過ぎた日は、「1週間をつくる」を押しても作り直しません。食べ終わった日の料理が変わると、これまでの献立の記録が合わなくなるためです。</p>
<p>とめた日は、料理を押しても入れかわりません。入れかえたいときは、曜日の字をもう一度押して赤ペンの丸を外してください。</p>
<p>冷蔵庫の丸は、あるかないかだけを見ます。玉ねぎが半分しかなくても丸があれば買うものに入らないので、量が足りるかは自分で見てください。</p>
<p>決まりを「作らない」にかえると、その日の料理は消え、買うものからもその料理の食材が外れます。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '1週間の献立を自動で組む｜晩ごはんシミュレーター',
    description: `1週間の晩ごはんを、曜日ごとの決まりで組みます。料理は${ALL}品、決まりは肉・魚・麺・丼・カレー・鍋など${KONDATE_RULES.length}つ。冷蔵庫にある食材を使う料理を先に選び、${ING_N}種類の食材から買うものを出します。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '曜日ごとの決まり（肉・魚・麺など）と冷蔵庫の食材から、1週間の晩ごはんと買うものを組むツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['kondate.js'],
    top: TOP,
    footNote: '入力したものは送信しません。献立と「メモする」の記録は、この端末の中だけに保存します。',
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
