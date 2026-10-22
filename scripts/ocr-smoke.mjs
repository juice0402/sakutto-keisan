// 写真の読み取りを、本物の読み取りソフトで確かめる（GitHub Actions のプルリクエストで動かす。Playwright を使う）
//   1. ページを開いただけでは読み取りソフトを読み込まない
//   2. スクショの写真から材料と分量が読める（読み取った文字はログに出す）
//   3. 読み取りのあいだ、このサイトのほかには通信しない（写真を送らない約束）
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.gz': 'application/gzip', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!p.startsWith(DIST) || !existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }).end(readFileSync(p));
}).listen(0, '127.0.0.1');
await new Promise((ok) => server.on('listening', ok));
const BASE = `http://127.0.0.1:${server.address().port}`;

const errors = [];
// GitHub Actions では結果を「注釈」にも出す（ログを開かなくても API で読めるように）
const notice = (title, text) => {
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=${title}::${String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
};
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) errors.push(msg); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
// AdSense のスクリプト（SITE.adsense を入れたページの head）は読まずに止める。広告の通信は読み取りとは関係がなく、
// 止めておけば、ほかの通信は下の「このサイトのほかに通信しない」でこれまでどおり見張れる
const AD_SCRIPT = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
await page.route((u) => u.href.startsWith(AD_SCRIPT), (r) => r.abort());
const requests = [];
page.on('request', (r) => { if (!r.url().startsWith(AD_SCRIPT)) requests.push(r.url()); });
page.on('pageerror', (e) => errors.push(`ページのエラー: ${e.message}`));

await page.goto(`${BASE}/recipe/`);
await page.waitForTimeout(500);
check(!requests.some((u) => u.includes('/ocr/')), 'ページを開いただけでは読み取りソフトを読み込まない');
await page.click('#to-paste');

// スクショ（白い背景・ダークモード・iPadの画面分割を材料のところだけ切り抜き）は必ず読めること。紙を撮った写真は結果を出すだけ
const SEVEN = [['もも肉', '300', 'g'], ['しょうゆ', '2', '大さじ'], ['水', '200', 'ml']];
const IPAD = [['鶏もも肉', '1', '枚'], ['ブロッコリー', '0.5', '個'], ['牛乳', '2.5', 'カップ'], ['ローリエ', '1', '枚'], ['こしょう', '', '少々'], ['サラダ油', '1', '大さじ']];
// 実物の iPad のスクショと同じ大きさ（文字の高さ 約23px・下線が文字のすぐ下・商品名に ®）
const REAL = [['やさしい塩', '0.5', '小さじ'], ['コンソメ固形タイプ', '1', '個'], ['バター', '2', '大さじ'], ['サラダ油', '1', '大さじ']];
const PICS = [
  ['recipe-screenshot.png', SEVEN, 7, 2],
  ['recipe-dark.png', SEVEN, 7, 2],
  ['recipe-ipad.png', IPAD, 16, 4, [228 / 1500, 280 / 2000, 1, 1880 / 2000]],
  ['recipe-ipad-real.png', REAL, 16, 4, [262 / 1536, 280 / 2048, 1498 / 1536, 1860 / 2048]],
  ['recipe-photo.jpg', null],
];
for (const [file, expect, count, people, crop] of PICS) {
  const t0 = Date.now();
  await page.setInputFiles('#photo', join(ROOT, 'tests/fixtures', file));
  await page.waitForFunction(() => document.getElementById('crop-img').complete && document.getElementById('crop-img').naturalWidth > 0);
  if (crop) {
    // 四すみの丸を動かして、材料のところだけを囲む
    const box = await page.locator('#crop-img').boundingBox();
    for (const [h, fx, fy] of [['nw', crop[0], crop[1]], ['se', crop[2], crop[3]]]) {
      const hb = await page.locator(`.crop-h[data-h="${h}"]`).boundingBox();
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 6 });
      await page.mouse.up();
    }
  }
  await page.click('#crop-go');
  await page.waitForFunction(() => {
    const s = document.getElementById('ocr-text').textContent;
    return /見つかりました|見つかりませんでした|読み取れませんでした/.test(s) && !document.getElementById('photo-btn').classList.contains('is-busy');
  }, null, { timeout: 240000 });
  const status = await page.textContent('#ocr-text');
  const text = await page.inputValue('#paste-text');
  const report = `${file}（${((Date.now() - t0) / 1000).toFixed(1)}秒）\n${status}\n${text}`;
  console.log(`\n--- ${report}\n---`);
  notice(`写真の読み取り ${file}`, report);
  if (!expect) continue;
  check(/個見つかりました/.test(status), `${file}：読み取れた`);
  await page.click('#paste-go');
  const rows = await page.evaluate(() => Array.from({ length: 20 }, (_, i) => i + 1).map((n) => [document.getElementById(`name-${n}`).value, document.getElementById(`amt-${n}`).value, document.getElementById(`unit-${n}`).value]).filter((r) => r[0] || r[1]));
  console.log('材料に入れた結果:', JSON.stringify(rows));
  const has = (name, amt, unit) => rows.some((r) => r[0].includes(name) && r[1] === amt && r[2] === unit);
  for (const [name, amt, unit] of expect) check(has(name, amt, unit), `${file}：${name} ${amt}${unit}`);
  check(rows.length === count, `${file}：材料の数 ${rows.length}（${count}）`);
  check((await page.inputValue('#from')) === String(people), `${file}：${people}人分のレシピ`);
  await page.click('#to-paste');
}
notice('読み込んだ読み取りソフトのファイル', [...new Set(requests.filter((u) => u.includes('/ocr/')).map((u) => u.slice(BASE.length)))].join('\n'));
const others = [...new Set(requests.filter((u) => !u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')))];
check(others.length === 0, `このサイトのほかに通信しない ${others.join(' ')}`);

await browser.close();
server.close();
if (errors.length) {
  console.error(`\n✗ ${errors.length} 件の問題:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log('\n✓ 写真の読み取りのテストに通りました');
