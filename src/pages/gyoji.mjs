// 家族の行事の5ページ（10/27 しょーくん「くらしノートに負けない」。検索候補の調べで計算の需要があったもの）
// 七五三 /shichigosan/・厄年 /yakudoshi/・長寿祝い /choju/・お食い初め /okuizome/・四十九日 /shijukunichi/
// 数字と出典は src/data/gyoji.mjs、計算は src/lib/gyoji.mjs（ページの例は tests/gyoji.test.mjs で確かめる）
// 本文の早見表は、ビルドした年（日本時間）で作る。年が変わったら一度ビルドする（毎日の返礼品の取り直しで本番は作り直される）
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField, dateField } from '../fields.mjs';
import { weekdayOf, warekiOfYear } from '../lib/hizuke.mjs';
import { shichigosan, yakuOfYear, chojuOfYear, okuizome, shijuku } from '../lib/gyoji.mjs';
import { stair, zBox, zCal } from '../zukai.mjs';
import { SHICHIGOSAN_SOURCES, YAKU_SOURCES, CHOJU_SOURCES, OKUIZOME_SOURCES, SHIJUKU_SOURCES, CHOJU, NENKI, CHUIN } from '../data/gyoji.mjs';

const Y = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date()));
const md = (d) => `${d.m}月${d.d}日（${weekdayOf(d)}）`;
const wa = (y) => warekiOfYear(y).text;
const born = (y) => `${y}年<small>${wa(y)}</small>`;
const srcList = (list, note) =>
  `<ul class="src-list">${list.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a></li>`).join('')}</ul>\n<p>2026年10月27日に確認しました。${note}</p>`;
// 図解（#83）：行事ごとの流れの図（入れるもの → 決まりの短い言葉 → 答え）。数え方が神社・お寺・地域でちがうことは図の下の文にも書く
// 図の数字は tests/zukai-shigoto.test.mjs
const calOf = (d, w, ans = false, calm = false) => zCal(`${d.y}年${d.m}月`, d.d, w, ans, calm);
export const Z_GYOJI = {
  shichi: { born: Y - 3, man3: Y, kazoe3: Y - 1 },
  yaku: { born: Y - 41, hon: Y, mae: Y - 1, ato: Y + 1 },
  choju: { born: Y - 60, kanreki: Y, kokiKazoe: Y - 60 + 69, kokiMan: Y - 60 + 70 },
  okui: okuizome(`${Y}-01-01`).d100,
  shiju: shijuku(`${Y}-10-01`).day49,
};
const NOSCRIPT = '<noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>';
const sexSeg = (id, label, a, b) =>
  `<div class="seg seg-2" role="group" aria-label="${label}" id="${id}"><button type="button" class="seg-btn" data-sex="${a[0]}" aria-pressed="false">${a[1]}</button><button type="button" class="seg-btn" data-sex="${b[0]}" aria-pressed="false">${b[1]}</button></div>`;

function out(slug, { title, description, lead, calc, rest, faqs, sources, ld, script }) {
  const tool = toolBySlug(slug);
  const path = `/${slug}/`;
  const body = `
<h1>${tool.name}</h1>
<p class="lead">${lead}</p>

<div class="calc" id="calc">
${calc}
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  ${NOSCRIPT}
</div>
${rest}
${section('faq', 'よくある質問', faqHtml(faqs))}

${section('sources', '出典', sources)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title,
    description,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, ld), faqLd(faqs)],
    theme: themeOf(tool),
    ogImage: `/og/${slug}.png`,
    scripts: [script],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

/* ---------------- 七五三 ---------------- */
function renderShichigosan() {
  const ex = shichigosan([{ birth: `${Y - 3}-05-12`, sex: 'girl' }], Y);
  const ex7 = ex.rows.find((r) => r.items[0].age === 7 && r.items[0].style === 'man').year;
  const kidRow = (i) =>
    `<div class="kid-row" id="kid-${i}"${i ? ' hidden' : ''}>${dateField(`birth-${i}`, i ? `${i + 1}人目の生年月日` : '生年月日')}${sexSeg(`sex-${i}`, `${i + 1}人目`, ['boy', '男の子'], ['girl', '女の子'])}</div>`;
  const calc = `  <div class="box-rows">
    ${[0, 1, 2].map(kidRow).join('\n    ')}
  </div>
  <div class="slip" aria-live="polite">
    <p class="slip-title"><span>七五三の年</span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <p class="slip-sum"><span class="slip-k" id="r-cap">次の七五三</span><span class="slip-v"><b id="r-num">？</b><small>年</small></span></p>
    <p class="pc-say" id="r-say"></p>
    <table class="rk-table gy-table"><thead><tr><th class="rk-y">年</th><th id="h-0">年齢</th><th id="h-1" hidden>2人目</th><th id="h-2" hidden>3人目</th></tr></thead><tbody id="r-rows"></tbody></table>
    <p class="slip-foot" id="r-foot">生年月日を入れてください</p>
  </div>
  <div class="calc-tools"><button type="button" class="tool-btn" id="add-kid">＋きょうだいを追加</button></div>`;
  const yearTable = (y) => {
    const rows = [
      ['3歳', '男の子・女の子', 3],
      ['5歳', '男の子', 5],
      ['7歳', '女の子', 7],
    ].map(([age, who, n]) => `<tr><td>${age}<small>${who}</small></td><td class="num">${born(y - n + 1)}</td><td class="num">${born(y - n)}</td></tr>`);
    return `<h3>${y}年の七五三</h3><div class="tbl-wrap"><table class="tbl-tight gy-born">
<thead><tr><th>年齢</th><th class="num">数え年なら</th><th class="num">満年齢なら</th></tr></thead>
<tbody>
${rows.join('\n')}
</tbody>
</table></div>`;
  };
  const faqs = [
    { q: '七五三は数え年と満年齢のどちらでしますか？', a: '<p>明治神宮は、昔は数え年で、いまは満年齢で祝うことが多いとしています。住吉大社や八坂神社のように、どちらでも受け付ける神社もあります。</p>' },
    { q: '男の子は何歳でしますか？', a: '<p>5歳です。明治神宮によると、地方によっては3歳も祝います。3歳の髪置は、神田明神では男の子と女の子の両方の儀式です。</p>' },
    { q: '女の子は何歳でしますか？', a: '<p>3歳と7歳です。</p>' },
    { q: 'きょうだいいっしょにできますか？', a: '<p>年の近いきょうだいは、片方を数え年、もう片方を満年齢にすると同じ年になることがあります。「＋きょうだいを追加」で生年月日を入れると、いっしょにできる年に色がつきます。</p>' },
    { q: '七五三はいつ行きますか？', a: '<p>11月15日がもとの日です。明治神宮は、前後の休みの日など、都合のよい日でよいとしています。</p>' },
    { q: '早生まれの子はどうなりますか？', a: '<p>神社の表は、生まれた年で分けています。このツールも生まれた年で計算します。</p>' },
  ];
  const rest = `
${section(
  'formula',
  '計算のしかた',
  stair(zBox('女の子の生まれた年', `${Y - 3}年`), { b: '＋3年', small: '満年齢で。数え年なら＋2年' }, zBox('3歳の七五三', `${Y}年`, true), ['数え年の◯歳の年 ＝ 生まれた年 ＋ ◯ − 1', '満年齢の◯歳の年 ＝ 生まれた年 ＋ ◯', `例：${Y - 3}年生まれの女の子の3歳は、数え年なら${Y - 1}年、満年齢なら${Y}年です。7歳は、満年齢なら${ex7}年です。`, 'どちらで祝うかは、神社によってちがいます。'], `数え年なら${Y - 1}年・7歳は満年齢で<b class="fz-red">${ex7}年</b>`),
)}

${section('table', `${Y}年と${Y + 1}年の七五三早見表`, `${yearTable(Y)}${yearTable(Y + 1)}`)}
`;
  return out('shichigosan', {
    title: `七五三の計算｜いつするか（数え年・満年齢・きょうだい）と${Y}年の早見表`,
    description: `七五三の年を計算します。${Y - 3}年生まれの女の子は、満年齢なら${Y}年が3歳の七五三で、7歳は${ex7}年です。数え年と満年齢の両方を出し、きょうだいがいっしょにできる年もわかります。`,
    lead: '生年月日から七五三の年を出します。',
    calc,
    rest,
    faqs,
    sources: srcList(SHICHIGOSAN_SOURCES, '年の数え方は、神社によってちがうことがあります。'),
    ld: '子どもの生年月日から、七五三の3歳・5歳・7歳の年を数え年と満年齢で出す計算ツール。',
    script: 'shichigosan.js',
  });
}

/* ---------------- 厄年 ---------------- */
function renderYakudoshi() {
  const ageLabel = (y) => `数え${y.age}歳${y.big ? '<small>大厄</small>' : ''}${y.some ? '<small>一部</small>' : ''}`;
  const yearTable = (y, sex, name) => `<h3>${y}年の${name}の厄年</h3><div class="tbl-wrap"><table class="tbl-tight gy-born">
<thead><tr><th>厄年</th><th class="num">前厄</th><th class="num">本厄</th><th class="num">後厄</th></tr></thead>
<tbody>
${yakuOfYear(y, sex).map((r) => `<tr><td>${ageLabel(r)}</td><td class="num">${born(r.mae)}</td><td class="num">${born(r.hon)}</td><td class="num">${born(r.ato)}</td></tr>`).join('\n')}
</tbody>
</table></div>`;
  const m = yakuOfYear(Y, 'male');
  const f = yakuOfYear(Y, 'female');
  const calc = `  <div class="box-rows">
    ${boxField('year', '生まれた年', '年', '1985')}
    ${sexSeg('f-sex', '性別', ['male', '男性'], ['female', '女性'])}
  </div>
  <div class="slip" aria-live="polite">
    <p class="slip-title"><span>厄年<small id="r-this">${Y}年</small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <p class="slip-sum"><span class="slip-k" id="r-cap">今年は</span><span class="slip-v"><b id="r-num">？</b></span></p>
    <p class="pc-say" id="r-say"></p>
    <div class="yk-line" id="r-line" aria-hidden="true"></div>
    <table class="rk-table gy-table"><thead><tr><th class="rk-y">厄年</th><th>前厄</th><th>本厄</th><th>後厄</th></tr></thead><tbody id="r-rows"></tbody></table>
    <p class="slip-foot" id="r-foot">生まれた年を入れてください</p>
  </div>`;
  const faqs = [
    { q: '厄年は何歳ですか？', a: '<p>数え年で、男性は25歳・42歳・61歳、女性は19歳・33歳・37歳です（明治神宮・日枝神社）。男性の42歳と女性の33歳は大厄といいます。</p>' },
    { q: '数え年はどう数えますか？', a: `<p>生まれた年を1歳として、元日ごとに1つ上がります。${Y}年の数え年は「${Y} − 生まれた年 ＋ 1」です。</p>` },
    { q: '前厄と後厄とは？', a: '<p>本厄の前の年が前厄、次の年が後厄です。</p>' },
    { q: '女性の61歳は厄年ですか？', a: '<p>生田神社や成田山新勝寺のように、女性の61歳を厄年とする所があります。成田山は37歳を入れていないなど、神社やお寺でちがいます。</p>' },
    { q: '年の区切りは元日ですか、節分ですか？', a: '<p>太宰府天満宮は、元日をむかえるごとに1つ上がると書いています。厄除けは節分のころにする所もあるので、日にちは神社やお寺に確かめてください。</p>' },
    { q: '和暦の生まれ年しかわかりません', a: '<p><a href="/wareki/">和暦・西暦の変換</a>で西暦にしてから入れてください。下の早見表には和暦も書いています。</p>' },
  ];
  const rest = `
${section(
  'formula',
  '計算のしかた',
  stair(zBox('男性・生まれた年', `${Y - 41}年`), { b: '数え42歳', small: '生まれた年を1歳と数える' }, zBox('本厄（大厄）', `${Y}年`, true), ['数え年 ＝ 今年 − 生まれた年 ＋ 1', '本厄の年 ＝ 生まれた年 ＋ 厄年の歳 − 1', `例：${Y - 41}年生まれの男性は、${Y}年に数え42歳で本厄（大厄）です。前厄は${Y - 1}年、後厄は${Y + 1}年です。`, '厄年の歳は、神社やお寺によってちがうことがあります。'], `前厄 ${Y - 1}年・後厄 ${Y + 1}年`),
)}

${section(
  'table',
  `${Y}年と${Y + 1}年の厄年早見表`,
  `${yearTable(Y, 'male', '男性')}${yearTable(Y, 'female', '女性')}${yearTable(Y + 1, 'male', '男性')}${yearTable(Y + 1, 'female', '女性')}
<p class="note">女性の61歳は、神社やお寺でちがいます。</p>`,
)}
`;
  return out('yakudoshi', {
    title: `厄年の計算｜${Y}年の厄年早見表（男性・女性の前厄・本厄・後厄）`,
    description: `厄年を計算します。${Y}年の本厄は、男性が${m.map((r) => r.hon).join('・')}年生まれ、女性が${f.filter((r) => !r.some).map((r) => r.hon).join('・')}年生まれです。生まれた年から数え年で前厄・本厄・後厄を出し、${Y + 1}年の早見表もあります。`,
    lead: '生まれた年から厄年を出します。',
    calc,
    rest,
    faqs,
    sources: srcList(YAKU_SOURCES, '厄年の歳は、神社やお寺によってちがうことがあります。'),
    ld: '生まれた年と性別から、数え年の厄年（前厄・本厄・後厄）の年を出す計算ツール。',
    script: 'yakudoshi.js',
  });
}

/* ---------------- 長寿祝い ---------------- */
function renderChoju() {
  const now = chojuOfYear(Y);
  const kan = now[0];
  const koki = now.find((c) => c.name === '古希');
  const calc = `  <div class="box-rows">
    ${boxField('year', '生まれた年', '年', '1966')}
  </div>
  <div class="slip" aria-live="polite">
    <p class="slip-title"><span>長寿祝い</span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <p class="slip-sum"><span class="slip-k" id="r-cap">次のお祝い</span><span class="slip-v"><b id="r-num">？</b></span></p>
    <p class="pc-say" id="r-say"></p>
    <table class="rk-table gy-table"><thead><tr><th class="rk-y">お祝い</th><th>数え年で</th><th>満年齢で</th></tr></thead><tbody id="r-rows"></tbody></table>
    <p class="slip-foot" id="r-foot">生まれた年を入れてください</p>
  </div>`;
  const list = CHOJU.map((c) => `<tr><td>${c.name}<small>${c.yomi}</small></td><td class="num">${c.kazoe}歳</td><td class="num">${c.kazoe === 61 ? 60 : c.kazoe}歳</td></tr>`).join('\n');
  const thisYear = now.map((c) => `<tr><td>${c.name}</td><td class="num">${born(c.kazoeBorn)}</td><td class="num">${born(c.manBorn)}</td></tr>`).join('\n');
  const faqs = [
    { q: '還暦は何歳ですか？', a: '<p>満60歳で、数え年では61歳です。どちらで数えても同じ年になります。</p>' },
    { q: '長寿祝いは数え年と満年齢のどちらですか？', a: '<p>国立国会図書館のレファレンス協同データベースには、長寿祝いは数え年で祝うと書く資料が多いとあります。高島屋は、いまは満年齢で祝うことも多いとしています。</p>' },
    { q: '古希・喜寿・米寿は何歳ですか？', a: '<p>数え年で、古希は70歳、喜寿は77歳、傘寿は80歳、米寿は88歳です。卒寿は90歳、白寿は99歳、百寿は100歳です。</p>' },
    { q: '緑寿とは？', a: '<p>66歳のお祝いです。載せていない資料もあります。</p>' },
    { q: '茶寿と皇寿は何歳ですか？', a: '<p>数え年で、茶寿は108歳、皇寿は111歳です。</p>' },
  ];
  const rest = `
${section(
  'formula',
  '計算のしかた',
  stair(zBox('生まれた年', `${Y - 60}年`), { b: '＋60年', small: '満60歳・数え61歳は同じ年' }, zBox('還暦', `${Y}年`, true), ['数え年で祝う年 ＝ 生まれた年 ＋ 歳 − 1', '満年齢で祝う年 ＝ 生まれた年 ＋ 歳', `例：${Y - 60}年生まれの人は、${Y}年が還暦です。古希は数え年なら${Y - 60 + 69}年、満年齢なら${Y - 60 + 70}年です。`, '数え年で祝うか満年齢で祝うかは、資料によってちがいます。'], `古希は数え年なら${Y - 60 + 69}年・満年齢なら${Y - 60 + 70}年`),
)}

${section(
  'list',
  '長寿祝いの一覧',
  `<div class="tbl-wrap"><table class="tbl-tight gy-born">
<thead><tr><th>お祝い</th><th class="num">数え年</th><th class="num">満年齢</th></tr></thead>
<tbody>
${list}
</tbody>
</table></div>`,
)}

${section(
  'table',
  `${Y}年の長寿祝い早見表`,
  `<div class="tbl-wrap"><table class="tbl-tight gy-born">
<thead><tr><th>お祝い</th><th class="num">数え年なら</th><th class="num">満年齢なら</th></tr></thead>
<tbody>
${thisYear}
</tbody>
</table></div>`,
)}
`;
  return out('choju', {
    title: `長寿祝いの計算｜還暦・古希・喜寿・米寿は何年か（${Y}年の早見表）`,
    description: `長寿祝いの年を計算します。${Y}年の還暦は${kan.kazoeBorn}年生まれ、古希は数え年なら${koki.kazoeBorn}年生まれです。還暦・古希・喜寿・米寿など${CHOJU.length}のお祝いの年を、数え年と満年齢の両方で出します。`,
    lead: '生まれた年から長寿祝いの年を出します。',
    calc,
    rest,
    faqs,
    sources: srcList(CHOJU_SOURCES, '数え年で祝うか満年齢で祝うかは、資料によってちがいます。'),
    ld: '生まれた年から、還暦・古希・喜寿・米寿などの長寿祝いの年を数え年と満年齢で出す計算ツール。',
    script: 'choju.js',
  });
}

/* ---------------- お食い初め ---------------- */
function renderOkuizome() {
  const ex = okuizome(`${Y}-01-01`);
  const rows = Array.from({ length: 12 }, (_, i) => {
    const o = okuizome(`${Y}-${String(i + 1).padStart(2, '0')}-01`);
    return `<tr><td>${i + 1}月1日</td><td class="num">${o.d100.y === Y ? '' : `${o.d100.y}年`}${md(o.d100)}</td><td class="num">${o.d120.y === Y ? '' : `${o.d120.y}年`}${md(o.d120)}</td></tr>`;
  }).join('\n');
  const calc = `  <div class="box-rows">
    ${dateField('birth', '生年月日')}
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title"><span>お食い初め</span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="pic-row">
      <div class="cal" aria-hidden="true"><p class="cal-ym" id="c-ym">—</p><p class="cal-d" id="c-d">？</p><p class="cal-w" id="c-w"></p></div>
      <div class="pic-side">
        <p class="slip-k">生まれた日から</p>
        <p class="slip-v"><b>100</b><small>日目</small></p>
        <p class="pc-say" id="r-say"></p>
      </div>
    </div>
    <table class="gy-kv"><tbody>
      <tr><th>前の土日</th><td id="d-before">—</td></tr>
      <tr><th>あとの土日</th><td id="d-after">—</td></tr>
      <tr><th>120日目</th><td id="d-120">—</td></tr>
      <tr><th>生後100日</th><td id="d-100b">—</td></tr>
    </tbody></table>
    <p class="slip-foot" id="r-foot">生年月日を入れてください</p>
  </div>`;
  const faqs = [
    { q: 'お食い初めはいつですか？', a: '<p>生後100日ごろです（農林水産省・水戸市）。日枝神社や大阪小児科医会のように、120日目も書いている所があります。</p>' },
    { q: '生まれた日は数えますか？', a: '<p>このツールは、生まれた日を1日目に数えた100日目を大きく出します。生まれた日を0日目に数える方法もあり、その日は表の「生後100日」です。</p>' },
    { q: '100日目が平日のときは？', a: '<p>生後100日ごろの行事なので、表の前後の土日も目安にしてください。</p>' },
    { q: '何日後ですか？', a: `<p>生まれた日を1日目に数えた100日目は、生まれた日の99日後です。${Y}年1月1日生まれなら${md(ex.d100)}です。</p>` },
  ];
  const rest = `
${section(
  'formula',
  '計算のしかた',
  stair(zCal(`${Y}年1月`, 1, '生まれた日＝1日目'), { b: '＋99日', small: '生まれた日を1日目に数える' }, calOf(ex.d100, `${weekdayOf(ex.d100)}曜日・100日目`, true), ['100日目 ＝ 生まれた日 ＋ 99日', '120日目 ＝ 生まれた日 ＋ 119日', `例：${Y}年1月1日生まれなら、100日目は${md(ex.d100)}、120日目は${md(ex.d120)}です。`, '日にちの数え方は、地域や家によってちがうことがあります。']),
)}

${section(
  'table',
  `${Y}年生まれのお食い初め早見表`,
  `<div class="tbl-wrap"><table class="tbl-tight">
<thead><tr><th>生まれた日</th><th class="num">100日目</th><th class="num">120日目</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
<p class="note">ほかの日は上で計算できます。</p>`,
)}
`;
  return out('okuizome', {
    title: 'お食い初めの計算｜100日目はいつか（生まれた日から数える）',
    description: `お食い初めの日を計算します。${Y}年1月1日生まれなら、生まれた日を1日目に数えた100日目は${md(ex.d100)}です。120日目と前後の土日、生まれた日を0日目に数えた日もわかります。`,
    lead: '生年月日から100日目の日を出します。',
    calc,
    rest,
    faqs,
    sources: srcList(OKUIZOME_SOURCES, '日にちの数え方は、地域や家によってちがうことがあります。'),
    ld: '赤ちゃんの生年月日から、お食い初め（百日祝い）の100日目・120日目と前後の土日を出す計算ツール。',
    script: 'okuizome.js',
  });
}

/* ---------------- 四十九日 ---------------- */
function renderShijuku() {
  const ex = shijuku(`${Y}-10-01`);
  const calc = `  <div class="box-rows">
    ${dateField('death', '亡くなった日')}
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title"><span>四十九日</span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="pic-row">
      <div class="cal cal-calm" aria-hidden="true"><p class="cal-ym" id="c-ym">—</p><p class="cal-d" id="c-d">？</p><p class="cal-w" id="c-w"></p></div>
      <div class="pic-side">
        <p class="slip-k">亡くなった日から</p>
        <p class="slip-v"><b>49</b><small>日目</small></p>
        <p class="pc-say" id="r-say"></p>
      </div>
    </div>
    <table class="rk-table gy-table"><thead><tr><th class="rk-y">法要</th><th>日にち</th></tr></thead><tbody id="r-rows"></tbody></table>
    <p class="slip-foot" id="r-foot">亡くなった日を入れてください</p>
  </div>
  <div class="calc-tools"><button type="button" class="tool-btn" id="t-taiya" aria-pressed="false">前の日から数える</button></div>`;
  const faqs = [
    { q: '四十九日はどう数えますか？', a: '<p>亡くなった日を1日目に数えて、49日目です（天台宗・浄土真宗本願寺派）。亡くなった日の48日後になります。</p>' },
    { q: '前の日から数えるのは？', a: '<p>浄土宗の中陰表には、命日の前の夜から数える逮夜の数え方もあり、地域でちがうと書かれています。「前の日から数える」を押すと、初七日から四十九日を1日早い日で出します。</p>' },
    { q: '一周忌と三回忌はいつですか？', a: '<p>一周忌は亡くなった1年後、三回忌は2年後です。七回忌は6年後で、◯回忌は亡くなった年の「◯ − 1」年後です（天台宗・浄土宗）。</p>' },
    { q: '法要の日は、この日でなければいけませんか？', a: '<p>数え方は宗派や地域でちがいます。日にちは、お寺に確かめてください。</p>' },
  ];
  const chuinRows = CHUIN.map((name, i) => `<tr><td>${name}</td><td class="num">${(i + 1) * 7}日目</td><td class="num">${(i + 1) * 7 - 1}日後</td></tr>`).join('\n');
  const nenkiRows = NENKI.map((n) => `<tr><td>${n.name}</td><td class="num">${n.years}年後</td><td class="num">${ex.death.y + n.years}年</td></tr>`).join('\n');
  const rest = `
${section(
  'formula',
  '計算のしかた',
  `<div class="fz-calm-f">${stair(zCal(`${Y}年10月`, 1, '亡くなった日＝1日目', false, true), { b: '＋48日', small: '亡くなった日を1日目に数える' }, calOf(ex.day49, `${weekdayOf(ex.day49)}曜日・四十九日`, true, true), ['四十九日 ＝ 亡くなった日 ＋ 48日', '◯回忌 ＝ 亡くなった年 ＋（◯ − 1）年', `例：${Y}年10月1日に亡くなったときは、初七日が${md(ex.chuin[0].date)}、四十九日が${md(ex.day49)}です。`, '数え方は、宗派や地域によってちがいます。'])}</div>`,
)}

${section(
  'table',
  '法要の数え方',
  `<div class="tbl-wrap"><table class="tbl-tight">
<thead><tr><th>法要</th><th class="num">何日目</th><th class="num">亡くなった日の</th></tr></thead>
<tbody>
${chuinRows}
</tbody>
</table></div>
<div class="tbl-wrap"><table class="tbl-tight">
<thead><tr><th>年忌</th><th class="num">亡くなって</th><th class="num">${ex.death.y}年に亡くなったら</th></tr></thead>
<tbody>
${nenkiRows}
</tbody>
</table></div>`,
)}
`;
  return out('shijukunichi', {
    title: '四十九日の計算｜数え方と法要の日（初七日・一周忌・三回忌）',
    description: `四十九日の日を計算します。${Y}年10月1日に亡くなったときは、四十九日は${md(ex.day49)}です。亡くなった日を1日目に数え、初七日から四十九日、一周忌から三十三回忌までの日を出します。`,
    lead: '亡くなった日から法要の日を出します。',
    calc,
    rest,
    faqs,
    sources: srcList(SHIJUKU_SOURCES, '数え方は、宗派や地域によってちがいます。'),
    ld: '亡くなった日から、初七日から四十九日までの法要と、一周忌から三十三回忌までの年忌の日を出す計算ツール。',
    script: 'shijuku.js',
  });
}

export default function render() {
  return [renderShichigosan(), renderYakudoshi(), renderChoju(), renderOkuizome(), renderShijuku()];
}
