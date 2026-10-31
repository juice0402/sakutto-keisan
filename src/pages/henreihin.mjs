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
import { hrPrepare, firstPick, hrStats } from '../lib/henreihin.mjs';
import { fmt, yenBand } from '../lib/number.mjs';

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
const dayText = (iso) => {
  const j = new Date(new Date(iso).getTime() + 9 * 3600e3);
  return `${j.getUTCMonth() + 1}月${j.getUTCDate()}日`;
};
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

// 一覧の上の1行（10/31 AdSense の再審査：その日の一覧から出した自前の数字。5件より少ないときは出さない）
const SUM_MIN = 5;
const sumLine = (st, unit, name = '') =>
  st && st.count >= SUM_MIN
    ? `${name ? `${name}は${st.count}件で、1万円あたり` : `この一覧は${st.count}件。1万円あたりの量は`}${perText(st.min)}〜${perText(st.max)}${unit}${name ? '、' : 'で、'}まん中は${perText(st.median)}${unit}です。`
    : '';

// 「選ぶときに見るところ」（カテゴリのページ）。数字はその日の一覧から
function erabiHtml(cat, lists) {
  const all = lists.flatMap(({ list }) => list);
  const st = hrStats(all);
  if (!st) return '';
  const one = lists.length === 1 ? lists[0] : null;
  const unit = one ? unitName(one.g.unit) : '';
  const ps = [];
  ps.push(
    `<p>この一覧の寄付額は${fmt(st.minPrice)}円から${fmt(st.maxPrice)}円までです。寄付額2万円までの返礼品は${st.under2}件${
      one && st.under2 ? `で、その中で1万円あたりの量がいちばん多いのは${perText(st.under2Max)}${unit}です` : 'です'
    }。寄付額が大きい返礼品ほど1万円あたりの量が多いとは限らないので、上の寄付額のタイルでしぼってから量を見ると、くらべやすくなります。</p>`,
  );
  ps.push(
    st.teiki
      ? `<p>定期便は${st.teiki}件あります。定期便の量と寄付額は全部の回の合計で、1回に届く量は、合計を回数でわった量です。同じ1万円あたりでも、定期便は1回に届く量が少なくなります。</p>`
      : '<p>いまの一覧に定期便はありません。定期便が入ったときは、全部の回を合わせた量で1万円あたりを出します。</p>',
  );
  ps.push(
    `<p>商品名に届く時期が書いてある返礼品は${st.when}件です。書いていない返礼品は、楽天のページで発送の時期を確かめてください。寄付がどの年の分になるかは、返礼品が届く日ではなく、寄付した日で決まります。年末の寄付の期限は<a href="/furusato/shimekiri/">ふるさと納税はいつまで</a>で数えられます。</p>`,
  );
  if (cat.slug === 'kome' && (st.musen || st.genmai))
    ps.push(`<p>この一覧のうち、無洗米は${st.musen}件、玄米は${st.genmai}件です。玄米は精米すると重さが減るので、白米と1万円あたりの量をくらべるときは、その分を引いて見てください。</p>`);
  if (cat.slug === 'gyokai' && st.shell)
    ps.push(`<p>殻つきの返礼品は${st.shell}件で、1万円あたりの量は殻や頭もふくめた重さで出しています。むき身や切り身とくらべるときは、食べられる量がその分少ないと考えてください。</p>`);
  if (cat.slug === 'niku') {
    const kowake = all.filter((x) => /小分け/.test(x.name)).length;
    ps.push(`<p>商品名に小分けと書いてある返礼品は${kowake}件です。この一覧は重さだけでくらべていて、部位や切り方、小分けの有無は並び順に入れていません。</p>`);
  }
  if (cat.slug === 'nichiyouhin')
    ps.push('<p>トイレットペーパーは、2倍巻きなどの長巻きも、ふつうの長さの何ロール分かに直してくらべています。ティッシュは箱の数でくらべていて、1箱の枚数のちがいは入れていません。</p>');
  ps.push(
    '<p>寄付できる額の目安は、年収と家族の形で決まります。先に<a href="/furusato/">上限の目安</a>を出しておくと、寄付額のタイルでどこまでしぼるかを決めやすくなります。</p>',
  );
  return section('erabi', '選ぶときに見るところ', ps.join('\n'));
}

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
  // 説明文（meta description）は、その日の一覧から作る（件数・寄付額のいちばん低い額を幅で・取った日）
  const prices = lists.flatMap(({ list }) => list.map((x) => x.price));
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
${(() => {
  const lines = lists.map(({ g, list }) => sumLine(hrStats(list), unitName(g.unit), many ? g.name : '')).filter(Boolean);
  return lines.length ? `<p class="hr-sum">${lines.join('')}</p>` : '';
})()}
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

${erabiHtml(cat, lists)}

${section('faq', 'よくある質問', faqHtml(faqs))}

${relatedHtml(tool)}

<p class="hr-credit">${CREDIT}</p>
`;
  const html = page({
    path,
    title: `${tool.name}｜1万円あたり${unitWord}か多い順（楽天ふるさと納税）`,
    description: `楽天ふるさと納税の${cat.name}の返礼品${at}件を、商品名の量から1万円あたり${unitWord}かを出して多い順に並べています。${prices.length ? `寄付額は${yenBand(Math.min(...prices))}からで、` : ''}量が1つに決まっているものだけです。楽天の情報は${dayText(data.fetchedAt)}の時点です。`,
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
  return { path, html, sitemap: !mihon, updated: tool.updated, count: lists.reduce((s, x) => s + x.list.length, 0), stats: hrStats(lists[0].list), unit: unitName(lists[0].g.unit) };
}

/* ---- 入口：はじめての1件（お米・肉・魚介から1つずつ）とカテゴリ ---- */
function renderTop(data, mihon, counts, catStats) {
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
  // 一覧の上の1行と「選ぶときに見るところ」（10/31 AdSense の再審査。カテゴリの最初の一覧のまん中の量）
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const meds = HENREIHIN_CATS.map((c) => ({ c, st: catStats[c.slug]?.stats, unit: catStats[c.slug]?.unit })).filter((x) => x.st && x.st.count >= SUM_MIN);
  const medText = meds.map(({ c, st, unit }) => `${c.groups.length > 1 ? c.groups[0].name : c.name}が${perText(st.median)}${unit}`).join('、');
  const topSum = total && meds.length ? `${HENREIHIN_CATS.length}つのカテゴリで${total}件をのせています。1万円あたりの量のまん中は、${medText}です。` : '';
  const k = meds[0];
  const spread = k && k.st.min > 0 ? Math.round((k.st.max / k.st.min) * 10) / 10 : 0;
  const topErabi = [
    `<p>カテゴリごとの一覧は、商品名に書かれた量を寄付額でわって、1万円あたりの量が多い順に並べています。${
      spread >= 1.2 ? `同じ${k.c.name}でも、いちばん多い返礼品といちばん少ない返礼品で、1万円あたりの量に${spread}倍の差があります。` : ''
    }寄付額だけでなく、量を寄付額でわった数字でくらべると、同じ寄付でどれだけ届くかがわかります。</p>`,
    meds.length
      ? `<p>いまの一覧の寄付額の幅は、${meds
          .map(({ c, st }) => `${c.groups.length > 1 ? c.groups[0].name : c.name}が${fmt(st.minPrice)}円から${fmt(st.maxPrice)}円まで`)
          .join('、')}です。カテゴリの一覧では、寄付額のタイルで「2万円まで」「3万円まで」のようにしぼれます。</p>`
      : '',
    '<p>寄付がどの年の分になるかは、返礼品が届く日ではなく、寄付した日で決まります。年末に寄付するときは、<a href="/furusato/shimekiri/">ふるさと納税はいつまで</a>で期限までの日数を見ておくと、申し込みが年をこえるのを防げます。</p>',
    '<p>寄付できる額の目安は、年収と家族の形で決まります。上限より多く寄付すると、こえた分は税金から引かれず、自分の負担になります。寄付した額は<a href="/furusato/memo/">寄付メモ</a>に残しておくと、のこりの枠を見ながら次の返礼品を選べます。</p>',
    '<p>楽天の情報は1日1回取り直しています。寄付額や受付の状況は変わることがあるので、申し込む前に楽天のページで確かめてください。</p>',
  ].join('\n');
  const body = `
<h1>${tool.name}</h1>
<p class="lead">1万円あたりの量で返礼品をくらべます。</p>
${AD}
${mihon ? MIHON : ''}
${topSum ? `<p class="hr-sum">${topSum}</p>` : ''}
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

${section('erabi', '選ぶときに見るところ', topErabi)}

${section('faq', 'よくある質問', faqHtml(faqs))}

${relatedHtml(tool)}

<p class="hr-credit">${CREDIT}</p>
`;
  const html = page({
    path,
    title: `${tool.name}｜お米・肉・魚介・日用品を1万円あたりの量でくらべる（楽天ふるさと納税）`,
    description: `楽天ふるさと納税の返礼品を、商品名に書かれた量から1万円あたりの量を出してくらべます。${HENREIHIN_CATS.map((c) => c.name).join('・')}の${Object.values(counts).reduce((a, b) => a + b, 0)}件と、寄付額2万円までから選んだ${picks.length}件をのせています。楽天の情報は${dayText(data.fetchedAt)}の時点です。`,
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
  const catStats = Object.fromEntries(HENREIHIN_CATS.map((c, i) => [c.slug, { stats: cats[i].stats, unit: cats[i].unit }]));
  return [renderTop(data, mihon, counts, catStats), ...cats.map(({ count, stats, unit, ...p }) => p)];
}
