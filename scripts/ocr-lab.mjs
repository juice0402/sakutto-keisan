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
  { name: 'A 前の前処理（白黒だけ）', psm: '6', opt: { lines: false, marks: false } },
  { name: 'B ＋下線を消す', psm: '6', opt: { lines: true, marks: false } },
  { name: 'C ＋下線と丸の印を消す（新しい既定）', psm: '6', opt: {} },
  { name: 'D ＋丸の印だけ消す', psm: '6', opt: { lines: false, marks: true } },
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
      const pic2 = ctx.getImageData(0, 0, w, h);
      const { cleanImage } = await import('/src/client/ocr.mjs');
      const tc = performance.now();
      cleanImage(pic2.data, w, h, cfg.opt);
      const prepMs = Math.round(performance.now() - tc);
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
      return { ms: Math.round(performance.now() - t0), prepMs, exact, qty, extra: got.length - used.size, n: pic.expect.length, text };
    }, { cfg, pic });
    res.push({ pic, r });
  }
  const line = `${cfg.name}：` + res.map(({ pic, r }) => `${pic.name} ${r.exact}+${r.qty}/${r.n}${r.extra ? `(余分${r.extra})` : ''}[前処理${r.prepMs}ms]`).join('・') + `・${Math.round(res.reduce((a, x) => a + x.r.ms, 0) / res.length)}ms`;
  console.log(line);
  out.push(line);
  notice(`OCR実験 ${cfg.name}`, `${line}\n` + res.map(({ pic, r }) => `--- ${pic.name}\n${r.text}`).join('\n'));
}
notice('OCR実験 まとめ（名前も分量も正しい+分量だけ正しい/全部）', out.join('\n'));
await browser.close();
server.close();
