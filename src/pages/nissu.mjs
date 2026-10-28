// 日数の計算：はじめの日（はじめは今日）と、何日後かおわりの日のどちらか（あとから入れたほう。もう片方は点線の答えの欄）
// 日数は、はじめの日を数えない（10月1日の3日後は10月4日）。はじめの日も数えた日数・週と日・和暦も表に出す
// 結果は日めくりカレンダー（おわりの日）と、大きな「◯日後」。ページに載せる計算例は tests/hizuke.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { boxField, dateField } from '../fields.mjs';
import { nissu } from '../lib/nissu.mjs';
import { weekdayOf } from '../lib/hizuke.mjs';

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
];

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
  `<div class="formula">
<span>おわりの日 ＝ はじめの日 ＋ 日数</span>
<span>日数 ＝ おわりの日 − はじめの日</span>
</div>
<p>例：2026年10月21日の100日後は、${A.y}年${md(A)}です。</p>`,
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
