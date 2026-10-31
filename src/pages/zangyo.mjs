// 残業代の2つのページ（10/20 しょーくんがえらんで追加）。計算は src/lib/zangyo.mjs
// 残業代の計算（時給から）がもとのページで、月給の残業代の計算（月給・年間休日・1日の所定時間から時給を出す）は、その下のページ
// （10/20 しょーくん「希釈率の使いみち別みたいに、時給がベースで月給をサブページに。項目が少ないほうが入力しやすい」）。
// 2つのページは、いちばん上の段の大きなボタン（月給から計算・時給から計算）で行き来できる
// ページに載せる計算例は tests/zangyo.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { stair, band, zBox } from '../zukai.mjs';
import { zangyo, zangyoUnit, zangyoWage } from '../lib/zangyo.mjs';
import { fmt } from '../lib/number.mjs';

// 図解（#83）：時給の残業代と、月給から時給を出す絵の式・帯の図。数字は tests/zukai-shigoto.test.mjs
const ZD_UNIT = zangyoUnit(1200, 1.25);
const ZD_TOTAL = zangyo({ wage: 1200, over: 10, night: null, holiday: null }).total;
const ZG = zangyoWage({ salary: 300000, holidays: 120, daily: 8 });
const ZG_TOTAL = zangyo({ wage: ZG.wage, over: 20, night: null, holiday: null }).total;
const ZG_H = fmt(Math.round(ZG.monthHours * 10) / 10, 1);
export const Z_ZANGYO = { unit: ZD_UNIT, total: ZD_TOTAL, wage: ZG.wage, hours: ZG_H, gTotal: ZG_TOTAL };
const ZD_ZUKAI = stair(zBox('時給1,200円', '残業10時間'), { b: '× 1.25 × 10', small: `1時間 ${fmt(ZD_UNIT)}円` }, zBox('残業代', `${fmt(ZD_TOTAL)}円`, true), ['残業代 ＝ 時給 × 1.25 × 残業の時間', '深夜の上乗せ ＝ 時給 × 0.25 × 深夜の時間', '休日の分 ＝ 時給 × 1.35 × 休日の時間', `例：時給1,200円で残業10時間なら、1時間は 1,200 × 1.25 ＝ ${fmt(ZD_UNIT)}円で、10時間で${fmt(ZD_TOTAL)}円です。`]);
const ZD_BAND = band({ head: `残業1時間 ${fmt(ZD_UNIT)}円`, parts: [{ w: 80, text: '時給 1,200円' }, { w: 20, kind: 'off', text: '25％' }], ruler: [[0, '0'], [80, '1,200'], [100, fmt(ZD_UNIT), true]], ans: `割増は${fmt(ZD_UNIT - 1200)}円 → 1時間 <b>${fmt(ZD_UNIT)}円</b>`, label: `残業1時間${fmt(ZD_UNIT)}円の帯を、時給1,200円と割増25％の${fmt(ZD_UNIT - 1200)}円に分けた図` });
const ZG_ZUKAI = stair(zBox('月給30万円の1か月', `${ZG_H}時間`), { b: `÷ ${ZG_H}`, small: '（365 − 120）× 8 ÷ 12' }, zBox('時給', `${fmt(ZG.wage)}円`, true), ['時給 ＝ 月給 ÷ 1か月の所定時間', '1か月の所定時間 ＝（365 − 年間休日）× 1日の所定時間 ÷ 12', '残業代 ＝ 時給 × 1.25 × 残業の時間', `例：月給30万円・年間休日120日・1日8時間なら、1か月は${ZG_H}時間で、時給は${fmt(ZG.wage)}円です。残業1時間は ${fmt(ZG.wage)} × 1.25 ＝ ${fmt(zangyoUnit(ZG.wage, 1.25))}円で、20時間なら${fmt(ZG_TOTAL)}円です。`], `残業20時間なら <b class="fz-red">${fmt(ZG_TOTAL)}円</b>`);
const ZG_BAND = band({ head: '1年 365日', parts: [{ w: Number(((245 / 365) * 100).toFixed(2)), text: '出勤 245日' }, { w: Number(((120 / 365) * 100).toFixed(2)), kind: 'alt', text: '休日 120日' }], ruler: [[0, '0'], [100, '365日']], ans: `245日 × 8時間 ÷ 12 → 1か月 <b>${ZG_H}時間</b>`, label: `1年365日の帯を、出勤245日と年間休日120日に分けた図` });

// 割増の率・時給の出し方・のぞく手当・端数の出典（厚生労働省）
const SRC_RATE = 'https://www.check-roudou.mhlw.go.jp/qa/roudousya/chingin/q3.html';
const SRC_ROUND = 'https://www.startup-roudou.mhlw.go.jp/qa/zigyonushi/chingin/q2.html';
const SRC_60 = 'https://www.mhlw.go.jp/topics/2008/12/dl/tp1216-1l-02.pdf';

// 2つのページで同じ部品：残業・深夜・休日の時間（単位は名前の右）と、結果の書類（残業代明細書）
// 書類は、題・クリア・いちばん大きな残業代（二重線）・時給の行・明細の表（時間外・深夜割増・休日出勤。60時間をこえたら60時間超の行）
// 名前だけでは迷う欄は、さわっている間だけ1行の説明を出す（よくある質問の答えと同じ中身）
const TRIO = `<div class="trio">${boxField('over', '残業', '時間', '20', '', '1日8時間・週40時間をこえた時間')}${boxField('night', '深夜', '時間', '0', '', '夜10時〜朝5時の時間。残業の分も入れます')}${boxField('holiday', '休日', '時間', '0', '', '法定休日（週1日の休み）にはたらいた時間')}</div>`;
const doc = (info) => `<div class="doc" aria-live="polite">
    <p class="doc-title">残業代明細書</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k">残業代</span><span class="doc-sum-v"><b id="r-num">？</b>円</span></p>
    ${info}
    <table class="doc-table"><thead><tr><th>項目</th><th>時間</th><th>単価</th><th>金額</th></tr></thead><tbody id="slip"></tbody></table>
    <p class="doc-foot"><span id="r-foot"></span><span id="r-extra"></span></p>
  </div>`;
const tail = (tool) => `<p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool, false)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>`;
const ROUND_TEXT = '<p>1時間あたりの残業代と、それぞれの金額は、1円未満を四捨五入しています。厚生労働省が認めている端数の処理です。</p>';

const FAQ_HOURS = {
  q: '残業の時間には何を入れますか？',
  a: '<p>1日8時間か、1週40時間をこえてはたらいた時間です。会社の決まりが1日7時間なら、8時間までの1時間は割増にならないことがあります。</p>',
};
const FAQ_MINUTES = {
  q: '20時間30分はどう入れますか？',
  a: '<p>20.5と入れてください。15分は0.25、45分は0.75です。</p>',
};

const PAGES = [
  {
    slug: 'zangyo-dai',
    title: '残業代の計算｜時給と残業時間から割増賃金を出す',
    description:
      '残業代を、時給と残業の時間から計算します。時給1,200円で残業10時間なら、1時間1,500円で15,000円です。60時間をこえた分・深夜・休日の割増もわかり、月給の人は月給と年間休日から計算できます。',
    lead: '時給と残業の時間から、残業代を計算します。',
    ld: '時給と残業・深夜・休日の時間から、残業代（割増賃金）を出す計算ツール。',
    script: 'zangyo.js',
    calc: `<div class="calc" id="calc">
  <div class="box-rows">
    <div class="box-row-link">${boxField('wage', '時給', '円', '1,200')}<a class="wide-btn" href="/zangyo-gekkyu/">月給から計算</a></div>
    ${TRIO}
  </div>
  ${doc('<p class="doc-info"><span id="r-wage"></span><span id="r-unit"></span></p>')}
  ${tail(toolBySlug('zangyo-dai'))}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `${ZD_ZUKAI}
<p>1日8時間か1週40時間をこえてはたらいた分は、ふだんの時給に割増の率をかけて払う決まりです。残業の割増は25％なので、時給に1.25をかけると残業1時間の額になります。深夜は時間帯への上乗せなので、残業の1.25とは別に0.25を足します。例：時給1,050円で残業15時間なら、1時間は1,050 × 1.25 ＝ 1,312.5円で、四捨五入して1,313円です。15時間では19,695円になります。</p>
${ROUND_TEXT}`,
    )}

${section(
  'rates',
  '割増の率',
  `<div class="tbl-wrap"><table>
<thead><tr><th>はたらいた時間</th><th class="num">割増</th></tr></thead>
<tbody>
<tr><td>残業</td><td class="num">25％</td></tr>
<tr><td>残業のうち、1か月60時間をこえた分</td><td class="num">50％</td></tr>
<tr><td>深夜（夜10時〜朝5時）</td><td class="num">25％</td></tr>
<tr><td>法定休日</td><td class="num">35％</td></tr>
<tr><td>深夜の残業</td><td class="num">50％</td></tr>
<tr><td>60時間をこえた深夜の残業</td><td class="num">75％</td></tr>
<tr><td>法定休日の深夜</td><td class="num">60％</td></tr>
</tbody>
</table></div>
<p>法律で決まった最低の率です。会社の決まりで、これより高いこともあります。</p>
<p>出典：割増の率は<a href="${SRC_RATE}">厚生労働省の労働条件のQ&amp;A</a>、端数は<a href="${SRC_ROUND}">厚生労働省のスタートアップ労働条件</a>、60時間の数え方は<a href="${SRC_60}">厚生労働省のリーフレット</a>です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `${ZD_BAND}<h3>時給ごとの、1時間あたりの残業代</h3>
<div class="tbl-wrap"><table>
<thead><tr><th>時給</th><th class="num">残業</th><th class="num">深夜の残業</th><th class="num">休日</th></tr></thead>
<tbody>
<tr><td>1,000円</td><td class="num">1,250円</td><td class="num">1,500円</td><td class="num">1,350円</td></tr>
<tr><td>1,100円</td><td class="num">1,375円</td><td class="num">1,650円</td><td class="num">1,485円</td></tr>
<tr><td>1,200円</td><td class="num">1,500円</td><td class="num">1,800円</td><td class="num">1,620円</td></tr>
<tr><td>1,500円</td><td class="num">1,875円</td><td class="num">2,250円</td><td class="num">2,025円</td></tr>
</tbody>
</table></div>
<h3>残業の時間ごとの残業代</h3>
<div class="tbl-wrap"><table>
<thead><tr><th>残業の時間</th><th class="num">残業代</th></tr></thead>
<tbody>
<tr><td>10時間</td><td class="num">15,000円</td></tr>
<tr><td>20時間</td><td class="num">30,000円</td></tr>
<tr><td>45時間</td><td class="num">67,500円</td></tr>
<tr><td>80時間</td><td class="num">126,000円</td></tr>
</tbody>
</table></div>
<p>時給1,200円のときです。80時間は、60時間をこえた20時間が50％増しです。</p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>時給1,100円のパートで、1か月の残業が12時間、そのうち3時間が夜10時をすぎていたとき。残業の欄に12、深夜の欄に3を入れます。残業の分が16,500円、深夜の上乗せが825円で、合わせて17,325円です。</p>
<p>時給1,300円で、法定休日に8時間はたらいたとき。休日の欄に8を入れると、1時間は1,755円で、8時間で14,040円です。</p>
<p>時給1,000円で、1か月の残業が70時間になったとき。60時間までは1時間1,250円で75,000円、こえた10時間は1時間1,500円で15,000円です。合わせて90,000円になります。毎日の残業を足して1か月の時間にするには、<a href="/jikan/">時間の計算</a>が使えます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>30分を0.30と入れる</h3>
<p>20時間30分を20.30と入れると、20時間18分として計算します。時給1,200円なら、20.5と入れたときの30,750円より300円少ない30,450円です。</p>
<h3>深夜の残業を、深夜の欄だけに入れる</h3>
<p>時給1,200円で、夜10時すぎの残業が2時間なら、残業と深夜の両方に2を入れて3,600円です。深夜の欄だけだと上乗せの600円しか出ず、3,000円少なくなります。</p>
<h3>土曜の出勤を、休日の欄に入れる</h3>
<p>週5日・1日8時間で、日曜が法定休日の会社のとき。休みの土曜に8時間はたらいた分は、法定休日ではないので残業です。時給1,200円なら残業の12,000円が正しく、休日の欄に入れると35％増しの12,960円になって、960円多く出ます。</p>`,
)}`,
    faqs: [
      FAQ_HOURS,
      {
        q: 'パートやアルバイトも割増になりますか？',
        a: '<p>なります。1日8時間か1週40時間をこえた分は、時給の25％増しです。</p>',
      },
      {
        q: '深夜の残業はどう入れますか？',
        a: '<p>残業と深夜の両方に入れてください。夜10時から朝5時までの残業は、25％と25％で50％増しになります。</p>',
      },
      {
        q: '休日には何を入れますか？',
        a: '<p>法律で決まった週1日の休み（法定休日）にはたらいた時間です。土曜など、ほかの休みの日にはたらいた時間は残業に入れます。</p>',
      },
      {
        q: '60時間をこえるとどうなりますか？',
        a: '<p>1か月の残業が60時間をこえた分は、50％増しです。2023年4月からは中小企業も同じで、休日の時間は60時間に入れません。</p>',
      },
      FAQ_MINUTES,
      {
        q: '時給1,000円の残業1時間はいくらですか？',
        a: '<p>1,250円です。夜10時から朝5時までの残業なら、1,500円です。</p>',
      },
      {
        q: '月給のときはどうしますか？',
        a: '<p><a href="/zangyo-gekkyu/">月給の残業代の計算</a>で、月給と年間休日と1日の所定時間から時給を出して計算できます。</p>',
      },
    ],
  },
  {
    slug: 'zangyo-gekkyu',
    title: '月給の残業代の計算｜月給と年間休日から時給と残業代を出す',
    description:
      '月給の人の残業代を計算します。月給30万円・年間休日120日・1日8時間なら時給は1,837円で、残業20時間なら45,920円です。深夜・休日と、60時間をこえた分の割増も計算します。',
    lead: '月給から時給を出して、残業代を計算します。',
    ld: '月給・年間休日・1日の所定時間から時給を出し、残業・深夜・休日の時間から残業代（割増賃金）を出す計算ツール。',
    script: 'zangyo-gekkyu.js',
    calc: `<div class="calc" id="calc">
  <div class="box-rows">
    <div class="box-row-link">${boxField('salary', '月給', '円', '300,000', '', '基本給と手当。通勤手当や家族手当はのぞく')}<a class="wide-btn" href="/zangyo-dai/">時給から計算</a></div>
    <div class="pair">${boxField('holidays', '年間休日', '日', '120', '', '1年の休みの日数。土日と祝日なら約120日')}${boxField('daily', '1日の所定時間', '時間', '8', '', '休けいをのぞいた、会社で決まった時間')}</div>
    ${TRIO}
  </div>
  ${doc(`<p class="doc-info"><span id="y-left">出勤</span><span id="y-right">休日</span></p>
    <div class="year-track" aria-hidden="true"><div class="year-work" id="y-work"></div><div class="year-off"></div></div>
    <p class="doc-info"><span id="r-hours"></span><span id="r-unit"></span></p>`)}
  ${tail(toolBySlug('zangyo-gekkyu'))}
</div>`,
    body: `${section(
      'formula',
      '計算式',
      `${ZG_ZUKAI}
<p>時給も1円未満を四捨五入しています。深夜や休日の割増の率は、<a href="/zangyo-dai/">残業代の計算</a>の表にあります。</p>
<p>出典：時給の出し方と、月給に入れない手当は<a href="${SRC_RATE}">厚生労働省の労働条件のQ&amp;A</a>、端数は<a href="${SRC_ROUND}">厚生労働省のスタートアップ労働条件</a>です。</p>`,
    )}

${section(
  'examples',
  '計算例',
  `${ZG_BAND}<h3>年間休日ごとの、1か月の所定時間と時給</h3>
<div class="tbl-wrap"><table>
<thead><tr><th>年間休日</th><th class="num">1か月</th><th class="num">時給</th></tr></thead>
<tbody>
<tr><td>105日</td><td class="num">173.3時間</td><td class="num">1,731円</td></tr>
<tr><td>110日</td><td class="num">170時間</td><td class="num">1,765円</td></tr>
<tr><td>120日</td><td class="num">163.3時間</td><td class="num">1,837円</td></tr>
<tr><td>125日</td><td class="num">160時間</td><td class="num">1,875円</td></tr>
</tbody>
</table></div>
<p>月給30万円・1日8時間のときです。休みが多いほど1か月の時間が短くなり、時給と残業代は上がります。</p>
<h3>月給ごとの時給と、残業1時間の残業代</h3>
<div class="tbl-wrap"><table>
<thead><tr><th>月給</th><th class="num">時給</th><th class="num">残業1時間</th></tr></thead>
<tbody>
<tr><td>20万円</td><td class="num">1,224円</td><td class="num">1,530円</td></tr>
<tr><td>25万円</td><td class="num">1,531円</td><td class="num">1,914円</td></tr>
<tr><td>30万円</td><td class="num">1,837円</td><td class="num">2,296円</td></tr>
<tr><td>40万円</td><td class="num">2,449円</td><td class="num">3,061円</td></tr>
</tbody>
</table></div>
<p>年間休日120日・1日8時間のときです。</p>`,
)}`,
    faqs: [
      {
        q: '月給には何を入れますか？',
        a: '<p>基本給と、毎月出る手当を足した額です。家族手当・通勤手当・住宅手当などと、ボーナスは入れません。</p>',
      },
      {
        q: 'なぜ年間休日が要るのですか？',
        a: '<p>1か月にはたらく時間は月ごとに違うので、1年の平均で時給を出すためです。休みが多いほど時給が高くなり、残業代も上がります。</p>',
      },
      {
        q: '年間休日はどこでわかりますか？',
        a: '<p>求人票や就業規則、会社のカレンダーに書いてあります。土日と祝日が休みなら、1年でおよそ120日です。</p>',
      },
      {
        q: '1日の所定時間には何を入れますか？',
        a: '<p>会社で決まっている1日の労働時間で、休けいはのぞきます。9時から18時で休けいが1時間なら、8時間です。</p>',
      },
      FAQ_HOURS,
      FAQ_MINUTES,
      {
        q: '固定残業代があるときは？',
        a: '<p>固定残業代をのぞいた月給で計算してください。出た残業代が固定残業代より多いときは、その差額も受け取れます。</p>',
      },
    ],
  },
];

export default function render() {
  const base = toolBySlug('zangyo-dai');
  return PAGES.map((p) => {
    const tool = toolBySlug(p.slug);
    const path = `/${tool.slug}/`;
    const body = `
<h1>${tool.name}</h1>
<p class="lead">${p.lead}</p>

${p.calc}

${p.body}

${section('faq', 'よくある質問', faqHtml(p.faqs))}

${relatedHtml(tool)}
`;
    const breadcrumbs = [{ name: 'ホーム', path: '/' }];
    if (tool.parent) breadcrumbs.push({ name: base.name, path: `/${base.slug}/` });
    breadcrumbs.push({ name: tool.name, path });
    const html = page({
      path,
      title: p.title,
      description: p.description,
      breadcrumbs,
      jsonLd: [toolLd(tool, p.ld), faqLd(p.faqs)],
      theme: themeOf(tool),
      ogImage: `/og/${tool.slug}.png`,
      scripts: [p.script],
      body,
    });
    return { path, html, sitemap: true, updated: tool.updated };
  });
}
