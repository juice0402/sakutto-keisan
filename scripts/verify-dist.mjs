// ビルドした dist/ の全ページを点検する（CI で毎回動く）
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const { SITE } = await import(pathToFileURL(join(ROOT, 'src/site.mjs')));
const { TOOLS } = await import(pathToFileURL(join(ROOT, 'src/tools.mjs')));
const { OCR_VERSION } = await import(pathToFileURL(join(ROOT, 'src/client/ocr.mjs')));

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
  // タグの閉じ忘れ・入れ子のまちがい（テンプレートの書きまちがいを見つける）
  {
    const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
    const body = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    const stack = [];
    for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g)) {
      const [, close, rawName, selfClose] = m;
      const name = rawName.toLowerCase();
      if (VOID.has(name) || selfClose || name === '!doctype') continue;
      if (!close) { stack.push(name); continue; }
      const top = stack.pop();
      if (top !== name) { fail(rel, `タグの入れ子がおかしい: <${top || 'なし'}> の中で </${name}>`); break; }
    }
    if (stack.length) fail(rel, `閉じていないタグ: ${stack.join(', ')}`);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) fail(rel, `同じ id が2回以上ある（同じ見出しや部品の重複）: ${[...new Set(dup)].join(', ')}`);
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '');
  for (const bad of ['undefined', 'NaN', '[object Object]']) if (text.includes(bad)) fail(rel, `「${bad}」が出ている`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { fail(rel, '構造化データの JSON が壊れている'); }
  }
  // SNSの共有画像が dist にあるか
  const ogImg = (html.match(/<meta property="og:image" content="([^"]+)">/) || [])[1] || '';
  if (!ogImg.startsWith(SITE.url + '/') || !existsSync(join(DIST, ogImg.slice(SITE.url.length)))) fail(rel, `og:image の画像がない: ${ogImg}`);
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
    if (!tag.includes('inputmode=') && !tag.includes('type="file"')) fail(rel, `inputmode がない入力欄: ${tag}`);
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
  if (!readFileSync(f, 'utf8').includes(`/og/${t.slug}.png`)) fail(`/${t.slug}/`, 'ツール専用の共有画像を使っていない（scripts/make-images.py で作る）');
}
for (const t of TOOLS.filter((x) => !x.published)) {
  if (existsSync(join(DIST, t.slug))) fail(`/${t.slug}/`, '準備中なのにページがある');
}
// 写真の読み取りソフト（scripts/fetch-ocr.mjs が公開のときに置く）。GitHub Actions では必ずあること
const ocrDir = join(DIST, 'ocr', OCR_VERSION);
const ocrNeed = ['tesseract.min.js', 'worker.min.js', 'lang/jpn.traineddata.gz', ...['-lstm', '-simd-lstm'].map((v) => `core/tesseract-core${v}.wasm.js`)];
if (process.env.CI || existsSync(ocrDir)) {
  for (const f of ocrNeed) if (!existsSync(join(ocrDir, f))) fail(`ocr/${OCR_VERSION}/${f}`, 'ない（scripts/fetch-ocr.mjs）');
} else {
  console.log(`（写真の読み取りソフト ocr/${OCR_VERSION}/ はこの環境にないので点検しません。GitHub Actions で点検します）`);
}
for (const need of ['robots.txt', 'sitemap.xml', '404.html', '_headers', 'favicon.svg', 'apple-touch-icon.png', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']) {
  if (!existsSync(join(DIST, need))) fail(need, 'ない');
}

// iPhoneの自動ズームを防ぐ：入力欄・選択欄の文字は16px以上、ページ全体はダブルタップでズームしない
const cssSources = [
  ...files.filter((x) => x.endsWith('.css')).map((f) => [f, readFileSync(f, 'utf8')]),
  ...htmlFiles.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => [f, m[1]])),
];
if (!cssSources.length) fail('dist', 'CSS が見つからない');
for (const [f, css] of cssSources) {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1];
    const size = (m[2].match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
    if (size && Number(size) < 16 && /(^|[\s,>+~])(input|select|textarea)\b/.test(sel)) {
      fail(relative(DIST, f), `入力欄の文字が16px未満（自動ズームの原因）: ${sel.trim()} → ${size}px`);
    }
  }
  if (!/(^|[},])html\s*\{[^}]*touch-action:\s*manipulation/.test(css)) fail(relative(DIST, f), 'html に touch-action: manipulation がない');
}
for (const file of htmlFiles) {
  const vp = (readFileSync(file, 'utf8').match(/<meta name="viewport" content="([^"]+)">/) || [])[1] || '';
  if (/user-scalable=no|maximum-scale/.test(vp)) fail(relative(DIST, file), '指2本のズームまで止めない（viewport に user-scalable / maximum-scale を書かない）');
}

// ブラウザ用スクリプト（各ページに埋め込み）が文法的に正しいか（まとめたときの名前の重なりもここで見つかる）
const tmpDir = mkdtempSync(join(tmpdir(), 'sakutto-verify-'));
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (/<script\b[^>]*\bsrc=/.test(html)) fail(relative(DIST, file), 'スクリプトは埋め込む（src で読み込まない）');
  [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => {
    const tmp = join(tmpDir, `s${i}.js`);
    writeFileSync(tmp, m[1]);
    try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
    catch (e) { fail(relative(DIST, file), `スクリプトの文法エラー: ${String(e.stderr).split('\n').slice(0, 5).join(' ')}`); }
  });
}
rmSync(tmpDir, { recursive: true, force: true });

if (errors.length) {
  console.error(`✗ ${errors.length} 件の問題:\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${htmlFiles.length} ページ・${files.length} ファイルを点検しました`);
