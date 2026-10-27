import { SITE, CATEGORIES } from '../site.mjs';
import { TOOLS, toolUrl, CALC_COUNT, LAST_UPDATED } from '../tools.mjs';
import { page, esc, absUrl } from '../layout.mjs';
import { doodle } from '../doodles.mjs';

const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;

// トップ（10/21 しょーくん「トップは王道で、マイナーな計算はたたんでまとめる」）
// いちばん上に「よく使う計算」（tools.mjs の pick の順。ペンで線を引いた表に、答えの小さな絵と名前を2列で。10/27 しょーくんが3案から B。名前は pickName か、name から「の計算」を取ったもの）。その下にカテゴリごとの目次。
// カテゴリは pick でも more でもないツールをそのまま出し、more のツールは「ほかの計算」にたたむ（中のリンクも検索エンジンには見える）。
// 下のページ（parent があるもの）は検索から直接来てもらうページなので、親のページの中からだけリンクする
const card = (t) =>
  `<li><a class="tool-card" href="${toolUrl(t)}"><span class="tool-name">${esc(t.name)}</span><span class="tool-desc">${esc(t.short)}</span></a></li>`;

export default function render() {
  const top = TOOLS.filter((t) => t.published && !t.parent);
  const picks = top.filter((t) => t.pick).sort((a, b) => a.pick - b.pick);
  // 季節のツール（ふるさと納税は11〜12月）は、ビルドした月（日本時間）に「よく使う計算」の決めた番目と入れかえる
  const month = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', month: 'numeric' }).format(new Date()));
  for (const t of top.filter((x) => x.pickSeason?.months.includes(month))) picks[t.pickSeason.replaces - 1] = t;

  const cats = CATEGORIES.map((c) => {
    const tools = top.filter((t) => t.category === c.id && !picks.includes(t));
    const shown = tools.filter((t) => !t.more);
    const more = tools.filter((t) => t.more);
    if (!tools.length) return '';
    return `<section class="cat" aria-labelledby="cat-${c.id}">
  <h2 id="cat-${c.id}">${esc(c.name)}</h2>
  <ul class="tool-list">${shown.map(card).join('')}</ul>${
    more.length
      ? `
  <details class="more"><summary>ほかの計算（${more.length}）</summary><ul class="tool-list">${more.map(card).join('')}</ul></details>`
      : ''
  }
</section>`;
  }).join('\n');

  const body = `
<div class="hero">
  <h1>${esc(SITE.name)}</h1>
  <p class="lead">買い物や家事、仕事で使う計算ツールです。</p>
</div>
<section class="cat" aria-labelledby="cat-pick">
  <h2 id="cat-pick">よく使う計算</h2>
  <ul class="pick-grid">${picks.map((t) => `<li><a class="pick-cell" href="${toolUrl(t)}">${doodle(t.slug)}<span>${esc(t.pickName || t.name.replace(/の計算$/, ''))}</span></a></li>`).join('')}</ul>
</section>
${cats}
<div class="tip"><strong>ホーム画面に追加できます</strong>共有ボタンかメニューの「ホーム画面に追加」から。</div>
`;

  const html = page({
    path: '/',
    title: `${SITE.name}｜割引・消費税・パーセント・割り勘などの計算ツール`,
    description: `割引・消費税・パーセント・割り勘・ふるさと納税の上限・家電の電気代・FXのロスカットなど、${CALC_COUNT}の計算ツールをまとめたサイトです。スマホのブラウザで使えて、入力した数字は送信しません。${jaDate(LAST_UPDATED)}更新。`,
    body,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, alternateName: SITE.alternateName, url: absUrl('/'), inLanguage: 'ja' },
    ],
  });
  const updated = top.map((t) => t.updated).sort().at(-1); // トップに出ているツールだけ
  return { path: '/', html, sitemap: true, updated };
}
