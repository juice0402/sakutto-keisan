// 残業代の計算：月給（または時給）と、残業・深夜・休日の時間から、割増賃金を出す（10/20 しょーくんがえらんで追加）
// 時給 ＝ 月給 ÷ 1か月の所定時間。1か月の所定時間は、年間休日と1日の所定時間から出す。時給を自分で入れてもよい
// 結果は、大きく残業代と、明細書のような項目ごとの時間と金額。ページに載せる計算例は tests/zangyo.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';

// 割増の率・時給の出し方・のぞく手当・端数の出典（厚生労働省）
const SRC_RATE = 'https://www.check-roudou.mhlw.go.jp/qa/roudousya/chingin/q3.html';
const SRC_ROUND = 'https://www.startup-roudou.mhlw.go.jp/qa/zigyonushi/chingin/q2.html';
const SRC_60 = 'https://www.mhlw.go.jp/topics/2008/12/dl/tp1216-1l-02.pdf';

const tool = toolBySlug('zangyo-dai');
const path = '/zangyo-dai/';

const FAQS = [
  {
    q: '月給には何を入れますか？',
    a: '<p>基本給と、毎月出る手当を足した額です。家族手当・通勤手当・住宅手当などと、ボーナスは入れません。</p>',
  },
  {
    q: '残業の時間には何を入れますか？',
    a: '<p>1日8時間か、1週40時間をこえてはたらいた時間です。会社の決まりが1日7時間なら、8時間までの1時間は割増にならないことがあります。</p>',
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
  {
    q: '20時間30分はどう入れますか？',
    a: '<p>20.5と入れてください。15分は0.25、45分は0.75です。</p>',
  },
  {
    q: '固定残業代があるときは？',
    a: '<p>固定残業代をのぞいた月給で計算してください。出た残業代が固定残業代より多いときは、その差額も受け取れます。</p>',
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">月給と残業の時間から、残業代を計算します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="pair">${boxField('salary', '月給', '円', '300,000')}${boxField('wage', '時給', '円', '1,837')}</div>
    <div class="pair">${boxField('holidays', '年間休日', '日', '120')}${boxField('daily', '1日の所定時間', '時間', '8')}</div>
    <div class="trio">${boxField('over', '残業', '時間', '20')}${boxField('night', '深夜', '時間', '0')}${boxField('holiday', '休日', '時間', '0')}</div>
  </div>
  <div class="box-result" aria-live="polite">
    <div class="result-head"><p class="fx-cap">残業代</p><button type="button" class="clear-btn" id="clear">クリア</button></div>
    <p class="fx-big"><span id="r-num">？</span><small>円</small></p>
    <div class="slip" id="slip"></div>
    <p class="mix-foot"><span id="r-foot">月給か時給を入れてください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>時給 ＝ 月給 ÷ 1か月の所定時間</span>
<span>1か月の所定時間 ＝（365 − 年間休日）× 1日の所定時間 ÷ 12</span>
<span>残業代 ＝ 時給 × 1.25 × 残業の時間</span>
</div>
<p>例：月給30万円・年間休日120日・1日8時間なら、1か月は163.3時間で、時給は1,837円です。残業1時間は 1,837 × 1.25 ＝ 2,296円で、20時間なら45,920円です。</p>
<p>時給と1時間あたりの残業代は、1円未満を四捨五入しています。厚生労働省が認めている端数の処理です。</p>`,
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
<p>出典：割増の率と時給の出し方は<a href="${SRC_RATE}">厚生労働省の労働条件のQ&amp;A</a>、端数は<a href="${SRC_ROUND}">厚生労働省のスタートアップ労働条件</a>、60時間の数え方は<a href="${SRC_60}">厚生労働省のリーフレット</a>です。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>残業の時間</th><th class="num">残業代</th></tr></thead>
<tbody>
<tr><td>10時間</td><td class="num">22,960円</td></tr>
<tr><td>20時間</td><td class="num">45,920円</td></tr>
<tr><td>45時間</td><td class="num">103,320円</td></tr>
<tr><td>80時間</td><td class="num">192,880円</td></tr>
</tbody>
</table></div>
<p>月給30万円・年間休日120日・1日8時間のときです。80時間は、60時間をこえた20時間が50％増しです。</p>
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
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '残業代の計算｜月給と残業時間から割増賃金を出す',
    description:
      '残業代を、月給と残業の時間から計算します。時給と、60時間をこえた分・深夜・休日の割増もわかります。1か月の所定時間は、年間休日と1日の所定時間から出します。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '月給と残業・深夜・休日の時間から、残業代（割増賃金）を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['zangyo.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
