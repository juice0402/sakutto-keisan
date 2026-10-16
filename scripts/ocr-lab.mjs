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

const SEVEN = [['鶏もも肉', 300, 'g'], ['玉ねぎ', 0.5, '個'], ['しょうゆ', 2, '大さじ'], ['砂糖', 1, '大さじ'], ['酒', 1, '大さじ'], ['塩', null, '少々'], ['水', 200, 'ml']];
const IPAD = [['鶏もも肉', 1, '枚'], ['塩', 0.5, '小さじ'], ['じゃがいも', 2, '個'], ['玉ねぎ', 1, '個'], ['にんじん', 1, '本'], ['ブロッコリー', 0.5, '個'], ['薄力粉', 3, '大さじ'], ['牛乳', 2.5, 'カップ'], ['水', 2, 'カップ'], ['固形コンソメ', 1, '個'], ['ローリエ', 1, '枚'], ['塩', 1, '小さじ'], ['こしょう', null, '少々'], ['白ワイン', 1, '大さじ'], ['バター', 2, '大さじ'], ['サラダ油', 1, '大さじ']];
const PICS = [
  { name: 'iPad全体', file: 'recipe-ipad.png', expect: IPAD },
  { name: 'iPad切り抜き', file: 'recipe-ipad.png', crop: [228, 280, 1272, 1600], expect: IPAD },
  { name: 'スクショ', file: 'recipe-screenshot.png', expect: SEVEN },
  { name: 'ダーク', file: 'recipe-dark.png', expect: SEVEN },
  { name: '紙の写真', file: 'recipe-photo.jpg', expect: SEVEN },
];
const CONFIGS = [
  { name: '1 いま（PSM3）', psm: '3', prep: 'stretch', line: false },
  { name: '2 PSM6', psm: '6', prep: 'stretch', line: false },
  { name: '3 PSM6・下線を消す', psm: '6', prep: 'stretch', line: true },
  { name: '4 PSM6・下線・1.5倍', psm: '6', prep: 'stretch', line: true, scale: 1.5 },
  { name: '5 PSM6・二値化・下線', psm: '6', prep: 'otsu', line: true },
  { name: '6 PSM4・下線', psm: '4', prep: 'stretch', line: true },
];
const out = [];
for (const cfg of CONFIGS) {
  const res = [];
  for (const pic of PICS) {
    const r = await page.evaluate(async ({ cfg, pic }) => {
      const { parseRecipeText, cleanOcrText } = await import('/src/lib/recipe.mjs');
      const img = new Image();
      img.src = `/fixtures/${pic.file}`;
      await img.decode();
      const [sx, sy, sw, sh] = pic.crop || [0, 0, img.naturalWidth, img.naturalHeight];
      const long = Math.max(sw, sh);
      let scale = long > 2400 ? 2400 / long : long < 1000 ? 2 : 1;
      if (cfg.scale) scale *= cfg.scale;
      const w = Math.round(sw * scale), h = Math.round(sh * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      const pic2 = ctx.getImageData(0, 0, w, h); const px = pic2.data; const hist = new Uint32Array(256);
      for (let i = 0; i < px.length; i += 4) { const y = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8; px[i] = y; hist[y]++; }
      const total = px.length / 4;
      let lo = 0, hi = 255, sum = 0;
      for (let acc = 0; lo < 255 && acc + hist[lo] < total * 0.01; lo++) acc += hist[lo];
      for (let acc = 0; hi > 0 && acc + hist[hi] < total * 0.01; hi--) acc += hist[hi];
      for (let v = 0; v < 256; v++) sum += v * hist[v];
      const invert = sum / total < 110; const span = Math.max(1, hi - lo);
      let th = 128;
      if (cfg.prep === 'otsu') { let best = -1, wB = 0, sB = 0; for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF; const v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = t; } } }
      for (let i = 0; i < px.length; i += 4) {
        let y = cfg.prep === 'otsu' ? (px[i] > th ? 255 : 0) : Math.max(0, Math.min(255, ((px[i] - lo) * 255) / span));
        if (invert) y = 255 - y;
        px[i] = px[i + 1] = px[i + 2] = y;
      }
      if (cfg.line) {
        // 下線などの細長い横線を消す（上下3pxが明るい、長い黒の並び）
        const dark = (x, y) => px[(y * w + x) * 4] < 128;
        const minRun = Math.max(24, Math.round(w * 0.03));
        for (let y = 3; y < h - 3; y++) {
          let x = 0;
          while (x < w) {
            if (!dark(x, y)) { x++; continue; }
            let e = x;
            while (e < w && dark(e, y)) e++;
            if (e - x >= minRun) {
              let thin = 0;
              for (let k = x; k < e; k++) if (!dark(k, y - 3) && !dark(k, y + 3)) thin++;
              if (thin >= (e - x) * 0.85) for (let k = x; k < e; k++) { const j = (y * w + k) * 4; px[j] = px[j + 1] = px[j + 2] = 255; }
            }
            x = e;
          }
        }
      }
      ctx.putImageData(pic2, 0, 0);
      const t0 = performance.now();
      const wk = await Tesseract.createWorker('jpn', 1, { workerPath: '/ocr/5.1.1/worker.min.js', corePath: '/ocr/5.1.1/core', langPath: '/ocr/5.1.1/lang', workerBlobURL: false });
      await wk.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: cfg.psm });
      const { data } = await wk.recognize(c);
      await wk.terminate();
      const text = cleanOcrText(data.text);
      const p = parseRecipeText(text);
      const got = p.rows.map((x) => [x.name, x.amount, x.unit]);
      const used = new Set();
      let qty = 0, exact = 0;
      for (const e of pic.expect) {
        const i = got.findIndex((g, k) => !used.has(k) && g[1] === e[1] && g[2] === e[2] && g[0] === e[0]);
        if (i >= 0) { used.add(i); exact++; continue; }
        const j = got.findIndex((g, k) => !used.has(k) && g[1] === e[1] && g[2] === e[2]);
        if (j >= 0) { used.add(j); qty++; }
      }
      return { ms: Math.round(performance.now() - t0), exact, qty, extra: got.length - used.size, n: pic.expect.length, text };
    }, { cfg, pic });
    res.push({ pic, r });
  }
  const line = `${cfg.name}：` + res.map(({ pic, r }) => `${pic.name} ${r.exact}+${r.qty}/${r.n}${r.extra ? `(余分${r.extra})` : ''}`).join('・') + `・${Math.round(res.reduce((a, x) => a + x.r.ms, 0) / res.length)}ms`;
  console.log(line);
  out.push(line);
  notice(`OCR実験 ${cfg.name}`, `${line}\n` + res.map(({ pic, r }) => `--- ${pic.name}\n${r.text}`).join('\n'));
}
notice('OCR実験 まとめ（名前も分量も正しい+分量だけ正しい/全部）', out.join('\n'));
await browser.close();
server.close();
