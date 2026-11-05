// 読みものの棚（#131・11/4 しょーくん）：一覧 /yomimono/ と各ページ /yomimono/<slug>/、RSS /yomimono/feed.xml
// 読みものは src/yomimono/<slug>.mjs（1本1ファイル。書き方は docs/yomimono-neta.md）。0本のときは何も出さない
// 見た目は category の手帳（計算と同じ）。部品は今の本文の部品（.prose・図解・表・src-list）だけ
// 棚が足す節の id は ym- で始める（scripts/verify-dist.mjs が自分の文の字数から外す）
import { SITE, CATEGORIES } from '../site.mjs';
import { toolBySlug } from '../tools.mjs';
import { page, section, esc, absUrl, faqHtml, faqLd } from '../layout.mjs';
import { toolListHtml, themeOf, yomiListHtml, yomiUrl } from '../parts.mjs';
import { yomimono, textWidth } from '../yomimono/_shelf.mjs';

const LIST = '/yomimono/';
export const FEED = '/yomimono/feed.xml';
const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
const rfc822 = (d) => new Date(`${d}T00:00:00+09:00`).toUTCString(); // 日本時間のその日の0時
const newest = (list) => list.map((y) => y.updated).sort().at(-1);

// 文を前から入れて、全角120字までにする（全角80字に届かない文の並びは書かない）
const fit = (sentences) => sentences.reduce((acc, s) => (textWidth(acc + s) <= 120 ? acc + s : acc), '');

/** 1本のページ */
export function articlePage(y, list) {
  const path = yomiUrl(y);
  const tools = y.tools.map(toolBySlug);
  const dates = y.updated === y.published ? `${jaDate(y.published)}公開` : `${jaDate(y.updated)}更新`;
  const more = list.filter((x) => x.slug !== y.slug && x.category === y.category).slice(0, 3);
  const sources = `<ul class="src-list">${y.sources
    .map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`)
    .join('')}</ul>`;
  const body = `
<h1>${esc(y.title)}</h1>
<p class="lead">${esc(y.lead)}</p>
<p class="note"><time datetime="${y.updated}">${dates}</time></p>
${y.body}
${section('ym-tools', '自分の数字で確かめる', toolListHtml(tools))}
${section('ym-src', '出典', sources)}
${y.faqs.length ? section('ym-faq', 'よくある質問', faqHtml(y.faqs)) : ''}
${section('ym-more', 'ほかの読みもの', `${more.length ? yomiListHtml(more) : ''}<p><a href="${LIST}">読みもの一覧へ</a></p>`)}
`;
  const html = page({
    path,
    title: `${y.title}｜読みもの`,
    description: y.description,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: '読みもの', path: LIST },
      { name: y.title, path },
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: y.title,
        description: y.description,
        datePublished: y.published,
        dateModified: y.updated,
        author: { '@type': 'Organization', name: SITE.name, url: absUrl('/') },
        publisher: { '@type': 'Organization', name: SITE.name, url: absUrl('/') },
        mainEntityOfPage: absUrl(path),
        image: absUrl(`/og/${tools[0].slug}.png`),
        inLanguage: 'ja',
      },
      ...(y.faqs.length ? [faqLd(y.faqs)] : []),
    ],
    theme: themeOf(y),
    cat: y.category,
    ogImage: `/og/${tools[0].slug}.png`,
    feed: true,
    body,
  });
  return { path, html, sitemap: true, updated: y.updated };
}

/** 一覧のページ（新しい順。10本をこえたらカテゴリの見出しで分ける） */
export function listPage(list) {
  const groups =
    list.length > 10
      ? CATEGORIES.map((c) => [c, list.filter((y) => y.category === c.id)])
          .filter(([, l]) => l.length)
          .map(([c, l]) => section(`ym-${c.id}`, c.name, yomiListHtml(l)))
          .join('\n')
      : section('ym-new', '新しい順', yomiListHtml(list));
  const description = fit([
    `${SITE.name}の読みもの${list.length}本の一覧です。`,
    `いちばん新しいのは${jaDate(list[0].published)}の「${list[0].title}」です。`,
    '買い物や家事、お仕事、FXの計算のしくみと、場面ごとの計算の例を、図と表で書いています。',
    'どの読みものにも、出典と確かめた日を書いています。',
  ]);
  const html = page({
    path: LIST,
    title: '読みもの｜計算のしくみと場面ごとの例',
    description,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: '読みもの', path: LIST },
    ],
    feed: true,
    body: `
<h1>読みもの</h1>
<p class="lead">計算のしくみと場面ごとの例です。</p>
${groups}
`,
  });
  return { path: LIST, html, sitemap: true, updated: newest(list) };
}

/** RSS 2.0（新しい20本の題・URL・1行・公開日） */
export function feedXml(list) {
  const items = list
    .slice(0, 20)
    .map((y) => {
      const url = absUrl(yomiUrl(y));
      return `<item><title>${esc(y.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${esc(y.lead)}</description><pubDate>${rfc822(y.published)}</pubDate></item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(SITE.name)}の読みもの</title>
<link>${absUrl(LIST)}</link>
<description>計算のしくみと場面ごとの例の読みものです。</description>
<language>ja</language>
<lastBuildDate>${rfc822(newest(list))}</lastBuildDate>
<atom:link href="${absUrl(FEED)}" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`;
}

/** 読みものの並び（新しい順）から、一覧・各ページ・RSS を作る。0本なら何も作らない */
export function renderYomimono(list) {
  if (!list.length) return [];
  return [listPage(list), ...list.map((y) => articlePage(y, list)), { path: FEED, raw: feedXml(list) }];
}

export default function render() {
  return renderYomimono(yomimono());
}
