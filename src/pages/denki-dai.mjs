// 電気代の計算：家電のマス（消費電力の目安）・消費電力・1日に使う時間・1kWhの単価から、1時間・1日・1か月・1年の電気代
// 結果は電気代のお知らせ（検針票のような紙）：1か月の使用量のメーターの数字と、いちばん大きな1か月の電気代
// マスの数字と単価のはじめの値は src/data/denki.mjs（出典つき）。ページに載せる計算例は tests/denki.test.mjs で確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf, toolListHtml } from '../parts.mjs';
import { denkiCard } from '../denki.mjs';
import { DENKI_PRICE, DENKI_APPLIANCES, DENKI_USES } from '../data/denki.mjs';
import { denki } from '../lib/denki.mjs';
import { fmt } from '../lib/number.mjs';

const tool = toolBySlug('denki-dai');
const path = '/denki-dai/';
const esc = (s) => s.replace(/&/g, '&amp;');

// 家電別の電気代のページ（こたつ・電気毛布など。この計算の下のページ）
const USES = DENKI_USES.map((u) => toolBySlug(u.slug)).filter((t) => t && t.published);

// 家電の消費電力の目安の表（マスと同じ数字）。消費電力は、出典のメーカーの仕様のページへのリンク
const APPLIANCE_ROWS = DENKI_APPLIANCES.map((a) => {
  const r = denki({ watt: a.watt, hours: 1, price: DENKI_PRICE.value });
  return `<tr><td class="wrap">${a.name}${a.cond ? `<br><small>${a.cond}</small>` : ''}</td><td class="num"><a href="${esc(a.url)}">${fmt(a.watt)}W</a></td><td class="num">${fmt(r.hour, 1)}円</td></tr>`;
}).join('\n');

// 計算例（tests/denki.test.mjs と同じ）
const EXAMPLES = [
  { name: 'こたつ', watt: 600, hours: 8 },
  { name: '電気毛布', watt: 54, hours: 8 },
  { name: 'セラミックヒーター', watt: 1170, hours: 4 },
  { name: 'ドライヤー', watt: 1200, hours: 0.25 },
  { name: 'テレビ', watt: 150, hours: 4 },
];
const EXAMPLE_ROWS = EXAMPLES.map((e) => {
  const r = denki({ watt: e.watt, hours: e.hours, price: DENKI_PRICE.value });
  return `<tr><td class="wrap">${e.name}<br><small>${fmt(e.watt)}W・1日${e.hours < 1 ? `${e.hours * 60}分` : `${e.hours}時間`}</small></td><td class="num">${fmt(r.day, r.day < 100 ? 1 : 0)}円</td><td class="num">${fmt(r.month, 0)}円</td></tr>`;
}).join('\n');

const FAQS = [
  {
    q: '消費電力はどこに書いてありますか？',
    a: '<p>家電の裏や底のラベルと、説明書の「仕様」に「消費電力 ◯W」と書いてあります。「強」「弱」で2つあるときは、使うほうを入れてください。</p>',
  },
  {
    q: '1kWhの単価はどこでわかりますか？',
    a: `<p>電気料金の明細に、1kWhあたりの料金が書いてあります。わからないときは、家電の目安に使われる${DENKI_PRICE.value}円のままで計算できます。</p>`,
  },
  {
    q: 'こたつやヒーターは、ずっと同じ消費電力ですか？',
    a: '<p>温度を調節する家電は、温かくなるとヒーターが止まったり弱くなったりします。このツールはずっと同じ消費電力で計算するので、実際の電気代はこれより安くなることがあります。</p>',
  },
  {
    q: '1か月と1年は何日で計算していますか？',
    a: '<p>1か月は30日、1年は365日です。冬だけ使うものは、1か月の額に使う月の数をかけてください。</p>',
  },
  {
    q: '電子レンジの600Wで計算してもいいですか？',
    a: '<p>600Wや500Wは、食べ物を温める力です。電気代は、ラベルの「消費電力」（1,400Wなど）で計算してください。</p>',
  },
  {
    q: '冷蔵庫の電気代は？',
    a: '<p>冷蔵庫はずっと同じ力で動くわけではないので、カタログの「年間消費電力量（kWh）」に単価をかけると、1年の目安になります。</p>',
  },
  {
    q: 'エアコンの電気代は？',
    a: `<p>エアコンは部屋や外の温度で消費電力が大きく変わるので、マスには入れていません。カタログの「期間消費電力量（kWh）」に単価をかけると、1年の目安になります。</p>`,
  },
];

export default function render() {
  const body = `
<h1>${tool.name}</h1>
<p class="lead">家電のW数と時間から、電気代を計算します。</p>

${denkiCard({ tiles: DENKI_APPLIANCES.filter((a) => a.tile).map((a) => ({ b: a.short, small: `${fmt(a.watt)}W`, watt: a.watt })), label: '家電をえらぶ', empty: '家電をえらんでください' })}

${USES.length ? section('uses', '家電別の電気代', toolListHtml(USES)) : ''}

${section(
  'formula',
  '計算式',
  `<div class="formula">
<span>1時間 ＝ 消費電力（W）÷ 1,000 × 単価</span>
<span>1か月 ＝ 1時間 × 1日の時間 × 30日</span>
</div>
<p>例：600Wのこたつを1日8時間、単価${DENKI_PRICE.value}円なら、0.6 × ${DENKI_PRICE.value} × 8 × 30 ＝ ${fmt(denki({ watt: 600, hours: 8, price: DENKI_PRICE.value }).month, 0)}円。</p>`,
)}

${section(
  'examples',
  '計算例',
  `<div class="tbl-wrap"><table>
<thead><tr><th>家電と使い方</th><th class="num">1日</th><th class="num">1か月</th></tr></thead>
<tbody>
${EXAMPLE_ROWS}
</tbody>
</table></div>
<p class="note">単価${DENKI_PRICE.value}円・1か月30日で計算しています。</p>`,
)}

${section(
  'appliances',
  '家電の消費電力の目安',
  `<div class="tbl-wrap"><table>
<thead><tr><th>家電</th><th class="num">消費電力</th><th class="num">1時間</th></tr></thead>
<tbody>
${APPLIANCE_ROWS}
</tbody>
</table></div>
<p>製品によって違うので、使っている家電のラベルの数字を入れるのがいちばん正確です。消費電力のリンク先は、出典のメーカーの仕様のページです。</p>
<p class="note">単価の出典：<a href="${esc(DENKI_PRICE.url)}">${DENKI_PRICE.src}</a></p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: '電気代の計算｜こたつ・ヒーターの1時間と1か月の電気代',
    description:
      '家電の電気代を、消費電力（W）と使う時間から計算します。こたつ・電気毛布・ヒーター・ドライヤーなどは、えらぶだけで消費電力の目安が入ります。1時間・1日・1か月・1年の電気代がわかります。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '家電の消費電力と使う時間と電気料金の単価から、1時間・1日・1か月・1年の電気代を出す計算ツール。'), faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['denki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}
