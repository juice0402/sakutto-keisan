import { SITE, CATEGORIES } from './site.mjs';
import { TOOLS, toolBySlug, toolUrl } from './tools.mjs';
import { esc, absUrl } from './layout.mjs';

// ツールページの共通部品

/** レシートの下のぎざぎざ（切り取った紙のはし。割り勘・消費税のレシート） */
const TEETH = 28;
const zig = Array.from({ length: TEETH }, (_, i) => `L${((i + 0.5) * 100 / TEETH).toFixed(2)} 5L${((i + 1) * 100 / TEETH).toFixed(2)} 0`).join('');
export const RECEIPT_EDGE = `<svg class="rc-edge" viewBox="0 0 100 5" preserveAspectRatio="none" aria-hidden="true"><path class="rc-paper" d="M0 0${zig}Z"/><path class="rc-cut" d="M0 0${zig}" vector-effect="non-scaling-stroke"/></svg>`;

/** ツールのテーマ（カテゴリで決まる） */
export const themeOf = (tool) => CATEGORIES.find((c) => c.id === tool.category)?.theme || 'home';

/** ツールの一覧（名前と、何がわかるか） */
export const toolListHtml = (tools) =>
  `<ul class="tool-list">${tools
    .map((t) => `<li><a class="tool-card" href="${toolUrl(t)}"><span class="tool-name">${esc(t.name)}</span><span class="tool-desc">${esc(t.short)}</span></a></li>`)
    .join('')}</ul>`;

/** 関連ツール（公開済みだけ。足りなければ同じカテゴリから補う。0件ならトップへのリンクだけ） */
export function relatedHtml(tool, max = 4) {
  const picked = (tool.related || []).map(toolBySlug).filter((t) => t && t.published);
  for (const t of TOOLS) {
    if (picked.length >= max) break;
    // 足りない分は同じカテゴリの親のツールから（使いみち別のページは親のページからリンクする）
    if (t.published && !t.parent && t.slug !== tool.slug && t.category === tool.category && !picked.includes(t)) picked.push(t);
  }
  const list = picked.length ? toolListHtml(picked.slice(0, max)) : '';
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
