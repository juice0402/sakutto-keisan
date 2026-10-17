import { SITE, CATEGORIES } from './site.mjs';
import { TOOLS, toolBySlug, toolUrl } from './tools.mjs';
import { esc, absUrl } from './layout.mjs';

// ツールページの共通部品

/** ツールのテーマ（カテゴリで決まる） */
export const themeOf = (tool) => CATEGORIES.find((c) => c.id === tool.category)?.theme || 'home';

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
            `<li><a class="tool-card" href="${toolUrl(t)}"><span class="tool-name">${esc(t.name)}</span><span class="tool-desc">${esc(t.short)}</span></a></li>`,
        )
        .join('')}</ul>`
    : '';
  return `<section class="prose" aria-labelledby="related"><h2 id="related">ほかの計算ツール</h2>${list}<p><a href="/">ツール一覧へ</a></p></section>`;
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
