// サイトを dist/ に書き出す（依存パッケージなし。Node だけで動く）
//   1. CSS とブラウザ用スクリプトを小さくして、各ページの HTML に埋め込む（読み込みは HTML の1回だけ）
//   2. src/pages/*.mjs の各ページを HTML に
//   3. public/ をそのままコピー、sitemap.xml を作る
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, cpSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// --- CSS：コメントと余分な空白を取り、HTML の <style> に埋め込む（読み込みが1回へって表示が速い）
const css = readFileSync(join(ROOT, 'src/styles/site.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => (/[{};,]$/.test(l) ? l : `${l} `))
  .join('')
  .replace(/\s*([{};,>])\s*/g, '$1') // 「:」はさわらない（:hover などのセレクタを壊さないため）
  .replace(/;}/g, '}');

// --- CSS をページごとに小さく：そのページの HTML とスクリプトに出てこないクラス・id のルールを落とす
//   決まり：クラス名は HTML か JS にそのままの形で書く（'is-' + x のように組み立てない）
//   [data-theme="…"] はそのページのテーマだけ残す。@keyframes は残ったルールが使うものだけ
const CSS_TOKEN = /[.#](-?[A-Za-z_][\w-]*)/g;
function splitTop(text, sep) {
  // かっこ（:has(...) など）の中の区切りでは切らない
  const out = [];
  let depth = 0;
  let cur = '';
  for (const c of text) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === sep && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}
function pruneCss(cssText, html) {
  const text = html.replace(/<style>[\s\S]*?<\/style>/, '');
  const theme = (html.match(/<body data-theme="([^"]+)"/) || [])[1];
  const memo = new Map();
  const has = (name) => {
    if (!memo.has(name)) memo.set(name, new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(text));
    return memo.get(name);
  };
  const keepSel = (sel) => {
    for (const m of sel.matchAll(/\[data-theme="([^"]+)"\]/g)) if (m[1] !== theme) return false;
    return [...sel.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, (m) => m.replace(/[.#]/g, ' ')).matchAll(CSS_TOKEN)].every((m) => has(m[1]));
  };
  const keyframes = [];
  const walk = (src) => {
    let out = '';
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf('{', i);
      if (open < 0) break;
      const prelude = src.slice(i, open);
      let depth = 0;
      let j = open;
      for (; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}' && --depth === 0) break;
      }
      const block = src.slice(open + 1, j);
      if (/^@(media|supports)/.test(prelude)) {
        const inner = walk(block);
        if (inner) out += `${prelude}{${inner}}`;
      } else if (/^@keyframes/.test(prelude)) {
        keyframes.push([prelude, block]);
      } else if (prelude.startsWith('@')) {
        out += `${prelude}{${block}}`;
      } else {
        const sels = splitTop(prelude, ',').filter(keepSel);
        if (sels.length) out += `${sels.join(',')}{${block}}`;
      }
      i = j + 1;
    }
    return out;
  };
  let out = walk(cssText);
  for (const [prelude, block] of keyframes) {
    const name = prelude.replace('@keyframes', '').trim();
    if (new RegExp(`animation(-name)?:[^;}]*(?<![\\w-])${name}(?![\\w-])`).test(out)) out += `${prelude}{${block}}`;
  }
  return out;
}

// --- ブラウザ用スクリプト：import をたどって1つにまとめる（小さなバンドラー）
//   決まり：import は1行で `import { a, b } from './x.mjs';` の形。まとめると同じスコープになるので名前を重ねない
//   部品のファイル（src/lib・src/client/*.mjs）は、入口から使われている関数・定数だけを残す（ツリーシェイキング）
const IMPORT_RE = /^import\s+\{[^}]*\}\s+from\s+'(\.{1,2}\/[^']+)';?\s*$/;
const DECL_RE = /^(?:async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/;
const usesName = (text, name) => new RegExp(`(?<![\\w$])${name.replace(/\$/g, '\\$')}(?![\\w$])`).test(text);

function readModule(file, isEntry) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const deps = [];
  const body = [];
  for (const line of lines) {
    const m = line.match(IMPORT_RE);
    if (m) deps.push(resolve(dirname(file), m[1]));
    else if (/^\s*import\s/.test(line)) throw new Error(`${relative(ROOT, file)}: import は1行の { } 形式で書いてください → ${line}`);
    else body.push(line.replace(/^export\s+(?=(async\s+)?function|const|let|class)/, ''));
  }
  if (/^\s*export\s/m.test(body.join('\n'))) throw new Error(`${relative(ROOT, file)}: 未対応の export があります`);
  // 行頭（字下げなし）の宣言ごとに切り分ける。宣言の前のコメントは次の宣言に付ける
  const chunks = [];
  let pending = [];
  for (const line of body) {
    const d = line.match(DECL_RE);
    if (d) {
      chunks.push({ name: d[1], lines: [...pending, line] });
      pending = [];
    } else if (chunks.length && (/^\s/.test(line) || /^[\]})]/.test(line)) && !/^\s*(\/\/|\/\*\*|\*)/.test(line)) {
      chunks.at(-1).lines.push(...pending, line);
      pending = [];
    } else {
      pending.push(line);
    }
  }
  const rest = pending.filter((l) => l.trim() && !/^\s*(\/\/|\/\*\*|\*)/.test(l));
  if (rest.length && !isEntry) throw new Error(`${relative(ROOT, file)}: 宣言の外に処理があります（部品のファイルには関数・定数だけを書く）→ ${rest[0]}`);
  return { deps, body: body.join('\n'), chunks: chunks.map((c) => ({ name: c.name, text: c.lines.join('\n') })) };
}

function bundle(entry) {
  const order = [];
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const mod = readModule(file, file === entry);
    mod.deps.forEach(visit);
    order.push({ file, mod });
  };
  visit(entry);
  // 入口は全部残し、部品は使われている宣言だけをたどって残す
  const entryMod = order.find((x) => x.file === entry).mod;
  const parts = order.filter((x) => x.file !== entry).flatMap((x) => x.mod.chunks.map((c) => ({ ...c, file: x.file, keep: false })));
  let used = entryMod.body;
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of parts) {
      if (!c.keep && usesName(used, c.name)) {
        c.keep = true;
        used += `\n${c.text}`;
        changed = true;
      }
    }
  }
  const code = [
    ...order.filter((x) => x.file !== entry).map((x) => parts.filter((c) => c.file === x.file && c.keep).map((c) => c.text).join('\n')),
    entryMod.body,
  ].join('\n');
  return minifyJs(`(() => {\n'use strict';\n${code}\n})();\n`);
}

// 行だけのコメント（// と /* */）・説明コメント・字下げ・空行を取る（文字列の中身は変えない。複数行のテンプレート文字列があれば字下げは残す）
function minifyJs(src) {
  const lines = src.replace(/^\s*\/\*\*[\s\S]*?\*\/\s*$/gm, '').split('\n');
  const multiLineTemplate = lines.some((l) => (l.match(/`/g) || []).length % 2 === 1);
  return lines
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\/\*(?:(?!\*\/).)*\*\/\s*$/.test(l) && l.trim() !== '')
    .map((l) => (multiLineTemplate ? l : stripTrailingComment(l).trim()))
    .join('\n');
}
// 行の後ろの「 // 説明」を取る。その前に ' " ` が閉じていない（文字列の中かもしれない）ときは何もしない
function stripTrailingComment(line) {
  const i = line.indexOf(' // ');
  if (i <= 0) return line;
  const before = line.slice(0, i);
  const odd = (ch) => (before.split(ch).length - 1) % 2 === 1;
  if (odd("'") || odd('"') || odd('`') || /\/[^/]*$/.test(before.replace(/\/\//g, ''))) return line;
  return before;
}
const scripts = {};
for (const f of readdirSync(join(ROOT, 'src/client'))) {
  if (!f.endsWith('.js')) continue; // .mjs は部品、.js が入口
  scripts[f] = bundle(join(ROOT, 'src/client', f)).replaceAll('</script', '<\\/script');
}

// --- ページ
const { setInlineScripts, setInlineCss } = await import(pathToFileURL(join(ROOT, 'src/layout.mjs')));
setInlineScripts(scripts);
setInlineCss(css);
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
  // そのページで使う CSS だけにして、行頭の字下げと空行を取る（<pre> や <textarea> は使っていない）
  const html = p.html.replace(/<style>([\s\S]*?)<\/style>/, (_, c) => `<style>${pruneCss(c, p.html)}</style>`);
  writeFileSync(file, html.split('\n').map((l) => l.trim()).filter(Boolean).join('\n') + '\n');
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
// IndexNow の鍵のファイル（検索エンジンが「このサイトの持ち主からの知らせか」を確かめる）
if (SITE.indexnowKey) writeFileSync(join(DIST, `${SITE.indexnowKey}.txt`), SITE.indexnowKey);
// AdSense の ads.txt（運営者IDを入れたときだけ）
if (SITE.adsense) writeFileSync(join(DIST, 'ads.txt'), `google.com, ${SITE.adsense.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);

console.log(`built ${pages.length} pages, ${Object.keys(scripts).length} scripts → dist/`);
