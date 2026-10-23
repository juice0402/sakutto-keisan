// ふるさと納税のコーナー（10/22 統合。claude/sakutto-tougou-plan.md）。テーマはお仕事・お金と同じ紺の手帳
// /furusato/：はじめての3問（年収・配偶者・16歳以上の子）から、上限の目安・住民税から減る額・手続き。年収と家族の早見表
// /furusato/jougen/：控除上限額の計算（住民税の決定通知書の所得割と所得税率から）
// 計算は src/lib/furusato.mjs、年ごとの数字と出典は src/data/furusato.mjs。ページに載せる数字は tests/furusato.test.mjs で確かめる
// 使わない言葉（総務省のQ&A）：お得・コスパ・還元・購入・買う・セール・節税 など。scripts/verify-dist.mjs が見張る
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { furusatoLimit, furusatoFromNotice, furusatoIncomeFor, furusatoCouple, spouseIncomeEdges, TOKUREI_BANDS, tokureiRatio } from '../lib/furusato.mjs';
import { FURUSATO_YEARS, FURUSATO_SOURCES, FURUSATO_FUUFU_SOURCES } from '../data/furusato.mjs';
import { fmt } from '../lib/number.mjs';

const YEAR = 2026; // 寄付の年（1月1日に次の年へ。src/data/furusato.mjs に足してから）
const CFG = FURUSATO_YEARS[YEAR];
const yen = (x) => `${fmt(x)}円`;
const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8))}日`;

// 出典と確認日（どのページも同じ）
const SOURCES = `<ul class="src-list">${FURUSATO_SOURCES.map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人で作っているツールで、税理士の監修ではありません。</p>`;

/* ---- /furusato/ はじめての3問 ---- */
const KIDS = [
  ['none', '子なし', '15歳まで'],
  ['koukou', '高校生', '16〜18歳'],
  ['daigaku', '大学生', '19〜22歳'],
  ['both', '両方', '1人ずつ'],
];
const KID_FAM = { none: {}, koukou: { koukou: 1 }, daigaku: { daigaku: 1 }, both: { koukou: 1, daigaku: 1 } };
const ROWS = [100, 130, 150, 180, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1200, 1500, 2000];
const quickTable = (spouse) =>
  `<div class="tbl-wrap"><table class="tbl-tight fz-quick">
<thead><tr><th class="num">年収</th>${KIDS.map(([, b]) => `<th class="num">${b}</th>`).join('')}</tr></thead>
<tbody>
${ROWS.map((m) => `<tr><td class="num">${fmt(m)}万</td>${KIDS.map(([k]) => {
  const r = furusatoLimit({ income: m * 10000, spouse, ...KID_FAM[k] }, CFG);
  return `<td class="num">${r.none ? '—' : fmt(r.limit)}</td>`;
}).join('')}</tr>`).join('\n')}
</tbody>
</table></div>`;
// 配偶者と16歳以上の子のマス（上限の目安と、寄付額から年収の目安で同じ。はじめは「ひとり」「子なし」）
const FAMILY_TILES = `<div class="tiles tiles-2" role="group" aria-label="配偶者">
      <button type="button" class="tile tile-word" data-spouse="0" aria-pressed="true"><b>ひとり</b><small>共働きも</small></button>
      <button type="button" class="tile tile-word" data-spouse="1" aria-pressed="false"><b>夫婦</b><small>配偶者を扶養</small></button>
    </div>
    <div class="tiles tiles-4" role="group" aria-label="扶養している16歳以上の子">
      ${KIDS.map(([k, b, s]) => `<button type="button" class="tile tile-word" data-kids="${k}" aria-pressed="${k === 'none'}"><b>${b}</b><small>${s}</small></button>`).join('\n      ')}
    </div>`;
const EX = furusatoLimit({ income: 5000000 }, CFG);
// 上限が1万円になる年収（よくある質問の「年収いくらから」）
const FROM_SINGLE = furusatoIncomeFor({ target: 10000 }, CFG);
const FROM_COUPLE = furusatoIncomeFor({ target: 10000, spouse: true }, CFG);

const FAQS = [
  {
    q: '上限をこえて寄付するとどうなりますか？',
    a: '<p>こえた分は控除されず、そのまま自己負担になります。上限は目安なので、ぎりぎりではなく少し下の額にしておくと、こえる心配が減ります。</p>',
  },
  {
    q: '年収は、いつの年収ですか？',
    a: `<p>寄付する年の1月から12月までの年収です。${YEAR}年の寄付なら${YEAR}年の年収で、年の途中なら見こみの額で計算します。</p>`,
  },
  {
    q: '年収は手取りですか、額面ですか？',
    a: '<p>額面です。源泉徴収票の「支払金額」の数字で、非課税の通勤手当は入りません。</p>',
  },
  {
    q: '年収いくらから控除がありますか？',
    a: `<p>控除があるのは住民税の所得割がかかる人で、この計算では上限が1万円になるのは、ひとりで年収${FROM_SINGLE.man}万円、夫婦で${FROM_COUPLE.man}万円からです。ほかの額は<a href="/furusato/nenshu/">ふるさと納税に必要な年収</a>で出せます。</p>`,
  },
  {
    q: 'ワンストップ特例とは何ですか？',
    a: '<p>確定申告をしない会社員などは、寄付先が5つまでなら、寄付先の自治体に<a href="/furusato/onestop/">申請書</a>を出すだけで住民税から控除されます。申請書にマイナンバーカードの表と裏のコピーをつけて、寄付した翌年の1月10日までに届くように出します。</p>',
  },
  {
    q: '年末調整で控除されますか？',
    a: '<p>されません。会社員は、寄付先にワンストップ特例の申請書を出すか、確定申告をします。</p>',
  },
  {
    q: '確定申告をする人は？',
    a: '<p>医療費控除や住宅ローン控除の1年目などで確定申告をする人は、ワンストップ特例が使えません。確定申告でふるさと納税も申告すると、所得税の一部が戻り、残りは翌年度の住民税から引かれます。</p>',
  },
  {
    q: '住宅ローン控除や医療費控除があると？',
    a: '<p>上限が下がることがあります。住民税の決定通知書の所得割から出す<a href="/furusato/jougen/">控除上限額の計算</a>のほうが近い額になります。</p>',
  },
  {
    q: '共働きや中学生以下の子は？',
    a: '<p>配偶者を扶養していない共働きは「ひとり」をえらびます。2人の上限と合計は<a href="/furusato/fuufu/">共働き・夫婦の上限</a>で出せます。15歳以下の子は扶養控除がないので、上限には関係しません。</p>',
  },
  {
    q: '住民税はいつ減りますか？',
    a: '<p>寄付した翌年の6月から、その次の年の5月までの住民税が減ります。会社員は毎月の給与から引かれる住民税が少なくなります。</p>',
  },
  {
    q: '限度額はどのサイトが正しいですか？',
    a: '<p>どれも目安で、社会保険料の置き方や調整控除を入れるかで少しずつ変わります。このツールは総務省の式のとおり調整控除のあとの所得割で計算していて、決定通知書があれば<a href="/furusato/jougen/">控除上限額の計算</a>のほうが近い額になります。</p>',
  },
  {
    q: `${YEAR}年の寄付は何で計算していますか？`,
    a: `<p>${CFG.incomeTaxYear}の所得税と${CFG.residentTaxYear}の住民税です。給与所得控除の最低保障額74万円と、所得税の基礎控除の引き上げを入れています。</p>`,
  },
  {
    q: `${YEAR + 1}年の寄付から変わることは？`,
    a: '<p>住民税の特例控除に193万円の上限がつきます。給与収入1億円ほどの人の額です。ほかの変更とあわせて<a href="/furusato/seido/">制度の変更点</a>にまとめました。</p>',
  },
];

function renderMain() {
  const tool = toolBySlug('furusato');
  const path = '/furusato/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">年収と家族から寄付の上限を出します。</p>

<div class="calc" id="calc" data-year="${YEAR}">
  <div class="box-rows">
    ${boxField('income', '年収', '万円', '500', '', '給与の額面（税金や保険料を引く前）')}
    ${FAMILY_TILES}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">寄付の上限</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k">上限の目安</span><span class="doc-sum-v"><b id="r-num">？</b><span id="r-unit">円</span></span></p>
    <p class="doc-info"><span id="r-who"></span><span>${YEAR}年の寄付</span></p>
    <ol class="fz-flow" id="r-flow" aria-label="お金の流れ">
      <li><span class="fz-when">今年中</span><b id="f-give">—</b><span>寄付する</span></li>
      <li><span class="fz-when">翌年6月から</span><b id="f-back">—</b><span>住民税が減る</span></li>
      <li><span class="fz-when">のこり</span><b id="f-self">2,000円</b><span>自己負担</span></li>
    </ol>
    <p class="doc-foot"><span id="r-foot">年収を入れてください</span><span id="r-how"></span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools"><a class="tool-btn tool-link" id="to-memo" href="/furusato/memo/">寄付メモ</a><a class="tool-btn tool-link span-2" href="/furusato/jougen/">決定通知書から計算</a></div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>上限 ＝ 所得割 × 20% ÷ 割合 ＋ 2,000円</span>
<span>割合 ＝ 90% − 所得税率 × 1.021</span>
</div>
<p>所得割は住民税の所得割（調整控除のあと）で、割合は特例控除の割合です。例：年収500万円・ひとりなら、所得割${yen(EX.shotokuwari)}・所得税率5%で、上限は約${yen(EX.limit)}です。</p>
<p>自己負担の2,000円は、寄付先や寄付の回数がいくつあっても、1年の合計で1回です。</p>
<p>年収から出すときは、給与だけで、社会保険料は年収の15%、ほかの控除はないものとしています。1,000円未満は切り捨てです。正確な額は、住民税の決定通知書や市区町村で確かめてください。</p>`,
)}

${section(
  'table',
  `上限の早見表（${YEAR}年の寄付）`,
  `<p>ひとり・共働き（配偶者を扶養していない）</p>
${quickTable(false)}
<p>夫婦（配偶者を扶養している）</p>
${quickTable(true)}
<p class="note">年収は万円、上限は円です。</p>
<p>子は扶養している16歳以上の子です。
「両方」は高校生と大学生が1人ずつです。「—」は住民税の所得割がかからず、控除がない年収です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: `ふるさと納税の上限の目安｜限度額を年収と家族から計算（${YEAR}年の寄付・早見表）`,
    description: `ふるさと納税の上限（控除上限額・限度額）の目安を計算します。年収と、配偶者・16歳以上の子をえらぶと、${YEAR}年の寄付の上限と、翌年の住民税から減る額がわかります。年収・家族別の早見表と、総務省の式による計算のしかたものせています。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '年収と家族構成から、ふるさと納税の控除上限額の目安を総務省の式で計算するツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['furusato.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

/* ---- /furusato/nenshu/ ふるさと納税に必要な年収（上限の目安の逆。10/23 検索候補「5万円 年収」など） ---- */
const N_ROWS = [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000, 250000, 300000, 400000, 500000, 1000000];
const nenshuTable = (spouse) =>
  `<div class="tbl-wrap"><table class="tbl-tight fz-quick">
<thead><tr><th class="num">寄付額</th>${KIDS.map(([, b]) => `<th class="num">${b}</th>`).join('')}</tr></thead>
<tbody>
${N_ROWS.map((t) => `<tr><td class="num">${fmt(t / 10000)}万円</td>${KIDS.map(([k]) => `<td class="num">${fmt(furusatoIncomeFor({ target: t, spouse, ...KID_FAM[k] }, CFG).man)}万</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table></div>`;
const N_EX = furusatoIncomeFor({ target: 50000 }, CFG);
const N_EX2 = furusatoIncomeFor({ target: 50000, spouse: true }, CFG);
const N_EX30 = furusatoIncomeFor({ target: 300000 }, CFG);
const N_EX50 = furusatoIncomeFor({ target: 500000 }, CFG);

const N_FAQS = [
  {
    q: '5万円の寄付には、年収がいくら必要ですか？',
    a: `<p>この計算では、ひとりで年収${N_EX.man}万円、夫婦（配偶者を扶養）で${N_EX2.man}万円からです。16歳以上の子を扶養していると、もう少し高くなります。</p>`,
  },
  {
    q: '30万円や50万円の寄付は？',
    a: `<p>ひとりなら、30万円は年収${fmt(N_EX30.man)}万円、50万円は${fmt(N_EX50.man)}万円からです。年収1,200万円ほどをこえると、配偶者の控除がなくなるので、夫婦もひとりと同じになります。</p>`,
  },
  {
    q: '表の年収ちょうどなら、だいじょうぶですか？',
    a: '<p>表の年収は、上限がちょうど寄付額に届く年収です。社会保険料やほかの控除で上限は変わるので、年収に少し余裕をみてください。</p>',
  },
  {
    q: '年収は手取りですか？',
    a: '<p>額面です。源泉徴収票の「支払金額」の数字で、寄付する年の1月から12月までの年収です。</p>',
  },
  {
    q: '共働きの夫婦は？',
    a: '<p>2人とも、それぞれ自分の年収で「ひとり」をえらびます。控除は寄付した人の税金から引かれるので、寄付は控除を受ける本人の名前でします。</p>',
  },
];

function renderNenshu() {
  const tool = toolBySlug('furusato-nenshu');
  const parent = toolBySlug('furusato');
  const path = '/furusato/nenshu/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">寄付したい額に必要な年収を出します。</p>

<div class="calc" id="calc" data-year="${YEAR}">
  <div class="box-rows">
    ${boxField('target', '寄付したい額', '円', '50,000', '', '1年に寄付する額の合計')}
    ${FAMILY_TILES}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">年収の目安</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k">必要な年収</span><span class="doc-sum-v"><b id="r-num">？</b><span id="r-unit">万円から</span></span></p>
    <p class="doc-info"><span id="r-who"></span><span>${YEAR}年の寄付</span></p>
    <ol class="fz-flow is-empty" id="r-flow" aria-label="お金の流れ">
      <li><span class="fz-when">今年中</span><b id="f-give">—</b><span>寄付する</span></li>
      <li><span class="fz-when">翌年6月から</span><b id="f-back">—</b><span>住民税が減る</span></li>
      <li><span class="fz-when">のこり</span><b id="f-self">2,000円</b><span>自己負担</span></li>
    </ol>
    <p class="doc-foot"><span id="r-foot">寄付したい額を入れてください</span><span id="r-how"></span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools"><a class="tool-btn tool-link span-3" href="/furusato/">年収から上限を計算</a></div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>上限 ＝ 所得割 × 20% ÷ 割合 ＋ 2,000円</span>
<span>年収の目安 ＝ 上限が寄付額に届く、いちばん低い年収</span>
</div>
<p>年収を1万円ずつ変えて、<a href="/furusato/">上限の目安</a>と同じ計算で上限を出し、寄付したい額に届く年収を探しています。例：5万円なら、ひとりで年収${N_EX.man}万円の上限が${yen(N_EX.limit)}です。</p>
<p>給与だけで、社会保険料は年収の15%、ほかの控除はないものとしています。正確な額は、住民税の決定通知書や市区町村で確かめてください。</p>`,
)}

${section(
  'table',
  `寄付額ごとの年収の早見表（${YEAR}年の寄付）`,
  `<p>ひとり・共働き（配偶者を扶養していない）</p>
${nenshuTable(false)}
<p>夫婦（配偶者を扶養している）</p>
${nenshuTable(true)}
<p class="note">年収は万円で、その年収から寄付できます。</p>
<p>子は扶養している16歳以上の子です。「両方」は高校生と大学生が1人ずつです。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(N_FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: `ふるさと納税に必要な年収｜5万円・10万円の寄付は年収いくらから（${YEAR}年の寄付・早見表）`,
    description: `ふるさと納税で寄付したい額から、上限がその額に届く年収の目安を計算します。5万円ならひとりで年収${N_EX.man}万円からです。配偶者と16歳以上の子をえらべて、寄付額1万円〜100万円の早見表ものせています。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: '/furusato/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '寄付したい額と家族構成から、ふるさと納税の上限がその額に届く年収の目安を総務省の式で計算するツール。'), faqLd(N_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['furusato-nenshu.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

/* ---- /furusato/fuufu/ 共働き・夫婦の上限（10/23 しょーくんが「ページを作る」をえらんだ） ---- */
const EDGE = spouseIncomeEdges(CFG); // 配偶者控除・配偶者特別控除になる配偶者の年収（給与だけ）
const KIDS_TILES = `<div class="tiles tiles-4" role="group" aria-label="扶養している16歳以上の子">
      ${KIDS.map(([k, b, s]) => `<button type="button" class="tile tile-word" data-kids="${k}" aria-pressed="${k === 'none'}"><b>${b}</b><small>${s}</small></button>`).join('\n      ')}
    </div>`;
const WHO_TILES = `<div class="tiles tiles-2" id="who" role="group" aria-label="子を扶養する人" hidden>
      <button type="button" class="tile tile-word" data-who="1" aria-pressed="true"><b>あなた</b><small>の扶養</small></button>
      <button type="button" class="tile tile-word" data-who="2" aria-pressed="false"><b>配偶者</b><small>の扶養</small></button>
    </div>`;
const F_COLS = [0, 150, 200, 300]; // 配偶者の年収（万円。136万円までは「なし」と同じ）
const F_ROWS = [300, 400, 500, 600, 700, 800, 1000];
const fuufuTable = () =>
  `<div class="tbl-wrap"><table class="tbl-tight fz-quick">
<thead><tr><th class="num">あなた</th>${F_COLS.map((c) => `<th class="num">${c ? `${c}万` : 'なし'}</th>`).join('')}</tr></thead>
<tbody>
${F_ROWS.map((m) => `<tr><td class="num">${fmt(m)}万</td>${F_COLS.map((c) => {
  const r = furusatoCouple({ income1: m * 10000, income2: c * 10000 }, CFG);
  return `<td class="num">${r.a.none ? '—' : fmt(r.a.limit)}</td>`;
}).join('')}</tr>`).join('\n')}
</tbody>
</table></div>`;
const F_EX = furusatoCouple({ income1: 6000000, income2: 3000000 }, CFG);
const F_EX2 = furusatoCouple({ income1: 5000000, income2: 1500000 }, CFG);
const man = (y) => `${fmt(y / 10000)}万円`;

const F_FAQS = [
  {
    q: '夫と妻、どちらの名前で寄付しますか？',
    a: '<p>控除は寄付した人の税金から引かれるので、それぞれ自分の上限までを、自分の名前で寄付します。2人の上限を足して1人で使うことはできません。</p>',
  },
  {
    q: '専業主婦（主夫）やパートの配偶者は？',
    a: `<p>給与だけで配偶者の年収が${man(EDGE.koujo)}までなら、年収の多い人が配偶者控除を、${man(EDGE.tokubetsu)}までなら配偶者特別控除を受けられます。そのぶん年収の多い人の上限は少し下がり、住民税の所得割がかからない配偶者には控除がありません。</p>`,
  },
  {
    q: '子どもはどちらの扶養に入れますか？',
    a: '<p>扶養控除は、1人の子につき夫婦のどちらか1人が受けます。扶養に入れたほうの上限が少し下がります。</p>',
  },
  {
    q: 'ワンストップ特例は2人とも使えますか？',
    a: '<p>使えます。5つまでの数え方も申請書も1人ずつで、それぞれが自分の寄付先に出します。</p>',
  },
  {
    q: '2人の年収が同じくらいのときは？',
    a: '<p>配偶者特別控除は、夫婦がおたがいに受けることはできません。この計算では、年収の多いほうだけが受けるものとしています。</p>',
  },
];

const FUUFU_SOURCES = `<ul class="src-list">${[...FURUSATO_SOURCES, ...FURUSATO_FUUFU_SOURCES].map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人で作っているツールで、税理士の監修ではありません。</p>`;

function renderFuufu() {
  const tool = toolBySlug('furusato-fuufu');
  const parent = toolBySlug('furusato');
  const path = '/furusato/fuufu/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">2人の年収から、それぞれの上限を出します。</p>

<div class="calc" id="calc" data-year="${YEAR}">
  <div class="box-rows">
    ${boxField('income1', 'あなたの年収', '万円', '600', '', '給与の額面（税金や保険料を引く前）')}
    ${boxField('income2', '配偶者の年収', '万円', '300', '', '給与の額面。収入がなければ0')}
    ${KIDS_TILES}
    ${WHO_TILES}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">夫婦の上限</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k">2人の合計</span><span class="doc-sum-v"><b id="r-num">？</b><span id="r-unit">円</span></span></p>
    <div class="rieki-bar" aria-hidden="true">
      <div class="rb-track"><div class="rb-profit" id="b-a"></div><div class="rb-cost" id="b-b"></div></div>
      <p class="rb-legend"><span>あなた</span><span>配偶者</span></p>
    </div>
    <table class="doc-table fz-table"><tbody>
      <tr><td>あなたの上限</td><td id="d-a">—</td></tr>
      <tr><td>配偶者の上限</td><td id="d-b">—</td></tr>
    </tbody></table>
    <p class="doc-foot"><span id="r-foot">あなたの年収を入れてください</span><span id="r-how"></span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools"><a class="tool-btn tool-link span-3" href="/furusato/">1人の上限の目安</a></div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `<p>1人ずつ<a href="/furusato/">上限の目安</a>と同じ式で計算し、2人を足します。配偶者の年収が${man(EDGE.koujo)}までなら配偶者控除、${man(EDGE.tokubetsu)}までなら配偶者特別控除を、年収の多いほうの計算に入れます。</p>
<p>例：あなたが年収600万円・配偶者が300万円なら、あなたは約${yen(F_EX.a.limit)}、配偶者は約${yen(F_EX.b.limit)}で、合計は約${yen(F_EX.total)}です。配偶者が150万円なら、あなたの上限は配偶者特別控除で約${yen(F_EX2.a.limit)}になります。</p>
<p>給与だけで、社会保険料は年収の15%、ほかの控除はないものとしています。正確な額は、住民税の決定通知書や市区町村で確かめてください。</p>`,
)}

${section(
  'table',
  `配偶者の年収で変わる、あなたの上限（${YEAR}年の寄付）`,
  `${fuufuTable()}
<p class="note">年収は万円、上限は円です。</p>
<p>子の扶養がないときの、あなたの上限です。配偶者の年収が${man(EDGE.koujo)}までは「なし」と同じです。配偶者の上限は、配偶者の年収で<a href="/furusato/">上限の目安</a>の「ひとり」をえらんだ額になります。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(F_FAQS))}

${section('sources', '出典', FUUFU_SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: `共働き・夫婦の上限｜ふるさと納税を2人の年収から計算（${YEAR}年の寄付・早見表）`,
    description: `共働きや夫婦のふるさと納税の上限（控除上限額）の目安を、2人の年収と16歳以上の子の扶養から計算します。配偶者控除・配偶者特別控除も入れて、それぞれの上限と合計がわかります。配偶者の年収別の早見表ものせています。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: '/furusato/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '共働き・夫婦の2人の年収と子の扶養から、ふるさと納税の上限の目安をそれぞれ計算するツール。'), faqLd(F_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['furusato-fuufu.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

/* ---- /furusato/jougen/ 控除上限額の計算（決定通知書から） ---- */
const RANGE = ['〜195万', '〜330万', '〜695万', '〜900万', '〜1800万', '〜4000万', '4000万〜'];
const RANGE_TEXT = ['195万円まで', '330万円まで', '695万円まで', '900万円まで', '1,800万円まで', '4,000万円まで', '4,000万円をこえる'];
const RATE_TILES = TOKUREI_BANDS.map(([, r], i) => `<button type="button" class="tile" data-rate="${r}" aria-pressed="false"><b>${Math.round(r * 100)}%</b><small>${RANGE[i]}</small></button>`).join('\n      ');
const RATE_ROWS = TOKUREI_BANDS.map(([, r], i) => `<tr><td class="num">${Math.round(r * 100)}%</td><td>${RANGE_TEXT[i]}</td><td class="num">${(tokureiRatio(r) * 100).toFixed(3).replace(/\.?0+$/, '')}%</td></tr>`).join('\n');
const EX2 = furusatoFromNotice({ shotokuwari: 235500, rate: 0.05 });

const FAQS2 = [
  {
    q: '所得割の額は決定通知書のどこですか？',
    a: '<p>税額の欄の、市町村民税と道府県民税の「所得割額」を足した額です。税額控除前の所得割額の欄がある市区町村では、その額を入れます。</p>',
  },
  {
    q: '去年もふるさと納税をしていたら？',
    a: '<p>決定通知書の所得割は、寄附金税額控除などを引いたあとの額のことがあります。引く前の額にもどしてから入れてください。</p>',
  },
  {
    q: '所得税の税率はどう見ますか？',
    a: '<p>源泉徴収票の「給与所得控除後の金額」から「所得控除の額の合計額」を引いた額が、課税される所得です。その額の帯の税率をえらびます。</p>',
  },
  {
    q: '今年の決定通知書で今年の上限がわかりますか？',
    a: `<p>${YEAR}年の寄付の上限は、${YEAR}年の所得で決まります。今年の決定通知書は去年の所得なので、年収が去年と同じくらいなら目安になります。</p>`,
  },
  {
    q: '住宅ローン控除がある人は？',
    a: '<p>住民税から住宅ローン控除を受けている人は、ふるさと納税の控除が引ききれないことがあります。くわしくは市区町村に確かめてください。</p>',
  },
  {
    q: '個人事業主や年金の人も使えますか？',
    a: '<p>使えます。住民税の納税通知書の所得割の額を入れて、所得税の税率は確定申告書の「課税される所得金額」の帯でえらびます。</p>',
  },
];

function renderJougen() {
  const tool = toolBySlug('furusato-jougen');
  const parent = toolBySlug('furusato');
  const path = '/furusato/jougen/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">決定通知書の所得割から上限を出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${boxField('shotokuwari', '住民税の所得割', '円', '235,500', '', '決定通知書の所得割の額（市と県の合計）')}
    <div class="tiles tiles-4" role="group" aria-label="所得税の税率">
      ${RATE_TILES}
    </div>
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">控除上限額</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k">上限の目安</span><span class="doc-sum-v"><b id="r-num">？</b>円</span></p>
    <table class="doc-table fz-table"><tbody>
      <tr><td>所得割 × 20%</td><td id="d-cap">—</td></tr>
      <tr><td id="d-ratio-k">特例控除の割合</td><td id="d-ratio">—</td></tr>
      <tr><td>住民税から減る（ワンストップ）</td><td id="d-back">—</td></tr>
    </tbody></table>
    <p class="doc-foot"><span id="r-foot">住民税の所得割を入れてください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools"><a class="tool-btn tool-link span-3" href="/furusato/">年収と家族から計算</a></div>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>上限 ＝ 所得割 × 20% ÷ 割合 ＋ 2,000円</span>
<span>割合 ＝ 90% − 所得税率 × 1.021</span>
</div>
<p>割合は特例控除の割合です。</p>
<p>例：所得割235,500円・所得税率5%なら、${yen(EX2.cap)} ÷ 84.895% ＋ 2,000円で、上限は約${yen(EX2.limit)}です。</p>
<div class="tbl-wrap"><table>
<thead><tr><th class="num">所得税率</th><th>課税される所得</th><th class="num">特例控除の割合</th></tr></thead>
<tbody>
${RATE_ROWS}
</tbody>
</table></div>
<p>1.021 は、2037年までかかる復興特別所得税の分です。正確な額は、市区町村で確かめてください。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS2))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '控除上限額の計算｜ふるさと納税の上限を決定通知書の所得割から（個人事業主・年金も）',
    description: 'ふるさと納税の控除上限額を、住民税の決定通知書の所得割と所得税の税率から、総務省の式で計算します。個人事業主や年金の人は納税通知書の所得割で出せます。特例控除の割合の表と、決定通知書の見方ものせています。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: '/furusato/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '住民税の所得割と所得税率から、ふるさと納税の控除上限額を総務省の式で計算するツール。'), faqLd(FAQS2)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['furusato-jougen.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function render() {
  return [renderMain(), renderNenshu(), renderFuufu(), renderJougen()];
}
