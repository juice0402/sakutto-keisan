// ビルドした dist/ の全ページを点検する（CI で毎回動く）
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const { SITE } = await import(pathToFileURL(join(ROOT, 'src/site.mjs')));
const { TOOLS } = await import(pathToFileURL(join(ROOT, 'src/tools.mjs')));

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const count = (s, re) => (s.match(re) || []).length;

// 内部リンク先が dist にあるか
const resolves = (href) => {
  const p = href.split(/[?#]/)[0];
  if (p === '' ) return true;
  const target = join(DIST, p);
  return existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
};

for (const file of htmlFiles) {
  const rel = '/' + relative(DIST, file).replace(/index\.html$/, '');
  const html = readFileSync(file, 'utf8');
  const noindex = html.includes('<meta name="robots" content="noindex">');

  if (!html.startsWith('<!doctype html>')) fail(rel, 'doctype がない');
  if (!html.includes('<html lang="ja">')) fail(rel, 'lang="ja" がない');
  if (!html.includes('name="viewport"')) fail(rel, 'viewport がない');
  if (count(html, /<title>/g) !== 1) fail(rel, '<title> が1つではない');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!title.includes(SITE.name)) fail(rel, `title にサイト名がない: ${title}`);
  const desc = (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
  if (desc.length < 30 || desc.length > 160) fail(rel, `description の長さが ${desc.length} 文字（30〜160）`);
  if (count(html, /<h1[ >]/g) !== 1) fail(rel, '<h1> が1つではない');
  if (!noindex) {
    const canon = (html.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
    if (canon !== SITE.url + rel) fail(rel, `canonical がちがう: ${canon}`);
  }
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '');
  for (const bad of ['undefined', 'NaN', '[object Object]']) if (text.includes(bad)) fail(rel, `「${bad}」が出ている`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { fail(rel, '構造化データの JSON が壊れている'); }
  }
  // 外部のファイルを読み込まない（入力した数字を送らない約束・表示の速さのため）
  for (const m of html.matchAll(/<(?:script|img|link|iframe)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]*"/g)) {
    if (!m[0].includes('rel="canonical"')) fail(rel, `外部のファイルを読み込んでいる: ${m[0].slice(0, 80)}`);
  }
  for (const m of html.matchAll(/\b(?:href|src)="(\/[^"]*)"/g)) {
    if (!resolves(m[1])) fail(rel, `リンク先がない: ${m[1]}`);
  }
  // 入力欄はスマホで数字キーボード・ラベルつき
  for (const m of html.matchAll(/<input\b[^>]*>/g)) {
    const tag = m[0];
    if (tag.includes('type="radio"')) continue;
    if (!tag.includes('inputmode=')) fail(rel, `inputmode がない入力欄: ${tag}`);
    const id = (tag.match(/id="([^"]+)"/) || [])[1];
    if (!id || !html.includes(`for="${id}"`)) fail(rel, `ラベルのない入力欄: ${tag}`);
  }
}

// 公開中のツールのページがあり、sitemap に載っているか
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
for (const t of TOOLS.filter((x) => x.published)) {
  const f = join(DIST, t.slug, 'index.html');
  if (!existsSync(f)) { fail(`/${t.slug}/`, '公開中なのにページがない'); continue; }
  const title = (readFileSync(f, 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!title.startsWith(t.name.replace(/（.*$/, ''))) fail(`/${t.slug}/`, `title の先頭がツール名でない: ${title}`);
  if (!sitemap.includes(`<loc>${SITE.url}/${t.slug}/</loc>`)) fail('/sitemap.xml', `${t.slug} が載っていない`);
  if (!t.updated) fail(`/${t.slug}/`, 'tools.mjs に updated がない');
}
for (const t of TOOLS.filter((x) => !x.published)) {
  if (existsSync(join(DIST, t.slug))) fail(`/${t.slug}/`, '準備中なのにページがある');
}
for (const need of ['robots.txt', 'sitemap.xml', '404.html', '_headers', 'favicon.svg', 'apple-touch-icon.png']) {
  if (!existsSync(join(DIST, need))) fail(need, 'ない');
}

// ブラウザ用スクリプトが文法的に正しいか（まとめたときの名前の重なりもここで見つかる）
for (const f of files.filter((x) => x.endsWith('.js'))) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail(relative(DIST, f), `スクリプトの文法エラー: ${String(e.stderr).split('\n').slice(0, 5).join(' ')}`); }
}

if (errors.length) {
  console.error(`✗ ${errors.length} 件の問題:\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${htmlFiles.length} ページ・${files.length} ファイルを点検しました`);
