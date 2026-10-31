// ふるさと納税の制度の変更点 /furusato/seido/（10/22 第3弾といっしょに。設計は claude/furusato-spec.md の「制度の動き」）
// 寄付の年のマスをえらぶと、変更ごとに「前から・この年・まだ」を出す。動きは src/client/furusato-seido.js
// 数字と日付は総務省の資料で確かめたものだけ（出典は src/data/furusato.mjs の FURUSATO_SEIDO_SOURCES と、控除の見直しの FURUSATO_SOURCES）
// ポイントの付与の決まりは、コーナーの決まり（ポイントの話は書かない）なので載せない
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { FURUSATO_SOURCES, FURUSATO_SEIDO_SOURCES, FURUSATO_YEARS } from '../data/furusato.mjs';
import { furusatoLimit, furusatoBreakdown } from '../lib/furusato.mjs';
import { fmt } from '../lib/number.mjs';

const YEAR = 2026; // はじめにえらんでおく寄付の年（見た人のブラウザの年にあわせて、スクリプトがえらび直す）
const YEARS = [YEAR, YEAR + 1];
const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8))}日`;
const reiwa = (y) => y - 2018;

// 結果の年表。from は、その変更がかかわりはじめる寄付の年
export const SEIDO_ITEMS = [
  { from: 2019, when: '2019年6月から', what: '指定された自治体だけが対象。返礼品は3割以下の地場産品' },
  { from: 2026, when: '2026年の寄付から', what: '所得税の基礎控除などが変わり、上限の目安の計算も変わる' },
  { from: 2026, when: '2026年10月から', what: '自治体が使えるお金を寄付の52.5%以上に。返礼品の3割以下は同じ' },
  { from: 2027, when: '2027年の寄付から', what: '住民税の特例控除は193万円まで。給与収入1億円ほどの人の額' },
];
const TAG = { old: '前から', now: 'この年', later: 'まだ' };
const kindOf = (from, y) => (from < y ? 'old' : from === y ? 'now' : 'later');
const newCount = (y) => SEIDO_ITEMS.filter((x) => x.from === y).length;

// 使う場面の例：年収1,000万円・ひとりが上限の目安まで寄付したときの特例控除（tests/furusato.test.mjs）
const EX_LIMIT = furusatoLimit({ income: 10000000 }, FURUSATO_YEARS[2026]).limit;
export const SEIDO_EX = { limit: EX_LIMIT, tokurei: furusatoBreakdown({ donation: EX_LIMIT, income: 10000000 }, FURUSATO_YEARS[2026]).tokurei };

const FAQS = [
  {
    q: `${YEAR}年は上限が変わりますか？`,
    a: `<p>上限の計算に使う控除の数字が変わります。<a href="/furusato/">上限の目安</a>は${YEAR}年の数字で計算しています。</p>`,
  },
  {
    q: '193万円の上限は、だれにかかりますか？',
    a: '<p>住民税の特例控除が193万円をこえる人です。総務省は、給与収入1億円ほどの人の額としています。</p>',
  },
  {
    q: '返礼品は寄付額の何割までですか？',
    a: '<p>寄付額の3割以下で、地場産品にかぎります。2019年6月からの決まりで、2026年10月からも同じです。</p>',
  },
  {
    q: '指定されていない自治体に寄付したら？',
    a: '<p>ふるさと納税の控除の対象になりません。指定を取り消された自治体も同じです。</p>',
  },
  {
    q: '2026年10月から、ふるさと納税の何が変わりますか？',
    a: '<p>自治体が使えるお金を、寄付の52.5%以上にする基準ができます。返礼品が寄付額の3割以下の地場産品という決まりは、変わりません。</p>',
  },
  {
    q: `${YEAR}年の寄付は、いつの税金から引かれますか？`,
    a: `<p>令和${reiwa(YEAR)}年分の所得税と、${YEAR + 1}年6月からの令和${reiwa(YEAR) + 1}年度の住民税です。ワンストップ特例では、ぜんぶ住民税から引かれます。</p>`,
  },
];

// 出典：総務省の3つと、2026年の寄付の控除の見直し（国税庁・財務省・渋谷区）
const KOUJO = ['国税庁', '財務省', '渋谷区'];
const SRC = [...FURUSATO_SEIDO_SOURCES, ...FURUSATO_SOURCES.filter((s) => KOUJO.some((k) => s.name.startsWith(k)))];
const SOURCES = `<ul class="src-list">${SRC.map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人で作っているページで、税理士の監修ではありません。最後は寄付先の自治体や、住んでいる市区町村で確かめてください。</p>`;

const itemHtml = (x, i) => {
  const k = kindOf(x.from, YEAR);
  return `<li class="sd-item${k === 'now' ? ' is-now' : k === 'later' ? ' is-later' : ''}" id="sd-${i}" data-from="${x.from}"><span class="sd-tag">${TAG[k]}</span><p class="sd-when">${x.when}</p><p class="sd-what">${x.what}</p></li>`;
};

export default function render() {
  const tool = toolBySlug('furusato-seido');
  const path = '/furusato/seido/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">寄付の年にかかわる制度の変更を出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="tiles tiles-2" role="group" aria-label="寄付の年">
      ${YEARS.map((y) => `<button type="button" class="tile tile-word" data-y="${y}" aria-pressed="${y === YEAR}"><b>${y}年</b><small>令和${reiwa(y)}年</small></button>`).join('\n      ')}
    </div>
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">制度の変更点</p>
    <p class="doc-sum"><span class="doc-sum-k" id="r-cap">${YEAR}年の寄付で</span><span class="doc-sum-v"><b id="r-num">${newCount(YEAR)}</b>つ変わる</span></p>
    <ol class="sd-list">
      ${SEIDO_ITEMS.map(itemHtml).join('\n      ')}
    </ol>
    <p class="doc-foot"><span id="r-foot">所得税は令和${reiwa(YEAR)}年分・住民税は令和${reiwa(YEAR) + 1}年度</span></p>
  </div>
  <div class="calc-tools"><a class="tool-btn tool-link span-2" href="/furusato/">上限の目安</a><a class="tool-btn tool-link" href="/furusato/shimekiri/">締め切り</a></div>
${memoHtml(tool, false)}
  </div>

${section(
  'changes',
  '変わったこと・変わること',
  `<div class="tbl-wrap"><table class="tbl-text">
<thead><tr><th>いつから</th><th>中身</th></tr></thead>
<tbody>
<tr><td class="nw">2019年6月1日</td><td>総務大臣が指定した自治体への寄付だけが、ふるさと納税の控除の対象です。返礼品は寄付額の3割以下で、その自治体の地場産品にかぎります。</td></tr>
<tr><td class="nw">2026年の寄付</td><td>所得税の基礎控除が、合計所得489万円以下で104万円などに上がります。給与所得控除の最低保障額は74万円です。住民税の基礎控除は43万円のままです。</td></tr>
<tr><td class="nw">2026年4月1日</td><td>指定の取り消しの期間が、2年から3年以内になりました。</td></tr>
<tr><td class="nw">2026年10月1日</td><td>自治体が使えるお金を寄付の52.5%以上にする決まりです。2029年10月からの指定で60%以上まで上げ、使い道も公表します。取り消しは5年前までの違反も対象です。</td></tr>
<tr><td class="nw">2027年の寄付</td><td>住民税の特例控除の額に、193万円の上限がつきます。寄付の額そのものと、住民税の基本分の控除は変わりません。</td></tr>
</tbody>
</table></div>
<p>自治体が使えるお金は、寄付から返礼品や送料などの募集の費用を引いた額です。${YEAR}年の寄付は、令和${reiwa(YEAR)}年分の所得税と令和${reiwa(YEAR) + 1}年度の住民税で計算します。</p>
<p>所得税は寄付した年の分で計算します。住民税は前の年の所得をもとに、次の年の6月から納めるしくみです。だから、寄付の年からかかわる変更は、住民税では1年あとの年度に出てきます。2027年の寄付からの193万円の上限なら、2028年6月からの令和10年度の住民税です。</p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>2026年12月に寄付するとき。2026年の寄付なので、上のマスで2026年をえらぶと、この年からの変更は${newCount(2026)}つです。控除は令和8年分の所得税と、2027年6月からの令和9年度の住民税で受けます。年内の締め切りは<a href="/furusato/shimekiri/">ふるさと納税はいつまで</a>にまとめています。</p>
<p>193万円の上限が自分にかかるかを見たいとき。2026年の寄付の計算では、年収1,000万円・ひとりの上限の目安は${fmt(SEIDO_EX.limit)}円です。その額を寄付したときの住民税の特例控除は${fmt(SEIDO_EX.tokurei)}円で、193万円にはとどきません。特例控除の額は<a href="/furusato/uchiwake/">控除の内わけ</a>で出せます。</p>
<p>1万円の寄付で、自治体の基準を数字にしたいとき。返礼品の費用は3,000円以下で、2026年10月からは自治体が使えるお金が5,250円以上です。2029年10月からの指定では、6,000円以上になります。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>193万円を、寄付の上限だと思う</h3>
<p>上限がつくのは住民税の特例控除の額で、寄付の額ではありません。年収1,000万円・ひとりの特例控除は${fmt(SEIDO_EX.tokurei)}円で、上限の193万円の10分の1にもなりません。</p>
<h3>52.5%を、返礼品の割合だと思う</h3>
<p>52.5%は、寄付から返礼品や送料などの募集の費用を引いて、自治体に残る割合です。1万円の寄付なら、募集の費用は合わせて4,750円以下で、そのうち返礼品は3,000円以下のままです。</p>
<h3>2027年の寄付からの変更を、2027年6月の住民税で探す</h3>
<p>2027年6月からの住民税は令和9年度で、2026年の寄付の分です。193万円の上限が出てくるのは、2028年6月からの令和10年度の住民税です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: `ふるさと納税の制度の変更点｜${YEAR}年・${YEAR + 1}年の寄付の改正で変わること`,
    description: `ふるさと納税の制度の変更点を、寄付の年ごとにまとめました。${YEAR}年の寄付から控除の数字が見直され、${YEAR}年10月から自治体の基準が変わり、${YEAR + 1}年の寄付から住民税の特例控除に193万円の上限がつきます。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: toolBySlug('furusato').name, path: '/furusato/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, 'ふるさと納税の寄付の年をえらぶと、その年の寄付にかかわる制度の変更を、前からのもの・その年からのもの・まだのものに分けて出すページ。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['furusato-seido.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
