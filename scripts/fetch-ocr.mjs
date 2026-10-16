// 写真の読み取りソフト（Tesseract.js）と日本語のデータを npm から取ってきて、dist/ocr/<版>/ に置く
//   GitHub Actions で、ビルドのあとに動かす（Claude の作業環境からは npm に届かないので、ここでは動かさない）
//   版は src/client/ocr.mjs の OCR_VERSION。取ってきたファイルの版・大きさ・SHA-256 をログに出す
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { OCR_VERSION } = await import(pathToFileURL(join(ROOT, 'src/client/ocr.mjs')));
const OUT = join(ROOT, 'dist', 'ocr', OCR_VERSION);
const JPN_DATA = '@tesseract.js-data/jpn@1'; // 日本語のデータ（4.0.0_best_int を使う）
const TMP = mkdtempSync(join(tmpdir(), 'ocr-'));
const lines = []; // 用意したものの記録（ログと注釈に出す）

function pack(spec) {
  const info = JSON.parse(execFileSync('npm', ['pack', spec, '--json', '--pack-destination', TMP], { encoding: 'utf8' }))[0];
  const dir = join(TMP, info.name.replace(/[@/]/g, '_'));
  mkdirSync(dir, { recursive: true });
  execFileSync('tar', ['-xzf', join(TMP, info.filename), '-C', dir]);
  lines.push(`${info.name}@${info.version}`);
  return join(dir, 'package');
}
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
function put(from, to) {
  if (!existsSync(from)) throw new Error(`見つからない: ${from}`);
  mkdirSync(dirname(join(OUT, to)), { recursive: true });
  copyFileSync(from, join(OUT, to));
}

const main = pack(`tesseract.js@${OCR_VERSION}`);
put(join(main, 'dist/tesseract.min.js'), 'tesseract.min.js');
put(join(main, 'dist/worker.min.js'), 'worker.min.js');

const coreRange = JSON.parse(readFileSync(join(main, 'package.json'), 'utf8')).dependencies['tesseract.js-core'];
const core = pack(`tesseract.js-core@${coreRange}`);
for (const v of ['', '-simd', '-lstm', '-simd-lstm']) put(join(core, `tesseract-core${v}.wasm.js`), `core/tesseract-core${v}.wasm.js`);

const jpn = pack(JPN_DATA);
const data = walk(jpn).filter((f) => f.endsWith('/jpn.traineddata.gz'));
const best = data.find((f) => f.includes('4.0.0_best_int')) || data[0];
if (!best) throw new Error('jpn.traineddata.gz が見つからない');
lines.push(`日本語のデータ: ${best.slice(jpn.length + 1)}（ほか: ${data.map((f) => f.slice(jpn.length + 1)).join(', ')}）`);
put(best, 'lang/jpn.traineddata.gz');

rmSync(TMP, { recursive: true, force: true });
for (const f of walk(OUT)) {
  const buf = readFileSync(f);
  lines.push(`${f.slice(OUT.length + 1)}  ${(buf.length / 1024 / 1024).toFixed(2)}MB  sha256:${createHash('sha256').update(buf).digest('hex').slice(0, 16)}`);
}
console.log(`写真の読み取りソフトを用意しました:\n${lines.join('\n')}`);
// GitHub Actions では「注釈」にも出す（ログを開かなくても API で読めるように）
if (process.env.GITHUB_ACTIONS) console.log(`::notice title=写真の読み取りソフト::${lines.join('%0A')}`);
