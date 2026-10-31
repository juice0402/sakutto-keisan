// 有給休暇の付与日数の計算（10/27 夜の作業 #61）：入社日・週の所定労働日数・計算する日（はじめは今日）から、
// いまもらっている日数・次の付与日と日数・いまの分の期限（2年の時効）・年5日の取得義務の対象か
// 結果は書類（大きな「いまの日数」、勤続の階段＝年ごとの付与日数の段で、いまの段に赤ペンの丸、次の付与・期限・年5日の表）
// 表は厚生労働省（千葉労働局のリーフレット）と同じ。ページに載せる計算例は tests/yukyu.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { dateField } from '../fields.mjs';
import { stair, zCal } from '../zukai.mjs';
import { weekdayOf } from '../lib/hizuke.mjs';
import { YUKYU_TABLE, YUKYU_WEEKS, YUKYU_STEPS, YUKYU_STEP_LONG, YUKYU_SRC, yukyuFuyo, yukyuDateText } from '../lib/yukyu.mjs';

const tool = toolBySlug('yukyu-fuyo');
const path = '/yukyu-fuyo/';

// 週の所定労働日数のマス（はじめは週5日以上。えらんだしるしは、さわってから）
const TILES = `<div class="tiles tiles-5" role="group" aria-label="週の所定労働日数">${YUKYU_WEEKS.map(
  (w) => `<button type="button" class="tile" data-week="${w.week}" aria-pressed="${w.week === 5}"><b>${w.name}</b><small>${w.sub}</small></button>`,
).join('')}</div>`;

// 勤続の階段（段の高さは付与日数。はじめは週5日以上の日数）
const STEPS = `<div class="yk-steps" aria-hidden="true">${YUKYU_TABLE[5].map(
  (d, i) => `<div class="yk-step" id="yk-${i}" style="--h:${(d / 20) * 100}%"><b class="yk-num">${d}</b><span class="yk-bar"></span></div>`,
).join('')}</div><p class="yk-labels" aria-hidden="true">${YUKYU_STEPS.map((s) => `<span>${s}</span>`).join('')}</p>`;

// 計算例（説明文・計算のしかた・よくある質問）
const EX = yukyuFuyo({ hire: '2026-04-01', on: '2026-10-01', week: 5 });
const md = ({ m, d }) => `${m}月${d}日`;
// 図解（#83）：入社日 → 6か月後に付与の流れの図。数字は tests/zukai-shigoto.test.mjs
export const Z_YUKYU = { date: EX.cur.date, days: EX.days, next: EX.next.date, nextDays: EX.next.days };
const ZUKAI = stair(zCal('2026年4月', 1, '入社日・週5日'), { b: '＋6か月', small: '出勤が8割以上なら' }, zCal(`${EX.cur.date.y}年${EX.cur.date.m}月`, EX.cur.date.d, `${weekdayOf(EX.cur.date)}曜日・${EX.days}日`, true), ['1回目 ＝ 入社日の6か月後', '2回目から ＝ 1回目の日から1年ごと', '期限 ＝ もらった日から2年', `例：2026年4月1日に入社して週5日はたらくと、${md(EX.cur.date)}に${EX.days}日、${EX.next.date.y}年${md(EX.next.date)}に${EX.next.days}日です。${EX.cur.date.y}年にもらった分は${yukyuDateText(EX.cur.until)}まで使えます。`], `次は${EX.next.date.y}年${md(EX.next.date)}に<b class="fz-red">${EX.next.days}日</b>`);

const TABLE_ROWS = YUKYU_STEP_LONG.map(
  (s, i) => `<tr><td>${s}</td>${[5, 4, 3, 2, 1].map((w) => `<td class="num">${YUKYU_TABLE[w][i]}日</td>`).join('')}</tr>`,
).join('\n');

const FAQS = [
  {
    q: '出勤率が8割に届かないときは？',
    a: '<p>その年は有給休暇がもらえません。このツールは、出勤率が8割以上として計算しています。</p>',
  },
  {
    q: '週4日以下でも、週30時間以上はたらくときは？',
    a: '<p>週5日以上の人と同じ日数です。「週5日」のマスをえらんでください。</p>',
  },
  {
    q: '曜日が決まっていないパートは？',
    a: '<p>1年の所定労働日数で決めます。年169〜216日なら週4日、年121〜168日なら週3日のマスです。</p>',
  },
  {
    q: '週3日のパートは、有給休暇が何日もらえますか？',
    a: '<p>6か月で5日です。そのあと6日、6日、8日と増えて、勤続6年6か月からは毎年11日です。</p>',
  },
  {
    q: '使わなかった有給休暇はどうなりますか？',
    a: '<p>もらった日から2年で時効になります。1年目に使わなかった分は、次の1年も使えます。</p>',
  },
  {
    q: '年5日の取得義務とは何ですか？',
    a: '<p>1年に10日以上もらう人は、もらった日から1年のあいだに5日を取ることになっています。取らせるのは会社の義務です。</p>',
  },
  {
    q: '入社日にすぐもらえる会社もありますか？',
    a: '<p>就業規則で、法律より早く付与する会社もあります。そのときは会社の決まりの日付と日数になります。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">有給休暇が何日もらえるか計算します。</p>

<div class="calc" id="calc">
  <div class="field" id="f-tiles">${TILES}</div>
  <div class="box-rows">
    ${dateField('hire', '入社日')}
    ${dateField('on', '計算する日', 'はじめは今日の日付です')}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">有給休暇</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum"><span class="doc-sum-k">いまの日数<small id="r-ten"></small></span><span class="doc-sum-v"><b id="r-num">？</b>日</span></p>
    ${STEPS}
    <table class="doc-table yk-table"><tbody>
      <tr><th scope="row">次にもらう日</th><td id="d-next">—</td></tr>
      <tr><th scope="row">いまの分の期限</th><td id="d-until">—</td></tr>
      <tr><th scope="row">年5日の取得義務</th><td id="d-duty">—</td></tr>
    </tbody></table>
    <p class="doc-foot"><span id="r-foot">入社日を入れてください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `${ZUKAI}
<p>有給休暇は、入社日から6か月つづけてはたらき、決まった日の8割以上に出勤した人がもらえます。そのあとは1年ごとにもらえて、勤続が長いほど日数が増えます。週4日以下で週30時間未満の人は、はたらく日数の割合に合わせて少なくなります。例：2025年10月15日に入社して週4日はたらくと、2026年4月15日に7日、2027年4月15日に8日です。</p>
<p>月末の入社で6か月後に同じ日がないときは、次の月の1日にしています。</p>`,
)}

${section(
  'table',
  '有給休暇の付与日数の表',
  `<div class="tbl-wrap"><table class="tbl-tight">
<thead><tr><th>勤続</th><th class="num">週5日〜</th><th class="num">週4日</th><th class="num">週3日</th><th class="num">週2日</th><th class="num">週1日</th></tr></thead>
<tbody>
${TABLE_ROWS}
</tbody>
</table></div>
<p>週4日以下で週30時間未満の人は、はたらく日数に合わせて少なくなります。1年の日数で決めるときは、週4日が${YUKYU_WEEKS[1].year}、週3日が${YUKYU_WEEKS[2].year}、週2日が${YUKYU_WEEKS[3].year}、週1日が${YUKYU_WEEKS[4].year}です。</p>
<p class="note">出典：<a href="${YUKYU_SRC}">厚生労働省 千葉労働局のリーフレット</a></p>`,
)}

${section(
  'scenes',
  '使う場面の例',
  `<p>年度の途中の2026年1月10日に入社して、週5日はたらくとき。1回目は2026年7月10日に10日で、2回目は2027年7月10日に11日です。10日以上なので、年5日の取得義務の対象になります。</p>
<p>週3日のパートで、勤続が3年6か月になったとき。その日にもらうのは8日で、10日に届かないので年5日の取得義務の対象ではありません。週3日で10日になるのは、勤続5年6か月からです。</p>
<p>2025年8月31日に入社したとき。6か月後の2月には31日がないので、1回目は2026年3月1日に10日です。その分は2028年2月29日まで使えます。期限まであと何日かは、<a href="/nissu/">日数の計算</a>で数えられます。</p>`,
)}

${section(
  'mistakes',
  'まちがえやすいところ',
  `<h3>1回目は入社から1年後だと思う</h3>
<p>1回目は入社日の6か月後です。4月1日に入社した週5日の人は、翌年の4月ではなく、その年の10月1日に10日もらえます。</p>
<h3>週30時間以上なのに、週4日のマスで計算する</h3>
<p>週4日・1日8時間なら週32時間なので、週5日の人と同じ日数です。1回目は10日ですが、週4日のマスで計算すると7日になり、3日少なく出ます。</p>
<h3>前の年の分を数えない</h3>
<p>勤続2年6か月の週5日の人は、その日にもらう12日のほかに、前の年の11日のうち使っていない分も持っています。2025年10月1日にもらった分の期限は2027年9月30日で、すぎると残っていても消えます。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '有給休暇の付与日数の計算｜入社日から何日もらえるか・次はいつ',
    description: `有給休暇の付与日数を、入社日と週の所定労働日数から計算します。4月1日入社なら${md(EX.cur.date)}に${EX.days}日、勤続6年6か月からは毎年${YUKYU_TABLE[5][6]}日です。週3日は${YUKYU_TABLE[3][0]}日から。次にもらう日と2年の期限も出します。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '入社日と週の所定労働日数から、有給休暇の付与日数と次の付与日・時効の日を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['yukyu-fuyo.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
