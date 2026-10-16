// 写真の読み取りの設定をくらべる実験（GitHub Actions で一時的に動かす。結果は注釈に出す）
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.gz': 'application/gzip', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let p = path.startsWith('/src/') ? join(ROOT, path) : path.startsWith('/fixtures/') ? join(ROOT, 'tests', path) : join(ROOT, 'dist', path);
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }).end(readFileSync(p));
}).listen(0, '127.0.0.1');
await new Promise((ok) => server.on('listening', ok));
const BASE = `http://127.0.0.1:${server.address().port}`;
const notice = (title, text) => console.log(`::notice title=${title}::${String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${BASE}/recipe/`);
await page.addScriptTag({ url: `${BASE}/ocr/5.1.1/tesseract.min.js` });

const EXPECT = [['鶏もも肉', 1, '枚'], ['塩', 0.5, '小さじ'], ['じゃがいも', 2, '個'], ['玉ねぎ', 1, '個'], ['にんじん', 1, '本'], ['ブロッコリー', 0.5, '個'], ['薄力粉', 3, '大さじ'], ['牛乳', 2.5, 'カップ'], ['水', 2, 'カップ'], ['固形コンソメ', 1, '個'], ['ローリエ', 1, '枚'], ['塩', 1, '小さじ'], ['こしょう', null, '少々'], ['白ワイン', 1, '大さじ'], ['バター', 2, '大さじ'], ['サラダ油', 1, '大さじ']];
const CONFIGS = [
  { name: 'A 全体・いまの前処理・PSM3', crop: null, prep: 'stretch', psm: '3' },
  { name: 'B 材料だけ切り抜き・PSM3', crop: [228, 280, 1272, 1600], prep: 'stretch', psm: '3' },
  { name: 'C 切り抜き・PSM4', crop: [228, 280, 1272, 1600], prep: 'stretch', psm: '4' },
  { name: 'D 切り抜き・PSM6', crop: [228, 280, 1272, 1600], prep: 'stretch', psm: '6' },
  { name: 'E 切り抜き・前処理なし・PSM6', crop: [228, 280, 1272, 1600], prep: 'none', psm: '6' },
  { name: 'F 切り抜き・二値化・PSM6', crop: [228, 280, 1272, 1600], prep: 'otsu', psm: '6' },
  { name: 'G 全体・PSM4', crop: null, prep: 'stretch', psm: '4' },
  { name: 'H 全体・PSM6', crop: null, prep: 'stretch', psm: '6' },
];
const out = [];
for (const cfg of CONFIGS) {
  const r = await page.evaluate(async ({ cfg, EXPECT }) => {
    const { parseRecipeText, cleanOcrText } = await import('/src/lib/recipe.mjs');
    const img = new Image();
    img.src = '/fixtures/recipe-ipad.png';
    await img.decode();
    const [sx, sy, sw, sh] = cfg.crop || [0, 0, img.naturalWidth, img.naturalHeight];
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    if (cfg.prep !== 'none') {
      const pic = ctx.getImageData(0, 0, sw, sh); const px = pic.data; const hist = new Uint32Array(256);
      for (let i = 0; i < px.length; i += 4) { const y = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8; px[i] = y; hist[y]++; }
      const total = px.length / 4;
      let lo = 0, hi = 255, sum = 0;
      for (let acc = 0; lo < 255 && acc + hist[lo] < total * 0.01; lo++) acc += hist[lo];
      for (let acc = 0; hi > 0 && acc + hist[hi] < total * 0.01; hi--) acc += hist[hi];
      for (let v = 0; v < 256; v++) sum += v * hist[v];
      const invert = sum / total < 110; const span = Math.max(1, hi - lo);
      // 大津の方法でしきい値
      let th = 128;
      if (cfg.prep === 'otsu') { let best = -1, wB = 0, sB = 0; for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF; const v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = t; } } }
      for (let i = 0; i < px.length; i += 4) {
        let y = cfg.prep === 'otsu' ? (px[i] > th ? 255 : 0) : Math.max(0, Math.min(255, ((px[i] - lo) * 255) / span));
        if (invert) y = 255 - y;
        px[i] = px[i + 1] = px[i + 2] = y;
      }
      ctx.putImageData(pic, 0, 0);
    }
    const t0 = performance.now();
    const w = await Tesseract.createWorker('jpn', 1, { workerPath: '/ocr/5.1.1/worker.min.js', corePath: '/ocr/5.1.1/core', langPath: '/ocr/5.1.1/lang', workerBlobURL: false });
    await w.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: cfg.psm });
    const { data } = await w.recognize(c, {}, { text: true, blocks: true });
    await w.terminate();
    const lines = (data.lines || (data.blocks || []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines))).map((l) => `${Math.round(l.confidence)}|${l.text.trim()}`);
    const text = cleanOcrText(data.text);
    const p = parseRecipeText(text);
    const got = p.rows.map((x) => [x.name, x.amount, x.unit]);
    const used = new Set();
    let qty = 0, exact = 0;
    for (const e of EXPECT) {
      const i = got.findIndex((g, k) => !used.has(k) && g[1] === e[1] && g[2] === e[2] && g[0].includes(e[0]));
      if (i >= 0) { used.add(i); exact++; continue; }
      const j = got.findIndex((g, k) => !used.has(k) && g[1] === e[1] && g[2] === e[2]);
      if (j >= 0) { used.add(j); qty++; }
    }
    return { ms: Math.round(performance.now() - t0), exact, qty, extra: got.length - used.size, people: p.people, text, lines, got };
  }, { cfg, EXPECT });
  const summary = `${cfg.name}：名前も分量も正しい ${r.exact}/16・分量だけ正しい ${r.qty}・よけいな行 ${r.extra}・人数 ${r.people}・${r.ms}ms`;
  console.log(summary);
  out.push(summary);
  notice(`OCR実験 ${cfg.name}`, `${summary}\n--- 文字\n${r.text}\n--- 行の確からしさ|文字\n${r.lines.join('\n')}`);
}
notice('OCR実験 まとめ', out.join('\n'));
await browser.close();
server.close();
