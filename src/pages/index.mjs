import { SITE, CATEGORIES } from '../site.mjs';
import { TOOLS, toolUrl } from '../tools.mjs';
import { page, esc, icon, absUrl } from '../layout.mjs';

export default function render() {
  const published = TOOLS.filter((t) => t.published);
  const upcoming = TOOLS.filter((t) => !t.published);

  const cats = CATEGORIES.map((c) => {
    const tools = published.filter((t) => t.category === c.id);
    if (!tools.length) return '';
    return `<section class="cat" aria-labelledby="cat-${c.id}">
  <h2 id="cat-${c.id}">${esc(c.name)}</h2>
  <ul class="tool-list">${tools
    .map(
      (t) => `<li><a class="tool-card" href="${toolUrl(t)}"><span class="tool-ico">${icon(t.icon)}</span><span><span class="tool-name">${esc(t.name)}</span><span class="tool-desc">${esc(t.short)}</span></span>${icon('<path d="m9 6 6 6-6 6"/>', 'ico go')}</a></li>`,
    )
    .join('')}</ul>
</section>`;
  }).join('\n');

  const body = `
<div class="hero">
  <h1>よく使う計算を、<br>ひとつのブックマークで。</h1>
  <p class="lead">割引・単価・FXの証拠金など、ふだんの「ちょっと計算したい」をまとめた無料のツール集です。数字を入れるだけで、すぐに答えが出ます。</p>
</div>
${cats}
${
  upcoming.length
    ? `<section class="cat" aria-labelledby="cat-soon"><h2 id="cat-soon">これから増えるツール</h2><ul class="soon">${upcoming
        .map((t) => `<li>${esc(t.name)}</li>`)
        .join('')}</ul></section>`
    : ''
}
<div class="tip"><strong>ホーム画面に追加すると、アプリのように使えます</strong>iPhoneは共有ボタンの「ホーム画面に追加」、Androidはメニューの「ホーム画面に追加」から。</div>
`;

  const html = page({
    path: '/',
    title: `${SITE.name}｜割引・単価・FXの計算をひとつに。無料の計算ツール集`,
    description: SITE.description,
    body,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: absUrl('/'), inLanguage: 'ja' },
    ],
  });
  const updated = published.map((t) => t.updated).sort().at(-1);
  return { path: '/', html, sitemap: true, updated };
}
