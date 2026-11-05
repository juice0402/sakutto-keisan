// 読みものの棚（#131）：src/yomimono/ の読みものの決まりと、tests/fixtures/yomimono/ の見本（本番には出ない）で作るページ・一覧・RSS・入口
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setInlineScripts } from '../src/layout.mjs';
import { loadYomimono, checkYomimono, yomimono, setYomimono, sortNew } from '../src/yomimono/_shelf.mjs';
import renderShelf, { renderYomimono, feedXml } from '../src/pages/yomimono.mjs';
import renderTouyu from '../src/pages/touyu-dai.mjs';
import renderHome from '../src/pages/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL = yomimono();
const MIHON = sortNew(await loadYomimono(join(HERE, 'fixtures/yomimono')));
// ページの部品が入れるスクリプト（テストではスクリプトの中身は見ない）
setInlineScripts(Object.fromEntries(readdirSync(join(HERE, '../src/client')).filter((f) => f.endsWith('.js')).map((f) => [f, '/* */'])));

const withShelf = (list, fn) => {
  setYomimono(list);
  try {
    return fn();
  } finally {
    setYomimono(REAL);
  }
};
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('本番の読みもの：要る欄がそろう・slug とファイル名が同じ・slug が重ならない', () => {
  for (const y of REAL) {
    assert.deepEqual(checkYomimono(y), []);
    assert.equal(y.file, `${y.slug}.mjs`);
  }
  assert.equal(new Set(REAL.map((y) => y.slug)).size, REAL.length);
});

test('見本の読みものも同じ決まりを通る（点検の関数が動いているか）', () => {
  assert.equal(MIHON.length, 3);
  for (const y of MIHON) {
    assert.deepEqual(checkYomimono(y), []);
    assert.equal(y.file, `${y.slug}.mjs`);
  }
  const bad = { ...MIHON[0], tools: ['nai-keisan'], description: '短い', sources: [{ name: 'x', url: 'http://x' }], lead: 'とても長い1行の説明はスマホの幅の1行に入らないので止まります' };
  const err = checkYomimono(bad).join('\n');
  for (const w of ['lead', 'nai-keisan', 'description', '出典']) assert.ok(err.includes(w), w);
});

test('0本のときは何も作らない（一覧・RSS・トップの節・計算のページの節・head の RSS）', () => {
  assert.deepEqual(renderYomimono([]), []);
  withShelf([], () => {
    assert.deepEqual(renderShelf(), []);
    const home = renderHome().html;
    assert.ok(!home.includes('/yomimono/'));
    assert.ok(!renderTouyu().html.includes('この計算の読みもの'));
  });
});

test('見本から一覧・各ページ・RSS ができる（新しい順）', () => {
  const out = renderYomimono(MIHON);
  assert.deepEqual(out.map((p) => p.path), ['/yomimono/', '/yomimono/touyu-mihon/', '/yomimono/danbou-mihon/', '/yomimono/point-mihon/', '/yomimono/feed.xml']);
  const [list] = out;
  assert.equal(list.sitemap, true);
  assert.equal(list.updated, '2026-11-04');
  assert.ok(list.html.includes('<h1>読みもの</h1>'));
  assert.ok(list.html.indexOf('/yomimono/touyu-mihon/') < list.html.indexOf('/yomimono/danbou-mihon/'));
  assert.ok(list.html.includes('<link rel="alternate" type="application/rss+xml"'));
  const feed = out.at(-1);
  assert.equal(feed.sitemap, undefined);
  assert.equal(feed.html, undefined);
});

test('各ページ：パンくず・h1・リード・本文・自分の数字で確かめる・出典・よくある質問・ほかの読みもの・構造化データ・共有画像・手帳', () => {
  const pages = Object.fromEntries(renderYomimono(MIHON).map((p) => [p.path, p]));
  const p = pages['/yomimono/touyu-mihon/'];
  const h = p.html;
  assert.equal(p.updated, '2026-11-04');
  assert.ok(h.includes('<title>ファンヒーターの大きさで灯油代はどれだけ変わる？｜読みもの｜サクッと計算</title>'));
  assert.ok(h.includes('<h1>ファンヒーターの大きさで灯油代はどれだけ変わる？</h1>'));
  assert.ok(h.includes('<p class="lead">9畳用と17畳用を同じ時間でくらべます。</p>'));
  assert.ok(h.includes('2026年11月4日更新'));
  assert.ok(h.includes('<body data-theme="seikatsu" data-cat="seikatsu"'));
  assert.ok(h.includes('/og/touyu-dai.png'));
  // 節の順番
  const order = ['id="kotae"', 'id="ym-tools"', 'id="ym-src"', 'id="ym-faq"', 'id="ym-more"'].map((x) => h.indexOf(x));
  assert.ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), order.join(','));
  assert.ok(h.includes('<a class="tool-card" href="/touyu-dai/"><span class="tool-name">灯油代の計算</span>'));
  assert.ok(h.includes('href="/denki-dai/"'));
  assert.ok(/<ul class="src-list"><li><a href="https:\/\/www\.enecho\.meti\.go\.jp\/[^"]+" rel="noopener">資源エネルギー庁の価格調査<\/a>（灯油18Lの全国平均の店頭価格、2026年10月15日に確認）<\/li>/.test(h));
  // ほかの読みもの：同じカテゴリだけ（ポイントの見本は出ない）と一覧へ
  const more = h.slice(h.indexOf('id="ym-more"'));
  assert.ok(more.includes('/yomimono/danbou-mihon/') && !more.includes('/yomimono/point-mihon/') && more.includes('<a href="/yomimono/">読みもの一覧へ</a>'));
  // 構造化データ
  const types = ld(h).map((o) => o['@type']);
  assert.deepEqual(types, ['Article', 'FAQPage', 'BreadcrumbList']);
  const art = ld(h)[0];
  assert.equal(art.headline, 'ファンヒーターの大きさで灯油代はどれだけ変わる？');
  assert.equal(art.datePublished, '2026-11-03');
  assert.equal(art.dateModified, '2026-11-04');
  assert.equal(art.author.name, 'サクッと計算');
  assert.equal(art.publisher.name, 'サクッと計算');
  assert.deepEqual(ld(h)[2].itemListElement.map((x) => x.name), ['ホーム', '読みもの', 'ファンヒーターの大きさで灯油代はどれだけ変わる？']);
  // よくある質問のない読みもの：節も FAQPage もない。公開の日だけ
  const d = pages['/yomimono/danbou-mihon/'].html;
  assert.ok(!d.includes('id="ym-faq"') && !ld(d).some((o) => o['@type'] === 'FAQPage'));
  assert.ok(d.includes('2026年11月1日公開'));
  // カテゴリの手帳と見張りの印
  assert.ok(pages['/yomimono/point-mihon/'].html.includes('<body data-theme="seikatsu" data-cat="point"'));
});

test('RSS 2.0：新しい順の題・URL・1行・公開日', () => {
  const xml = feedXml(MIHON);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"'));
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  assert.equal(items.length, 3);
  assert.ok(items[0].includes('<title>ファンヒーターの大きさで灯油代はどれだけ変わる？</title>'));
  assert.ok(items[0].includes('<link>https://sakutto-keisan.com/yomimono/touyu-mihon/</link>'));
  assert.ok(items[0].includes('<description>9畳用と17畳用を同じ時間でくらべます。</description>'));
  assert.ok(items[0].includes('<pubDate>Mon, 02 Nov 2026 15:00:00 GMT</pubDate>'));
  // 20本まで
  const many = Array.from({ length: 25 }, (_, i) => ({ ...MIHON[0], slug: `m${i}` }));
  assert.equal([...feedXml(many).matchAll(/<item>/g)].length, 20);
  // 題の & < はエスケープ
  assert.ok(feedXml([{ ...MIHON[0], title: 'A&B<C' }]).includes('<title>A&amp;B&lt;C</title>'));
});

test('一覧は10本をこえたらカテゴリの見出しで分ける', () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ ...MIHON[i % 3], slug: `m${i}` }));
  const html = renderYomimono(many)[0].html;
  assert.ok(html.includes('<h2 id="ym-seikatsu">生活・お買い物</h2>') && html.includes('<h2 id="ym-point">楽天のポイント</h2>'));
  assert.ok(!renderYomimono(MIHON)[0].html.includes('id="ym-seikatsu"'));
});

test('入口：/touyu-dai/ の「この計算の読みもの」（関連ツールの前・新しい順に3本まで）とトップの「読みもの」', () => {
  withShelf(MIHON, () => {
    const t = renderTouyu().html;
    const at = t.indexOf('<h2 id="ym-for">この計算の読みもの</h2>');
    assert.ok(at > 0 && at < t.indexOf('id="related"'));
    const sec = t.slice(at, t.indexOf('id="related"'));
    assert.ok(sec.indexOf('/yomimono/touyu-mihon/') < sec.indexOf('/yomimono/danbou-mihon/'));
    assert.ok(!sec.includes('point-mihon'));
    const home = renderHome().html;
    const y = home.indexOf('<h2 id="yomi">読みもの</h2>');
    assert.ok(y > 0 && y < home.indexOf('id="recent"'));
    // パソコンの見開きでは右の段
    assert.ok(y > home.indexOf('<div class="pc-right">'));
    assert.ok(home.includes('<a href="/yomimono/">読みもの一覧へ</a>'));
    assert.ok(home.includes('<link rel="alternate" type="application/rss+xml"'));
  });
  withShelf(Array.from({ length: 5 }, (_, i) => ({ ...MIHON[0], slug: `m${i}` })), () => {
    const t = renderTouyu().html;
    const sec = t.slice(t.indexOf('id="ym-for"'), t.indexOf('id="related"'));
    assert.equal([...sec.matchAll(/class="tool-card"/g)].length, 3);
  });
});
