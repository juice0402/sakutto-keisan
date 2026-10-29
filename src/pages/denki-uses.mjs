// 家電別の電気代のページ（こたつ・電気毛布・ホットカーペット・セラミックヒーター・オイルヒーター）。電気代の計算の下のページ
// 計算カードは電気代の計算と同じ部品で、マスを「強・弱」などの強さにする。数字はメーカーの表示（src/data/denki.mjs に出典）
// 表の数字は tests/denki.test.mjs でも確かめる
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { denkiCard, hourYen, denkiZukai, denkiBars } from '../denki.mjs';
import { DENKI_PRICE, DENKI_USES, DENKI_MORE } from '../data/denki.mjs';
import { denki } from '../lib/denki.mjs';
import { fmt } from '../lib/number.mjs';

const P = DENKI_PRICE.value;
const esc = (s) => s.replace(/&/g, '&amp;');
const link = (name, url) => `<a href="${esc(url)}">${name}</a>`;
const yen1 = (x) => fmt(x, 1);
const cost = (watt, hours) => denki({ watt, hours, price: P });

// ページごとの文（よくある質問はメーカーの表示と、その数字から計算したものだけ）
const TEXT = {
  kotatsu: {
    title: 'こたつの電気代｜1時間・1か月はいくら？強と弱で計算',
    lead: 'こたつの電気代を、強と弱で計算します。',
    desc: (m) => `こたつの電気代を計算します。家具調こたつは1時間に強で約${yen1(cost(m[0].watt, 1).hour)}円、弱で約${yen1(cost(m[1].watt, 1).hour)}円（山善の表示・単価${P}円）。1日8時間なら1か月で強が約${fmt(cost(m[0].watt, 8).month, 0)}円です。使う時間と単価を変えて計算できます。`,
    note: '強と弱は、メーカーが出している1時間の消費電力量（強180Wh・弱70Wh）です。最大は消費電力（600W）のまま動いたときです。',
    faqs: (u) => [
      { q: 'こたつの電気代は1時間いくらですか？', a: `<p>${u.product}は、1時間の消費電力量が強で180Wh、弱で70Whです。単価${P}円なら、強で約5.6円、弱で約2.2円です。</p>` },
      { q: '消費電力が600Wなのに、電気代が安いのはなぜですか？', a: '<p>温かくなるとヒーターが止まったり弱くなったりするからです。600Wは、ヒーターがずっとついたときの値です。</p>' },
      { q: 'ほかのこたつではどれくらいですか？', a: `<p>${link(DENKI_MORE.nitoriKotatsu.name, DENKI_MORE.nitoriKotatsu.url)}の正方形のこたつ（ヒーター510W）は、1時間で弱が約2.5円、強が約5.3円と表示しています。室温20℃で、人が入らない状態の値です。</p>` },
      { q: 'エアコンとくらべるとどうですか？', a: `<p>6畳用のエアコンの暖房は、定格で470Wです（${link(DENKI_MORE.aircon.name, DENKI_MORE.aircon.url)}のCS-J226D）。こたつの強（1時間180Wh）は、その半分より小さい電力です。</p>` },
    ],
  },
  'denki-moufu': {
    title: '電気毛布の電気代｜1時間・ひと晩・1か月はいくら？',
    lead: '電気毛布の電気代を、目盛ごとに計算します。',
    desc: () => `電気毛布の電気代を計算します。電気しき毛布は1時間に「強」で約1.0円、目盛「3」で約0.6円（パナソニックの表示・室温10℃・単価${P}円）。ひと晩8時間なら「強」で約8円です。使う時間と単価を変えて計算できます。`,
    note: '強と目盛3は、メーカーが出している1時間の電気代（室温10℃）を31円で割って出した、目安の消費電力です。最大は定格の消費電力（54W）です。',
    faqs: (u) => [
      { q: '電気毛布の電気代は1時間いくらですか？', a: `<p>${u.product}は、室温10℃で「強」が約1.0円、目盛「3」が約0.6円です（単価${P}円）。</p>` },
      { q: 'ひと晩つけたままだといくらですか？', a: '<p>8時間なら、「強」で約8円、目盛「3」で約5円です。</p>' },
      { q: '定格54Wなのに、1時間1円くらいなのはなぜですか？', a: '<p>温かくなるとヒーターが止まったり弱くなったりするからです。54Wは、ヒーターがずっとついたときの値です。</p>' },
    ],
  },
  'hot-carpet': {
    title: 'ホットカーペットの電気代｜1時間・1か月はいくら？',
    lead: 'ホットカーペットの電気代を計算します。',
    desc: () => `ホットカーペットの電気代を計算します。3畳用は1時間に「高」で約14.6円、「中」で約10.4円（パナソニックの表示・室温15℃・単価${P}円）。1日8時間なら1か月で「高」が約3,504円です。使う時間と単価を変えて計算できます。`,
    note: '高と中は、メーカーが出している1時間の電気代（室温15℃）を31円で割って出した、目安の消費電力です。最大は定格の消費電力（710W）です。',
    faqs: (u) => [
      { q: 'ホットカーペットの電気代は1時間いくらですか？', a: `<p>${u.product}は、室温15℃で「高」が約14.6円、「中」が約10.4円です（単価${P}円）。</p>` },
      { q: '1日8時間使うと1か月いくらですか？', a: `<p>「高」で約${fmt(cost(471, 8).month, 0)}円、「中」で約${fmt(cost(335, 8).month, 0)}円です（1か月30日）。</p>` },
      { q: '定格710Wなのに、1時間15円くらいなのはなぜですか？', a: '<p>温かくなるとヒーターが止まったり弱くなったりするからです。710Wは、ヒーターがずっとついたときの値です。</p>' },
    ],
  },
  'ceramic-heater': {
    title: 'セラミックヒーターの電気代｜1時間・1か月はいくら？',
    lead: 'セラミックヒーターの電気代を計算します。',
    desc: () => `セラミックヒーターの電気代を計算します。消費電力は強で1,170W、弱で640W（パナソニックの表示・50Hz）。単価${P}円なら1時間に強で約36.3円、弱で約19.8円です。使う時間と単価を変えて計算できます。`,
    note: '強と弱は、メーカーが出している消費電力（50Hz）です。温度の調節で止まる時間があれば、実際の電気代はこれより安くなります。',
    faqs: (u) => [
      { q: 'セラミックヒーターの電気代は1時間いくらですか？', a: `<p>${u.product}は、消費電力が強で1,170W、弱で640Wです（50Hz）。単価${P}円なら、強で約36.3円、弱で約19.8円です。</p>` },
      { q: '1日4時間使うと1か月いくらですか？', a: `<p>強で約${fmt(cost(1170, 4).month, 0)}円、弱で約${fmt(cost(640, 4).month, 0)}円です（1か月30日）。</p>` },
      { q: 'こたつとくらべるとどうですか？', a: '<p>セラミックヒーターの強（1,170W）は、こたつの強（1時間180Wh・山善の家具調こたつ）の6倍以上の電力です。</p>' },
    ],
  },
  'oil-heater': {
    title: 'オイルヒーターの電気代｜1時間・1か月はいくら？',
    lead: 'オイルヒーターの電気代を計算します。',
    desc: () => `オイルヒーターの電気代を計算します。1500Wのものは、1時間に強で約46.5円、中（900W）で約27.9円、弱（600W）で約18.6円です（単価${P}円）。使う時間と単価を変えて計算できます。`,
    note: '強・中・弱は、メーカーが出している3段階の消費電力です。温度の調節で止まる時間があれば、実際の電気代はこれより安くなります。',
    faqs: (u) => [
      { q: 'オイルヒーターの電気代は1時間いくらですか？', a: `<p>${u.product}は、消費電力が600W・900W・1500Wの3段階です。単価${P}円なら、1時間に約18.6円・約27.9円・約46.5円です。</p>` },
      { q: 'メーカーはいくらと言っていますか？', a: `<p>${link(DENKI_MORE.delonghiFaq.name, DENKI_MORE.delonghiFaq.url)}は、1500Wのタイプで1時間に最大約47円、中で約28円、弱で約19円としています。</p>` },
      { q: '1日8時間使うと1か月いくらですか？', a: `<p>弱（600W）で約${fmt(cost(600, 8).month, 0)}円、強（1500W）で約${fmt(cost(1500, 8).month, 0)}円です（1か月30日）。</p>` },
    ],
  },
};

function render(u) {
  const tool = toolBySlug(u.slug);
  const parent = toolBySlug('denki-dai');
  const t = TEXT[u.slug];
  const path = `/${u.slug}/`;
  const rows = u.modes
    .map((m) => {
      const r = cost(m.watt, u.hours);
      return `<tr><td>${m.b}</td><td class="num">${fmt(m.watt)}W</td><td class="num">${yen1(r.hour)}円</td><td class="num">${fmt(r.month, 0)}円</td></tr>`;
    })
    .join('\n');
  const faqs = t.faqs(u);
  const body = `
<h1>${tool.name}</h1>
<p class="lead">${t.lead}</p>

${denkiCard({ tool, tiles: u.modes.map((m) => ({ b: m.b, small: hourYen(m.watt), watt: m.watt })), label: '強さをえらぶ', name: u.name, empty: '強さをえらんでください', wattEx: String(u.modes[0].watt), hoursEx: String(u.hours) })}

${section(
  'table',
  '強さごとの電気代',
  `${denkiBars(u.name, u.modes, u.hours)}<div class="tbl-wrap"><table>
<thead><tr><th>強さ</th><th class="num">消費電力</th><th class="num">1時間</th><th class="num">1か月</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
<p class="note">1か月は1日${u.hours}時間・30日、単価${P}円です。</p>
<p>${t.note}</p>
<p>出典：${link(u.product, u.url)}</p>`,
)}

${section('formula', '計算式', denkiZukai(`${u.name}の${u.modes[0].b}`, u.modes[0].watt, u.hours).stair)}

${section('faq', 'よくある質問', faqHtml(faqs))}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: t.title,
    description: t.desc(u.modes),
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: `/${parent.slug}/` },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, `${u.name}の強さと使う時間と単価から、1時間・1日・1か月・1年の電気代を出す計算ツール。`), faqLd(faqs)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['denki.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function renderAll() {
  return DENKI_USES.filter((u) => toolBySlug(u.slug)?.published).map(render);
}
