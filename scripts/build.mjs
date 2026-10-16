// サイトを dist/ に書き出す（依存パッケージなし。Node だけで動く）
//   1. CSS と ブラウザ用スクリプトを、中身のハッシュ付きの名前で dist/assets/ へ
//   2. src/pages/*.mjs の各ページを HTML に
//   3. public/ をそのままコピー、sitemap.xml を作る
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, cpSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });

const assets = {};
const emit = (name, ext, content) => {
  const file = `${name}.${hash(content)}.${ext}`;
  writeFileSync(join(DIST, 'assets', file), content);
  assets[`${name}.${ext}`] = `/assets/${file}`;
};

// --- CSS（コメントと余分な空白を取るだけ）
const css = readFileSync(join(ROOT, 'src/styles/site.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .join('\n');
emit('site', 'css', css);

// --- ブラウザ用スクリプト：import をたどって1ファイルにまとめる（小さなバンドラー）
//   決まり：import は1行で `import { a, b } from './x.mjs';` の形。まとめると同じスコープになるので名前を重ねない
const IMPORT_RE = /^import\s+\{[^}]*\}\s+from\s+'(\.{1,2}\/[^']+)';?\s*$/;
function bundle(entry) {
  const order = [];
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const lines = readFileSync(file, 'utf8').split('\n');
    const body = [];
    for (const line of lines) {
      const m = line.match(IMPORT_RE);
      if (m) visit(resolve(dirname(file), m[1]));
      else if (/^\s*import\s/.test(line)) throw new Error(`${relative(ROOT, file)}: import は1行の { } 形式で書いてください → ${line}`);
      else body.push(line.replace(/^export\s+(?=(async\s+)?function|const|let|class)/, ''));
    }
    const text = body.join('\n');
    if (/^\s*export\s/m.test(text)) throw new Error(`${relative(ROOT, file)}: 未対応の export があります`);
    order.push(`// ${relative(ROOT, file)}\n${text.trim()}`);
  };
  visit(entry);
  return `(() => {\n'use strict';\n${order.join('\n\n')}\n})();\n`;
}
for (const f of readdirSync(join(ROOT, 'src/client'))) {
  if (!f.endsWith('.js')) continue; // .mjs は部品、.js が入口
  emit(basename(f, '.js'), 'js', bundle(join(ROOT, 'src/client', f)));
}

// --- ページ
const { setAssets } = await import(pathToFileURL(join(ROOT, 'src/layout.mjs')));
setAssets(assets);
const pages = [];
for (const f of readdirSync(join(ROOT, 'src/pages')).sort()) {
  if (!f.endsWith('.mjs')) continue;
  const mod = await import(pathToFileURL(join(ROOT, 'src/pages', f)));
  const out = mod.default();
  pages.push(...(Array.isArray(out) ? out : [out]));
}
const seenPaths = new Set();
for (const p of pages) {
  if (seenPaths.has(p.path)) throw new Error(`同じURLのページが2つあります: ${p.path}`);
  seenPaths.add(p.path);
  const file = p.file ? join(DIST, p.file) : join(DIST, p.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, p.html);
}

// --- public/ と sitemap
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });
const { SITE } = await import(pathToFileURL(join(ROOT, 'src/site.mjs')));
const urls = pages
  .filter((p) => p.sitemap)
  .map((p) => `  <url><loc>${SITE.url}${p.path}</loc>${p.updated ? `<lastmod>${p.updated}</lastmod>` : ''}</url>`);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

console.log(`built ${pages.length} pages, ${Object.keys(assets).length} assets → dist/`);
