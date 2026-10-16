import { SITE } from './site.mjs';
import { TOOLS, toolBySlug, toolUrl } from './tools.mjs';
import { esc, icon, absUrl } from './layout.mjs';

// ツールページの共通部品

/** 関連ツール（公開済みだけ。足りなければ同じカテゴリから補う。0件ならトップへのリンクだけ） */
export function relatedHtml(tool, max = 4) {
  const picked = (tool.related || []).map(toolBySlug).filter((t) => t && t.published);
  for (const t of TOOLS) {
    if (picked.length >= max) break;
    if (t.published && t.slug !== tool.slug && t.category === tool.category && !picked.includes(t)) picked.push(t);
  }
  const list = picked.length
    ? `<ul class="tool-list">${picked
        .slice(0, max)
        .map(
          (t) =>
            `<li><a class="tool-card" href="${toolUrl(t)}"><span class="tool-ico">${icon(t.icon)}</span><span><span class="tool-name">${esc(t.name)}</span><span class="tool-desc">${esc(t.short)}</span></span>${icon('<path d="m9 6 6 6-6 6"/>', 'ico go')}</a></li>`,
        )
        .join('')}</ul>`
    : '';
  return `<section class="prose" aria-labelledby="related"><h2 id="related">ほかの計算ツール</h2>${list}<p><a href="/">${esc(SITE.name)}のツール一覧を見る</a></p></section>`;
}

/** ツールページの構造化データ（WebApplication） */
export const toolLd = (tool, description) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: `${tool.name}｜${SITE.name}`,
  url: absUrl(toolUrl(tool)),
  description,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'All',
  inLanguage: 'ja',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
});
