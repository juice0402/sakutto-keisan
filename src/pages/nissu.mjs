// 日数の計算：はじめの日（はじめは今日）と、何日後かおわりの日のどちらか（あとから入れたほう。もう片方は点線の答えの欄）
// 日数は、はじめの日を数えない（10月1日の3日後は10月4日）。はじめの日も数えた日数・週と日・和暦も表に出す
// 結果は日めくりカレンダー（おわりの日）と、大きな「◯日後」。ページに載せる計算例は tests/hizuke.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField, dateField } from '../fields.mjs';
import { nissu } from '../lib/nissu.mjs';
import { weekdayOf } from '../lib/hizuke.mjs';
import { stair, zCal } from '../zukai.mjs';

const tool = toolBySlug('nissu');
const path = '/nissu/';

const ex = (start, days) => nissu({ start, days, end: '', out: 'end' }).end;
const md = (d) => `${d.m}月${d.d}日（${weekdayOf(d)}）`;
// 何日後の早見表（2026年1月1日から）
const QUICK_DAYS = [7, 10, 14, 30, 60, 90, 100, 180, 365];
const QUICK_ROWS = QUICK_DAYS.map((n) => {
  const e = ex('2026-01-01', n);
  return `<tr><td class="num">${n}日後</td><td>${e.y === 2026 ? '' : `${e.y}年`}${md(e)}</td></tr>`;
}).join('\n');
const A = ex('2026-10-21', 100);
const B = nissu({ start: '2026-10-21', days: null, end: '2026-12-25', out: 'days' });
const span = (s, e) => nissu({ start: s, days: null, end: e, out: 'days' });
// 計算のしくみ・使う場面・まちがえやすいところの例（tests/scenes-c.test.mjs で同じ数を確かめる）
const C = {
  apr: ex('2026-04-01', 90),
  seed: ex('2026-04-10', 90),
  exam: span('2026-10-31', '2027-02-01'),
  d1000: ex('2024-05-01', 1000),
  d100: ex('2026-11-01', 100),
  mar: ex('2026-03-01', 90),
  y365: span('2026-03-01', '2027-03-01').days,
  y366: span('2027-03-01', '2028-03-01').days,
};

// 図解（#70）：日めくり2枚（はじめの日 ＋100日 → おわりの日）
const ZUKAI = stair(zCal('2026年10月', 21, `${weekdayOf({ y: 2026, m: 10, d: 21 })}曜日`), { b: '＋100日', small: 'はじめの日は数えない' }, zCal(`${A.y}年${A.m}月`, A.d, `${weekdayOf(A)}曜日`, true), ['おわりの日 ＝ はじめの日 ＋ 日数', '日数 ＝ おわりの日 − はじめの日', `例：2026年10月21日の100日後は、${A.y}年${md(A)}です。`]);

const FAQS = [
  {
    q: 'はじめの日は数えますか？',
    a: `<p>数えません。10月1日の3日後は10月4日です。法律の期間の数え方（民法140条）と同じです。はじめの日も1日目に数えた日数は、結果の表の「初日もふくむ」に出ます。</p>`,
  },
  {
    q: '「あと何日」を調べるには？',
    a: `<p>はじめの日は今日のままで、おわりの日を入れてください。10月21日から12月25日までは${B.days}日です。</p>`,
  },
  {
    q: '何日前の日付は出せますか？',
    a: '<p>おわりの日に、はじめの日より前の日付を入れると「20日前」のように出ます。何日後の欄は、あとの日付だけです。</p>',
  },
  {
    q: 'うるう年も数えますか？',
    a: '<p>数えます。2月29日がある年は、その日も1日として数えます。</p>',
  },
  {
    q: '土日や祝日をのぞいた日数は？',
    a: '<p>このツールは、土日や祝日もふくめた日数です。週と日の表示で、何週間と何日かを目安にしてください。</p>',
  },
  {
    q: '今日から何日後の日付を出すには？',
    a: `<p>はじめの日は今日のままで、何日後の欄に日数を入れます。2026年11月1日の100日後は、${C.d100.y}年${md(C.d100)}です。</p>`,
  },
];

// 計算のしくみと、使う場面・まちがえやすいところ（AdSense の再審査 #96。数字は tests/scenes-c.test.mjs）
const HOW = `<p>日付を、ある日から数えた通し番号にすると、月の長さやうるう年を気にせずに足し算と引き算ができます。このツールは1970年1月1日を0とした番号で計算し、答えの番号を日付にもどしています。はじめの日を数えないのは、2つの日のあいだが何日かを出すためです。</p>
<p>例：2026年4月1日の90日後は、${md(C.apr)}です。</p>`;
const SCENES = `<p>種をまいてから収穫までが90日の野菜なら、2026年4月10日にまくと、90日後は${md(C.seed)}です。袋に書いてある日数を何日後の欄に入れると、カレンダーを指で数えずにすみます。</p>
<p>試験の日まであと何日かを知りたいときは、おわりの日にその日付を入れます。2026年10月31日から2027年2月1日までは${C.exam.days}日で、${C.exam.weeks}週間と${C.exam.weekRest}日です。</p>
<p>記念日の1000日後も出せます。2024年5月1日の1000日後は、${C.d1000.y}年${md(C.d1000)}です。赤ちゃんの100日目は、<a href="/okuizome/">お食い初めの計算</a>で前後の土日といっしょに出せます。</p>`;
const MISTAKES = `<p>はじめの日を数えるかどうかで、1日ずれます。10月1日から10月31日までは30日ですが、10月1日も1日目に数えると31日です。旅行の3泊4日も、泊まる数の3がこのツールの日数で、4は初日もふくむ数です。</p>
<p>1か月を30日として数えると、月によってずれます。2026年3月1日の90日後は${md(C.mar)}で、3か月後の6月1日より2日早くなります。</p>
<p>うるう年をまたぐと、1年が366日になります。2026年3月1日から2027年3月1日までは${C.y365}日ですが、2027年3月1日から2028年3月1日までは${C.y366}日です。</p>`;

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">何日後の日付と、あと何日かを計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${dateField('start', 'はじめの日', 'はじめは今日の日付です')}
    <div class="pair date-pair">${boxField('days', '何日後', '日', '100')}${dateField('end', 'おわりの日')}</div>
  </div>
  <div class="slip pic" aria-live="polite">
    <p class="slip-title"><span>カレンダー<small id="r-start"></small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="pic-row">
      <div class="cal" aria-hidden="true"><p class="cal-ym" id="c-ym">—</p><p class="cal-d" id="c-d">？</p><p class="cal-w" id="c-w"></p></div>
      <div class="pic-side">
        <p class="slip-k" id="r-cap">はじめの日から</p>
        <p class="slip-v"><b id="r-num">？</b><small id="r-unit">日後</small></p>
        <p class="pc-say" id="r-say"></p>
      </div>
    </div>
    <table class="slip-table"><thead><tr><th>週と日</th><th>初日もふくむ</th><th>和暦</th></tr></thead><tbody><tr><td id="d-week">—</td><td id="d-incl">—</td><td id="d-wareki">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">何日後かおわりの日を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算のしかた',
  `${ZUKAI}${HOW}`,
)}

${section(
  'quick',
  '何日後の早見表',
  `<div class="tbl-wrap"><table>
<thead><tr><th class="num">日数</th><th>1月1日から</th></tr></thead>
<tbody>
${QUICK_ROWS}
</tbody>
</table></div>
<p class="note">2026年1月1日から数えた日付です。</p>`,
)}
${section('scenes', '使う場面の例', SCENES)}
${section('mistakes', 'まちがえやすいところ', MISTAKES)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '日数の計算｜何日後・何日前の日付と、あと何日か',
    description: `日数を計算します。2026年10月21日の100日後は${A.y}年${md(A)}で、12月25日までは${B.days}日です。何日後の日付と、ある日まであと何日かの両方を出し、曜日・和暦・何週間と何日かもわかります。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, 'はじめの日と日数かおわりの日から、何日後の日付やあいだの日数を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['nissu.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
