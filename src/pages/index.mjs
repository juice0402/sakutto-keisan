import { SITE, CATEGORIES } from '../site.mjs';
import { TOOLS, toolUrl } from '../tools.mjs';
import { page, esc, absUrl } from '../layout.mjs';

export default function render() {
  const published = TOOLS.filter((t) => t.published);
  const upcoming = TOOLS.filter((t) => !t.published);

  // 目次は親のツールだけ。使いみち別のページ（parent があるもの）は検索から直接来てもらうページなので、親のページの中からだけリンクする
  const cats = CATEGORIES.map((c) => {
    const tools = published.filter((t) => t.category === c.id && !t.parent);
    if (!tools.length) return '';
    return `<section class="cat cat-${c.theme}" aria-labelledby="cat-${c.id}">
  <h2 id="cat-${c.id}">${esc(c.name)}</h2>
  <ul class="tool-list">${tools
    .map(
      (t) => `<li><a class="tool-card" href="${toolUrl(t)}"><span class="tool-name">${esc(t.name)}</span><span class="tool-desc">${esc(t.short)}</span></a></li>`,
    )
    .join('')}</ul>
</section>`;
  }).join('\n');

  const body = `
<div class="hero">
  <h1>${esc(SITE.name)}</h1>
  <p class="lead">買い物や家事で使う計算ツールです。</p>
</div>
${cats}
${
  upcoming.length
    ? `<section class="cat" aria-labelledby="cat-soon"><h2 id="cat-soon">準備中</h2><p class="soon">${upcoming.map((t) => esc(t.name)).join('、')}</p></section>`
    : ''
}
<div class="tip"><strong>ホーム画面に追加できます</strong>共有ボタンかメニューの「ホーム画面に追加」から。</div>
`;

  const html = page({
    path: '/',
    title: `${SITE.name}｜割引・単価の比較・レシピの分量・希釈の計算ツール`,
    description: SITE.description,
    body,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: absUrl('/'), inLanguage: 'ja' },
    ],
  });
  const updated = published.map((t) => t.updated).sort().at(-1);
  return { path: '/', html, sitemap: true, updated };
}
