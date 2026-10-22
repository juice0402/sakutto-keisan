// ふるさと納税の返礼品（第3弾）：/furusato/henreihin/ と、お米・肉・魚介・日用品のページ
// 楽天市場の商品検索APIで取ったデータ（scripts/fetch-henreihin.mjs → .henreihin/data.json）か、作り話の見本（tests/fixtures/henreihin.json）から作る
// どちらで作るかは src/data/henreihin.mjs の HENREIHIN_MODE（off のときは作らない）
// 楽天の決まり：最初の画面に「広告　楽天アフィリエイトを利用しています」、一覧の中は楽天へのリンクだけ（rel="sponsored"）、
//   クレジットは楽天の指定のHTMLのまま、商品画像はURLのまま（加工・保存しない）、AdSense を置かない（noAds）、楽天以外のサイトへのリンクを置かない
// 総務省のQ&Aの言葉（お得・還元・購入・ポイントなど）を使わない。量は商品名に書かれた数字だけ（src/lib/henreihin.mjs）
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { HENREIHIN_MODE, HENREIHIN_CATS, HENREIHIN_SHOW, HENREIHIN_PRICE_TILES } from '../data/henreihin.mjs';
import { hrPrepare, firstPick } from '../lib/henreihin.mjs';
import { fmt } from '../lib/number.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AD = '<p class="hr-ad">広告　楽天アフィリエイトを利用しています</p>';
// 楽天ウェブサービスのクレジット（楽天の指定のHTML。1文字も変えない）
const CREDIT = `<!-- Rakuten Web Services Attribution Snippet FROM HERE -->
<a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a>
<!-- Rakuten Web Services Attribution Snippet TO HERE -->`;
const NOSCRIPT = '<noscript><p class="tag-note is-error">寄付額でしぼるには、JavaScriptを有効にしてください。</p></noscript>';

function loadData() {
  const file = HENREIHIN_MODE === 'api' ? join(ROOT, '.henreihin', 'data.json') : join(ROOT, 'tests', 'fixtures', 'henreihin.json');
  if (!existsSync(file)) throw new Error(`返礼品のデータがありません: ${file}（scripts/fetch-henreihin.mjs を先に）`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

// 1万円あたりの量の数字（kg は小数1けた、1より少なければ2けた。ロール・箱は小数1けた）
const perText = (x) => fmt(x, x < 1 ? 2 : 1);
const unitName = (u) => (u === 'ロール' ? 'ロール分' : u); // トイレットペーパーは、長巻きもふつうの長さのロールの数にする
const altOf = (name) => name.replace(/【[^】]*】/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
const atText = (iso) => {
  const d = new Date(iso);
  const j = new Date(d.getTime() + 9 * 3600e3);
  return `${j.getUTCMonth() + 1}月${j.getUTCDate()}日${j.getUTCHours()}時`;
};

/** 一覧の1行（画像・商品名・自治体・1万円あたり・もとの量と寄付額・印・楽天へのリンク） */
function row(x, i, mihon, label = '') {
  const img = x.img
    ? `<img class="hr-img" src="${esc(x.img)}" width="128" height="128" alt="${esc(altOf(x.name))}"${i >= 4 ? ' loading="lazy"' : ''} decoding="async">`
    : `<span class="hr-img hr-noimg" aria-hidden="true">${mihon ? '見本' : '画像なし'}</span>`;
  const tags = [label, x.teiki > 1 ? '定期便' : '', x.shell ? '殻つき' : ''].filter(Boolean);
  return `<li class="hr-row" data-price="${x.price}">
      ${img}
      <div class="hr-body">
        ${tags.length ? `<p class="hr-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
        <p class="hr-name">${esc(x.name)}</p>
        <p class="hr-shop">${esc(x.shop)}</p>
        <p class="hr-per"><small>1万円あたり</small><b>${perText(x.per)}</b>${unitName(x.unit)}</p>
        <p class="hr-basis">${esc(x.basis)}・寄付 ${fmt(x.price)}円</p>
        <a class="hr-go" href="${esc(x.url)}" rel="sponsored noopener">楽天ふるさと納税で見る</a>
      </div>
    </li>`;
}

const PRICE_TILES = `<div class="tiles tiles-4 hr-price" role="group" aria-label="寄付額でしぼる">
      ${HENREIHIN_PRICE_TILES.map((p) => `<button type="button" class="tile" data-max="${p}" aria-pressed="false"><b>${p / 10000}万円</b><small>まで</small></button>`).join('\n      ')}
      <button type="button" class="tile tile-word" data-max="0" aria-pressed="true"><b>すべて</b><small>寄付額</small></button>
    </div>`;

const HOW = section(
  'how',
  '1万円あたりの量の出し方',
  `<div class="formula">
<span>1万円あたり ＝ 量 ÷ 寄付額 × 1万円</span>
</div>
<p>例：5kg×3袋で寄付額が3万円なら、15kg ÷ 3万円で、1万円あたり5kgです。</p>
<p>量は商品名に書かれた数字だけで出します。量や回数を選べるものは、寄付額がどの量の額かわからないので並べていません。量が書いていないもの、1.5〜2kgのように幅があるものも同じです。定期便は回数をかけた合計です。</p>`,
);

const common = (mihon) => ({
  noAds: true,
  ext: mihon ? '' : 'rakuten-img',
  noindex: mihon,
});

const MIHON = '<p class="hr-mihon">見本の画面です。商品はすべて作り話です。</p>';

/* ---- カテゴリのページ ---- */
function renderCat(cat, data, mihon) {
  const tool = toolBySlug(`furusato-${cat.slug}`);
  const parent = toolBySlug('furusato-henreihin');
  const path = tool.path;
  let at = 0; // 画像は、ページの上から4枚だけ先に読む（5枚目からは loading="lazy"）
  const lists = cat.groups.map((g) => {
    const list = hrPrepare(data.groups[g.key] || [], g.unit).slice(0, HENREIHIN_SHOW);
    const from = at;
    at += list.length;
    return { g, list, from };
  });
  const many = cat.groups.length > 1;
  const unitWord = cat.groups.map((g) => `何${unitName(g.unit)}`).join('・');
  const faqs = [
    {
      q: '寄付の申し込みはどこでしますか？',
      a: '<p>「楽天ふるさと納税で見る」から楽天の返礼品のページへ進み、そこで申し込みます。このサイトでは申し込みできません。</p>',
    },
    {
      q: '一覧にない返礼品があるのは？',
      a: '<p>楽天でレビューが多い順に集めた中から、量が1つに決まっている返礼品だけを並べています。5kg・10kg・20kgのように量を選べるものは、寄付額がどの量の額かわからないので入れていません。</p>',
    },
    {
      q: '寄付額や受付はいつの情報ですか？',
      a: `<p>${atText(data.fetchedAt)}の時点で、楽天から1日1回取り直しています。申し込む前に楽天のページで確かめてください。</p>`,
    },
    ...(cat.slug === 'gyokai'
      ? [{ q: '「殻つき」とは？', a: '<p>殻や頭の重さもふくむ量です。食べられる量は、書いてある量より少なくなります。</p>' }]
      : []),
    ...(cat.slug === 'nichiyouhin'
      ? [{ q: '2倍巻きのトイレットペーパーは？', a: '<p>ふつうの長さで何ロール分かにしています。2倍巻きの12ロールは24ロール分です。</p>' }]
      : []),
    {
      q: 'いくらまで寄付できますか？',
      a: '<p><a href="/furusato/">上限の目安</a>で、年収と家族から出せます。寄付したら<a href="/furusato/memo/">寄付メモ</a>に残すと、のこりの枠がわかります。</p>',
    },
  ];
  const body = `
<h1>${tool.name}</h1>
<p class="lead">1万円あたりの量が多い順に並べています。</p>
${AD}
${mihon ? MIHON : ''}
<div class="calc hr-calc" id="calc">
  ${PRICE_TILES}
  ${NOSCRIPT}
</div>
<div class="hr-sheet" aria-live="polite">
  ${lists
    .map(
      ({ g, list, from }) => `<section class="hr-group" aria-labelledby="g-${g.key}">
    <p class="hr-head" id="g-${g.key}">${many ? `<span>${esc(g.name)}</span>` : ''}<small>1万円あたり何${unitName(g.unit)}か・多い順</small></p>
    <ol class="hr-list">
    ${list.map((x, i) => row(x, from + i, mihon)).join('\n    ')}
    </ol>
    <p class="hr-none" hidden>この寄付額の返礼品はありません</p>
  </section>`,
    )
    .join('\n  ')}
  <p class="hr-at">楽天の情報は${atText(data.fetchedAt)}の時点です</p>
</div>

${HOW}

${section('faq', 'よくある質問', faqHtml(faqs))}

${relatedHtml(tool)}

<p class="hr-credit">${CREDIT}</p>
`;
  const html = page({
    path,
    title: `${tool.name}｜1万円あたり${unitWord}か多い順（楽天ふるさと納税）`,
    description: `楽天ふるさと納税の${cat.name}の返礼品を、商品名に書かれた量から1万円あたり${unitWord}かを出して、多い順に並べています。寄付額1万円・2万円・3万円まででしぼれます。`,
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: parent.path },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, `楽天ふるさと納税の${cat.name}の返礼品を、1万円あたりの量で並べた一覧。`), faqLd(faqs)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['henreihin.js'],
    body,
    ...common(mihon),
  });
  return { path, html, sitemap: !mihon, updated: tool.updated, count: lists.reduce((s, x) => s + x.list.length, 0) };
}

/* ---- 入口：はじめての1件（お米・肉・魚介から1つずつ）とカテゴリ ---- */
function renderTop(data, mihon, counts) {
  const tool = toolBySlug('furusato-henreihin');
  const path = tool.path;
  const picks = HENREIHIN_CATS.filter((c) => c.slug !== 'nichiyouhin')
    .map((c) => {
      const g = c.groups[0];
      const x = firstPick(hrPrepare(data.groups[g.key] || [], g.unit));
      return x ? { x, label: c.name } : null;
    })
    .filter(Boolean);
  const faqs = [
    {
      q: '「はじめての1件」はどうやって選んでいますか？',
      a: '<p>寄付額2万円まで、定期便でない、レビュー10件以上のものから、届く時期が商品名に書いてあるものを先に、1万円あたりの量が多いものを1つずつ選んでいます。</p>',
    },
    {
      q: '寄付の申し込みはどこでしますか？',
      a: '<p>「楽天ふるさと納税で見る」から楽天の返礼品のページへ進み、そこで申し込みます。このサイトでは申し込みできません。</p>',
    },
    {
      q: '寄付の前にすることは？',
      a: '<p><a href="/furusato/">上限の目安</a>で、いくらまで寄付できるかを出しておきます。確定申告をしない人は、寄付先が5つまでなら<a href="/furusato/onestop/">ワンストップ特例</a>が使えます。</p>',
    },
  ];
  const body = `
<h1>${tool.name}</h1>
<p class="lead">1万円あたりの量で返礼品をくらべます。</p>
${AD}
${mihon ? MIHON : ''}
<div class="hr-sheet">
  <section class="hr-group" aria-labelledby="g-first">
    <p class="hr-head" id="g-first"><span>はじめての1件</span><small>2万円まで・レビュー10件以上</small></p>
    <ol class="hr-list">
    ${picks.map((p, i) => row(p.x, i, mihon, p.label)).join('\n    ')}
    </ol>
  </section>
  <nav class="hr-cats" aria-label="カテゴリ">
    ${HENREIHIN_CATS.map((c) => `<a class="tool-btn tool-link" href="/furusato/henreihin/${c.slug}/">${esc(c.name)}<small>${counts[c.slug] || 0}件</small></a>`).join('\n    ')}
  </nav>
  <p class="hr-at">楽天の情報は${atText(data.fetchedAt)}の時点です</p>
</div>

${HOW}

${section('faq', 'よくある質問', faqHtml(faqs))}

${relatedHtml(tool)}

<p class="hr-credit">${CREDIT}</p>
`;
  const html = page({
    path,
    title: `${tool.name}｜お米・肉・魚介・日用品を1万円あたりの量でくらべる（楽天ふるさと納税）`,
    description: '楽天ふるさと納税の返礼品を、商品名に書かれた量から1万円あたりの量を出してくらべます。お米・肉・魚介・日用品の一覧と、はじめての人向けに寄付額2万円までから選んだ3件をのせています。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: toolBySlug('furusato').name, path: '/furusato/' },
      { name: tool.name, path },
    ],
    jsonLd: [toolLd(tool, '楽天ふるさと納税の返礼品を、1万円あたりの量でくらべる一覧。'), faqLd(faqs)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    body,
    ...common(mihon),
  });
  return { path, html, sitemap: !mihon, updated: tool.updated };
}

export default function render() {
  if (HENREIHIN_MODE === 'off') return [];
  const data = loadData();
  const mihon = HENREIHIN_MODE !== 'api' || data.mihon === true;
  const cats = HENREIHIN_CATS.map((c) => renderCat(c, data, mihon));
  const counts = Object.fromEntries(HENREIHIN_CATS.map((c, i) => [c.slug, cats[i].count]));
  return [renderTop(data, mihon, counts), ...cats.map(({ count, ...p }) => p)];
}
