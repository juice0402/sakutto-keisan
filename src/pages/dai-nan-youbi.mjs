// 第何曜日の計算（10/27 しょーくん「くらしノートに負けない」。検索候補「第何曜日 数え方」「今日 第何曜日」「第3水曜日 いつ」）
// 日付（はじめは今日）から、その日が第何◯曜日か（1〜7日が第1）。結果はその月のカレンダー（その曜日の列にマーカー、その日に赤ペンの丸）
// 下の表は、これから12か月の同じ「第n◯曜日」の日（ゴミの日・定休日を調べる人向け）。計算は src/lib/dai-nan-youbi.mjs
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, memoHtml } from '../parts.mjs';
import { dateField } from '../fields.mjs';
import { WEEKDAYS } from '../lib/hizuke.mjs';
import { daiNanYoubi, ybHolidays } from '../lib/dai-nan-youbi.mjs';
import { stair, zCal, zBox } from '../zukai.mjs';

const tool = toolBySlug('dai-nan-youbi');
const path = '/dai-nan-youbi/';
const Y = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date()));
const EX = daiNanYoubi(`${Y}-10-27`);
const HOL = ybHolidays(Y);

// 図解（#82）：日付 → 第何曜日の流れの図（日付の答えなので帯の図はつけない）。数字は tests/zukai-kurashi.test.mjs
export const Z_YOUBI = { y: Y, n: EX.n, youbi: EX.youbi };
const ZUKAI = stair(zCal(`${Y}年10月`, 27, `${EX.youbi}曜日`), { b: '（27−1）÷7＋1', small: '1〜7日が第1' }, zBox('10月27日は', `第${EX.n}${EX.youbi}曜日`, true), ['第n ＝（日 − 1）÷ 7 の整数部分 ＋ 1', `例：${Y}年10月27日は、（27 − 1）÷ 7 ＝ 3あまり5なので、第${EX.n}${EX.youbi}曜日です。`]);
const SRC = 'https://www8.cao.go.jp/chosei/shukujitsu/gaiyou/kaku.html';
const CELLS = Array.from({ length: 42 }, (_, i) => `<span class="yb-d" id="yb-${i}"></span>`).join('');

const FAQS = [
  { q: '第何曜日はどう数えますか？', a: '<p>その月の1日から7日までが第1、8日から14日までが第2です。15日から21日が第3、22日から28日が第4、29日からが第5です。</p>' },
  { q: '第5◯曜日がない月は？', a: '<p>29日より後にその曜日がない月は、第5はありません。下の12か月の表では「なし」と出ます。</p>' },
  { q: '最終◯曜日と第4◯曜日はちがいますか？', a: '<p>その月に第5がないときは同じ日です。第5がある月は、最終◯曜日は第5の日になります。</p>' },
  { q: '第何週とはちがいますか？', a: '<p>ちがいます。第何週はカレンダーの何行目かで、1日が週のとちゅうから始まる月は、第何曜日と数がずれることがあります。</p>' },
  { q: '祝日も第何曜日で決まりますか？', a: `<p>成人の日は1月の第2月曜日、海の日は7月の第3月曜日です。敬老の日は9月の第3月曜日、スポーツの日は10月の第2月曜日です。</p>` },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">その日が第何曜日かを出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${dateField('date', '日付', 'はじめは今日の日付です')}
  </div>
  <div class="slip" aria-live="polite">
    <p class="slip-title"><span>カレンダー<small id="r-ym"></small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <p class="slip-sum"><span class="slip-k" id="r-cap">？</span><span class="slip-v"><b id="r-num">？</b></span></p>
    <p class="pc-say" id="r-say"></p>
    <div class="yb-cal" aria-hidden="true"><div class="yb-head">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div><div class="yb-grid" id="yb-grid">${CELLS}</div></div>
    <p class="slip-foot" id="r-foot">日付を入れてください</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'ahead',
  'これから12か月の同じ曜日',
  `<div class="tbl-wrap"><table>
<thead><tr><th>月</th><th class="num" id="ah-head">日</th></tr></thead>
<tbody id="ah-rows"><tr><td colspan="2">日付を入れると出ます。</td></tr></tbody>
</table></div>`,
)}

${section('formula', '計算のしかた', ZUKAI)}

${section(
  'holiday',
  `${Y}年の第何月曜日で決まる祝日`,
  `<div class="tbl-wrap"><table>
<thead><tr><th>祝日</th><th>決まり</th><th class="num">${Y}年</th></tr></thead>
<tbody>
${HOL.map((h) => `<tr><td>${h.name}</td><td>${h.m}月の第${h.n}月曜日</td><td class="num">${h.m}月${h.d}日</td></tr>`).join('\n')}
</tbody>
</table></div>
<p class="note">出典：<a href="${SRC}" rel="noopener">内閣府「国民の祝日」について</a></p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '第何曜日の計算｜今日は第何曜日か・数え方と毎月の日付',
    description: `第何曜日かを計算します。${Y}年10月27日は第${EX.n}${EX.youbi}曜日です。その月のカレンダーで見せて、これから12か月の同じ第何曜日の日付と、${Y}年の成人の日など${HOL.length}つの祝日の日も出します。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '日付から、その日が第何◯曜日かと、これから12か月の同じ第何曜日の日付を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['dai-nan-youbi.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
