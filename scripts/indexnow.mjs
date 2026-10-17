// 公開したページを IndexNow（Bing・Yandex・Naver・Seznam・Yep。Yahoo!・DuckDuckGo の多くは Bing の結果）に知らせる
// Google は IndexNow に入っていないので、Google はサイトマップとリンクから見つけてもらう
//
// 本番（main）へのアップロードの前後で、GitHub Actions が動かす：
//   node scripts/indexnow.mjs prepare  … 本番にある前回のページの指紋（/indexnow-pages.json）とくらべて、
//                                        中身が変わったページ・新しいページだけを .indexnow-urls.txt に書く。今回の指紋を dist に置く
//   node scripts/indexnow.mjs send     … アップロードが終わったあとに、そのページだけを知らせる（変わっていなければ何もしない）
// 知らせに失敗しても公開は止めない（GitHub のログに注意を出すだけ）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const LIST = join(ROOT, '.indexnow-urls.txt');
const MANIFEST = 'indexnow-pages.json';
const { SITE } = await import(pathToFileURL(join(ROOT, 'src/site.mjs')));
const notice = (msg) => console.log(`::notice title=IndexNow::${msg}`);
const warn = (msg) => console.log(`::warning title=IndexNow::${msg}`);

/** sitemap のページと、その中身の指紋 */
function pages() {
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const out = {};
  for (const url of urls) {
    const path = url.slice(SITE.url.length) || '/';
    const html = readFileSync(join(DIST, path, 'index.html'));
    out[url] = createHash('sha256').update(html).digest('hex').slice(0, 16);
  }
  return out;
}

async function prepare() {
  const now = pages();
  let before = {};
  try {
    const res = await fetch(`${SITE.url}/${MANIFEST}`, { headers: { 'cache-control': 'no-cache' } });
    if (res.ok) before = await res.json();
  } catch {
    // 前回の指紋がない（はじめて・つながらない）ときは、全部のページを知らせる
  }
  const changed = Object.keys(now).filter((u) => before[u] !== now[u]);
  writeFileSync(join(DIST, MANIFEST), JSON.stringify(now));
  writeFileSync(LIST, changed.join('\n'));
  console.log(`変わったページ ${changed.length} 件／全 ${Object.keys(now).length} 件`);
}

async function send() {
  const urls = existsSync(LIST) ? readFileSync(LIST, 'utf8').split('\n').filter(Boolean) : [];
  if (!urls.length) return notice('変わったページがないので、知らせませんでした');
  const host = new URL(SITE.url).host;
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: SITE.indexnowKey, keyLocation: `${SITE.url}/${SITE.indexnowKey}.txt`, urlList: urls }),
    });
    // 200：受け付けた／202：受け付けた（鍵の確認はこれから）
    if (res.status === 200 || res.status === 202) notice(`${urls.length} 件を知らせました（${res.status}）：${urls.map((u) => u.slice(SITE.url.length) || '/').join(' ')}`);
    else warn(`知らせられませんでした（${res.status}）：${(await res.text()).slice(0, 200)}`);
  } catch (e) {
    warn(`知らせられませんでした：${e.message}`);
  }
}

const cmd = process.argv[2];
if (cmd === 'prepare') await prepare();
else if (cmd === 'send') await send();
else console.log('使い方：node scripts/indexnow.mjs prepare|send');
