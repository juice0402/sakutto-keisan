import { SITE } from './site.mjs';

// ビルド時に scripts/build.mjs が、まとめて小さくしたスクリプトをここに入れる（各ページに埋め込む）
const inlineScripts = {};
export const setInlineScripts = (map) => Object.assign(inlineScripts, map);
let inlineCss = '';
export const setInlineCss = (css) => { inlineCss = css; };
const scriptTag = (name) => {
  if (!inlineScripts[name]) throw new Error(`script not found: ${name}`);
  return `<script>${inlineScripts[name]}</script>`;
};

export const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export const absUrl = (path) => SITE.url + path;

// ブラウザのバーの色（各テーマの背景色）
const THEME_COLOR = { home: '#fbfcfd', seikatsu: '#fbfcfd', shigoto: '#1f2b40', fx: '#0e0f11' };

export const icon = (inner, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

// ロゴ：「計」の赤いはんこ（public/favicon.svg と同じ形。scripts/make-images.py のアイコンもこれに合わせる）
export const LOGO_SVG = `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(-8 16 16)"><circle cx="16" cy="16" r="13.6" fill="#fff" stroke="#c8323c" stroke-width="2.4"/><text x="16" y="21.6" text-anchor="middle" font-size="16" font-weight="700" fill="#c8323c" font-family="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif">計</text></g></svg>`;

// breadcrumbs: [{ name, path }]（最後が今のページ）
const breadcrumbHtml = (items) =>
  items.length < 2
    ? ''
    : `<nav class="crumbs" aria-label="パンくずリスト"><ol>${items
        .map((b, i) =>
          i === items.length - 1
            ? `<li aria-current="page">${esc(b.name)}</li>`
            : `<li><a href="${b.path}">${esc(b.name)}</a></li>`,
        )
        .join('')}</ol></nav>`;

export const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((b, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: b.name,
    item: absUrl(b.path),
  })),
});

/**
 * ページ全体のHTML
 * @param {object} p
 * @param {string} p.path       URLのパス（例 "/waribiki/"）
 * @param {string} p.title      <title>（サイト名はここで付ける）
 * @param {string} p.description
 * @param {string} p.body       <main> の中身
 * @param {Array}  [p.breadcrumbs]
 * @param {Array}  [p.jsonLd]   構造化データ（オブジェクトの配列）
 * @param {Array}  [p.scripts]  埋め込むスクリプト（src/client の入口のファイル名）
 * @param {boolean}[p.noindex]
 * @param {string} [p.theme]    home / seikatsu / shigoto / fx（ツールはカテゴリのテーマ）
 * @param {string} [p.ogImage]  SNSで共有したときの画像（public/og/ の中。scripts/make-images.py で作る）
 */
export function page(p) {
  const fullTitle = p.path === '/' ? p.title : `${p.title}｜${SITE.name}`;
  const canonical = absUrl(p.path);
  const crumbs = p.breadcrumbs || [];
  const ld = [...(p.jsonLd || [])];
  if (crumbs.length >= 2) ld.push(breadcrumbLd(crumbs));
  const year = new Date().getFullYear();
  const theme = p.theme || 'home';

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(p.description)}">
${p.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">\n<meta name="robots" content="max-image-preview:large">`}
<meta name="theme-color" content="${THEME_COLOR[theme]}">
<meta property="og:type" content="${p.path === '/' ? 'website' : 'article'}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="${absUrl(p.ogImage || '/og/default.png')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="format-detection" content="telephone=no">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>${inlineCss}</style>
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replaceAll('<', '\\u003c')}</script>`).join('\n')}
</head>
<body data-theme="${theme}">
<header class="site-header">
  <div class="wrap"><a class="brand" href="/">${LOGO_SVG}<span>${esc(SITE.name)}</span></a></div>
</header>
<main class="wrap">
${breadcrumbHtml(crumbs)}
${p.body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p class="foot-note">入力した数字は送信・保存しません。</p>
    <nav class="foot-nav" aria-label="サイトの情報">
      <a href="/">ツール一覧</a>
      <a href="/about/">このサイトについて</a>
      <a href="/privacy/">プライバシーポリシー</a>
      <a href="/disclaimer/">免責事項</a>
    </nav>
    <p class="copy">© ${year === SITE.startYear ? year : `${SITE.startYear}–${year}`} ${esc(SITE.name)}</p>
  </div>
</footer>
${(p.scripts || []).map(scriptTag).join('\n')}
</body>
</html>
`;
}

// 本文の部品
export const section = (id, heading, inner) =>
  `<section class="prose" aria-labelledby="${id}"><h2 id="${id}">${esc(heading)}</h2>${inner}</section>`;

export const faqHtml = (faqs) =>
  `<div class="faq">${faqs
    .map((f) => `<details><summary>${esc(f.q)}</summary><div class="faq-a">${f.a}</div></details>`)
    .join('')}</div>`;

export const faqLd = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
  })),
});
