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
// アイコンの版：アイコンの絵を変えたら1つ上げる（スマホのブラウザに残った古いアイコンを読み直させる。10/23 最初のオレンジのアイコンが残っていた）
const ICON_V = 2;
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

// 値をえらぶ付箋の場所（.tiles・.seg）に、ページの上から順に番号を付ける。site.css が番号で付箋の色を変える（10/22 しょーくん「選択の場所が違うものは付箋の色を変えて」）
// data-fresh：まださわっていない印。はじめから入っている値に丸を付けない（notes.js がさわったら外す）
function numberNotes(body) {
  let n = 0;
  return body.replace(/class="((?:tiles|seg)(?: [^"]*)?)"/g, (_, c) => `class="${c}" data-note="${Math.min(++n, 3)}" data-fresh`);
}

// パソコン（1080px〜）の見開き（10/31 連絡 C-017・#107）：<main> の中身を左の段（.pc-left）と右の段（.pc-right）に分ける
//   計算のページ：左＝h1・説明・#calc まで、右＝そのあと（1画面めの下の読みもの）
//   トップ：左＝題・ちょいメモ・よく使う計算、右＝分類の一覧から下
//   #calc のないページ：左＝最初の section・div の前まで（h1・説明）と、h2 が3つ以上なら目次。右＝本文
//   1080px 未満では入れ物が display: contents で見た目に効かない（site.css）。並べる順番は変えない
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function topLevel(html) {
  const out = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let depth = 0;
  let cur = null;
  let m;
  while ((m = re.exec(html))) {
    if (!m[2]) continue;
    const [, close, tag0, attrs] = m;
    const tag = tag0.toLowerCase();
    if (close) {
      depth--;
      if (depth === 0 && cur) { cur.end = re.lastIndex; out.push(cur); cur = null; }
      continue;
    }
    if (VOID.has(tag) || attrs.endsWith('/')) {
      if (depth === 0) out.push({ tag, attrs, start: m.index, end: re.lastIndex });
      continue;
    }
    if (depth === 0) cur = { tag, attrs, start: m.index };
    depth++;
    if (tag === 'script' || tag === 'style') {
      const endAt = html.indexOf(`</${tag}`, re.lastIndex);
      re.lastIndex = endAt < 0 ? html.length : endAt;
    }
  }
  return out;
}
const pcToc = (right) => {
  const hs = [...right.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)];
  if (hs.length < 3) return '';
  return `<nav class="pc-toc" aria-label="このページの中"><ul>${hs
    .map(([, id, t]) => `<li><a href="#${id}">${t.replace(/<[^>]+>/g, '')}</a></li>`)
    .join('')}</ul></nav>`;
};
export function spread(body, path) {
  const els = topLevel(body);
  let at = -1;
  let toc = false;
  const calc = els.find((e) => /\sid="calc"/.test(e.attrs));
  if (calc) at = calc.end;
  else if (path === '/') {
    const pick = els.find((e) => /aria-labelledby="cat-pick"/.test(e.attrs));
    if (pick) at = pick.end;
  } else {
    const first = els.find((e) => e.tag === 'section' || e.tag === 'div');
    if (first) { at = first.start; toc = true; }
  }
  if (at <= 0) return body;
  const left = body.slice(0, at);
  const right = body.slice(at);
  return `<div class="pc-left">${left}${toc ? pcToc(right) : ''}</div><div class="pc-right">${right}</div>`;
}

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
 * @param {boolean}[p.noAds]    AdSense を置かない（楽天APIの情報を出すページ。楽天ウェブサービスの規約 第10条）
 * @param {string} [p.footNote] フッターの「送信しません」の1行を、このページだけ差しかえる（寄付メモは端末の中に保存する）
 * @param {string} [p.ext]      外部の読み込みの印（rakuten-img＝返礼品のページの楽天の商品画像）。scripts/verify-dist.mjs が見張る
 */
export function page(p) {
  const fullTitle = p.path === '/' ? p.title : `${p.title}｜${SITE.name}`;
  const canonical = absUrl(p.path);
  const crumbs = p.breadcrumbs || [];
  const ld = [...(p.jsonLd || [])];
  if (crumbs.length >= 2) ld.push(breadcrumbLd(crumbs));
  const year = new Date().getFullYear();
  const theme = p.theme || 'home';
  // 外部の読み込みは決めたものだけ。印（data-ext）を見て scripts/verify-dist.mjs が見張る
  const ads = Boolean(SITE.adsense) && !p.noAds && !p.noindex && !p.ext;
  const ext = p.ext || (ads ? 'adsense' : '');
  // 見開き：現場手帳（自分の2列）と 404 はそのまま
  const body = numberNotes(p.body);
  const main = p.wide || p.path === '/404' ? body : spread(body, p.path);
  const pc = main !== body;

  return `<!doctype html>
<html lang="ja"${ext ? ` data-ext="${ext}"` : ''}>
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
<meta property="og:image" content="${absUrl(p.ogImage || '/og/default.jpg')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="format-detection" content="telephone=no">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.ico?v=${ICON_V}" sizes="48x48">
<link rel="icon" href="/favicon.svg?v=${ICON_V}" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${ICON_V}">
${ads ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsense}" crossorigin="anonymous"></script>\n` : ''}<style>${inlineCss}${p.css || ''}</style>
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replaceAll('<', '\\u003c')}</script>`).join('\n')}
</head>
<body data-theme="${theme}"${p.wide ? ' class="is-wide"' : pc ? ' class="is-spread"' : ''}>
<header class="site-header">
  <div class="wrap"><a class="brand" href="/">${LOGO_SVG}<span>${esc(SITE.name)}</span></a></div>
</header>
<main class="wrap">
${main}
${breadcrumbHtml(crumbs)}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p class="foot-note">${esc(p.footNote || '入力した数字は送信しません。保存するのは「メモする」と寄付メモの記録だけで、この端末の中です。')}</p>
    <nav class="foot-nav" aria-label="サイトの情報">
      <a href="/">ツール一覧</a>
      <a href="/about/">このサイトについて</a>
      <a href="/privacy/">プライバシーポリシー</a>
      <a href="/disclaimer/">免責事項</a>${SITE.contact ? '\n      <a href="/contact/">お問い合わせ</a>' : ''}
    </nav>
    <p class="copy">© ${year === SITE.startYear ? year : `${SITE.startYear}–${year}`} ${esc(SITE.name)}</p>
  </div>
</footer>
${[...(p.scripts || []), ...(/class="(?:tiles|seg)[\s"]/.test(p.body) ? ['notes.js'] : []), ...(pc ? ['pc.js'] : [])].map(scriptTag).join('\n')}
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
