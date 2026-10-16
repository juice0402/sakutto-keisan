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
const requests = [];
page.on('request', (r) => requests.push(r.url()));
page.on('pageerror', (e) => errors.push(`ページのエラー: ${e.message}`));

await page.goto(`${BASE}/recipe/`);
await page.waitForTimeout(500);
check(!requests.some((u) => u.includes('/ocr/')), 'ページを開いただけでは読み取りソフトを読み込まない');
await page.click('#to-paste');

for (const [file, strict] of [['recipe-screenshot.png', true], ['recipe-photo.jpg', false]]) {
  const t0 = Date.now();
  await page.setInputFiles('#photo', join(ROOT, 'tests/fixtures', file));
  await page.waitForFunction(() => {
    const s = document.getElementById('ocr-text').textContent;
    return /読み取りました|見つかりませんでした|できませんでした/.test(s) && !document.getElementById('photo-btn').classList.contains('is-busy');
  }, null, { timeout: 240000 });
  const status = await page.textContent('#ocr-text');
  const text = await page.inputValue('#paste-text');
  const report = `${file}（${((Date.now() - t0) / 1000).toFixed(1)}秒）\n${status}\n${text}`;
  console.log(`\n--- ${report}\n---`);
  notice(`写真の読み取り ${file}`, report);
  if (!strict) continue;
  check(/読み取りました/.test(status), `${file}：読み取れた`);
  await page.click('#paste-go');
  const rows = await page.evaluate(() => [1, 2, 3, 4, 5, 6, 7].map((n) => [document.getElementById(`name-${n}`).value, document.getElementById(`amt-${n}`).value, document.getElementById(`unit-${n}`).value]));
  console.log('材料に入れた結果:', JSON.stringify(rows));
  notice(`材料に入れた結果 ${file}`, rows.map((r) => r.join(' ')).join('\n'));
  const has = (name, amt, unit) => rows.some((r) => r[0].includes(name) && r[1] === amt && r[2] === unit);
  check(has('もも肉', '300', 'g'), `${file}：鶏もも肉 300g`);
  check(has('しょうゆ', '2', '大さじ'), `${file}：しょうゆ 大さじ2`);
  check(has('水', '200', 'ml'), `${file}：水 200ml`);
  check((await page.inputValue('#from')) === '2', `${file}：2人分のレシピ`);
  await page.click('#to-paste');
}
const others = [...new Set(requests.filter((u) => !u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')))];
check(others.length === 0, `このサイトのほかに通信しない ${others.join(' ')}`);

await browser.close();
server.close();
if (errors.length) {
  console.error(`\n✗ ${errors.length} 件の問題:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log('\n✓ 写真の読み取りのテストに通りました');
