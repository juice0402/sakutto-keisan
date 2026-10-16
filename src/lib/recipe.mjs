import { fix, fmt } from './number.mjs';

// レシピの人数換算（ブラウザとテストの両方で使う）

// 数える単位（½・⅓ などの分数で出す）
const PIECE_UNITS = ['個', '本', '枚', '片', '合', '袋', 'パック', '束', '缶', '切れ', '丁', '玉', '房', '株', '尾', '杯'];
export const RECIPE_UNITS = ['g', 'ml', '大さじ', '小さじ', 'カップ', ...PIECE_UNITS, 'cm', '少々', '適量'];
const NO_AMOUNT = new Set(['少々', '適量']); // 分量を入れない単位（人数が変わってもそのまま）
const PIECE = new Set(PIECE_UNITS);
const DECIMAL_UNITS = new Set(['g', 'ml', 'cm']); // 小数で出す単位

const FRACS = [
  [0, ''], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, ''],
];

/** 倍率：作る人数 ÷ レシピの人数 */
export function peopleRatio(from, to) {
  if (from === null || to === null) return { ok: false, empty: true };
  if (Number.isNaN(from) || from <= 0) return { ok: false, error: 'レシピの人数は0より大きい数字で入れてください。' };
  if (Number.isNaN(to) || to <= 0) return { ok: false, error: '作る人数は0より大きい数字で入れてください。' };
  return { ok: true, ratio: fix(to / from) };
}

/** 倍率：手元にある量 ÷ レシピの量（その材料に合わせる） */
export function haveRatio(orig, have) {
  if (orig === null || have === null) return { ok: false, empty: true };
  if (Number.isNaN(orig) || orig <= 0) return { ok: false, error: '合わせる材料の分量を入れてください。' };
  if (Number.isNaN(have) || have <= 0) return { ok: false, error: '手元にある量は0より大きい数字で入れてください。' };
  return { ok: true, ratio: fix(have / orig) };
}

/** いちばん近い「整数＋¼・⅓・½・⅔・¾」にする。{ text: '1と½', approx: ちょうどでないとき true } */
export function toFraction(x) {
  let whole = Math.floor(x + 1e-9);
  const rest = x - whole;
  let best = FRACS[0];
  for (const f of FRACS) if (Math.abs(rest - f[0]) < Math.abs(rest - best[0])) best = f;
  if (best[0] === 1) {
    whole += 1;
    best = FRACS[0];
  }
  const approx = Math.abs(whole + best[0] - x) > 0.01;
  const text = whole === 0 ? best[1] || '0' : best[1] ? `${whole}と${best[1]}` : String(whole);
  return { text, approx };
}

/** 分量を、料理で使いやすい書き方にする（大さじ⇔小さじ、分数、少々）。approx：ちょうどでないので「約」をつける。sub：カップのml */
export function formatAmount(value, unit) {
  if (NO_AMOUNT.has(unit)) return { text: unit, approx: false };
  if (DECIMAL_UNITS.has(unit)) {
    const v = value < 1 ? fmt(value, 2) : value < 10 ? fmt(value, 1) : fmt(Math.round(value), 0);
    return { text: `${v}${unit}`, approx: false };
  }
  if (unit === '大さじ' || unit === '小さじ') {
    const tsp = unit === '大さじ' ? value * 3 : value; // 小さじにそろえる（大さじ1＝小さじ3）
    if (tsp < 0.25 - 1e-9) return { text: '少々', approx: false };
    const big = toFraction(tsp / 3);
    const small = toFraction(tsp);
    // 元が大さじなら大さじ½まで、元が小さじなら小さじ3（＝大さじ1）からが大さじ。
    // ただし大さじだと半端で、小さじならちょうどのとき（小さじ2と½ など）は小さじ
    let useBig = unit === '大さじ' ? tsp >= 1.5 - 1e-9 : tsp >= 3 - 1e-9;
    if (useBig && big.approx && !small.approx && tsp < 6) useBig = false;
    return useBig ? { text: `大さじ${big.text}`, approx: big.approx } : { text: `小さじ${small.text}`, approx: small.approx };
  }
  if (unit === 'カップ') {
    const ml = `${fmt(Math.round(value * 200), 0)}ml`; // 1カップ＝200ml
    if (value < 0.25 - 1e-9) return { text: ml, approx: false };
    const f = toFraction(value);
    return { text: `${f.text}カップ`, approx: f.approx, sub: ml };
  }
  if (PIECE.has(unit)) {
    const f = toFraction(value);
    if (f.text === '0') return { text: `${fmt(value, 2)}${unit}`, approx: false };
    return { text: `${f.text}${unit}`, approx: f.approx };
  }
  return { text: `${fmt(value, 2)}${unit}`, approx: false };
}

/** 入れたままの分量の書き方（「元 大さじ2」「元 1.2カップ」の表示用）。0.5→½ のようにちょうどの分数だけ分数にする */
export function rawAmount(value, unit) {
  if (NO_AMOUNT.has(unit)) return unit;
  let v = fmt(value, 3);
  if (!DECIMAL_UNITS.has(unit)) {
    const f = toFraction(value);
    if (!f.approx && f.text !== '0') v = f.text;
  }
  return unit === '大さじ' || unit === '小さじ' ? `${unit}${v}` : `${v}${unit}`;
}

/**
 * 材料の分量に倍率をかける
 * @param {{name:string, amount:number|null, unit:string}[]} rows
 * @returns {{name:string, unit:string, from?:string, to:string, approx:boolean, sub?:string, error?:string}[]} 空の行は入れない
 */
export function scaleRecipe(rows, ratio) {
  const out = [];
  rows.forEach((r, i) => {
    const name = (r.name || '').trim() || `材料${i + 1}`;
    if (NO_AMOUNT.has(r.unit)) {
      if ((r.name || '').trim() || r.amount !== null) out.push({ name, unit: r.unit, to: r.unit, approx: false });
      return;
    }
    if (r.amount === null) return;
    if (Number.isNaN(r.amount) || r.amount <= 0) {
      out.push({ name, unit: r.unit, to: '', approx: false, error: '分量は0より大きい数字で入れてください。' });
      return;
    }
    const f = formatAmount(fix(r.amount * ratio), r.unit);
    out.push({ name, unit: r.unit, from: rawAmount(r.amount, r.unit), to: f.text, approx: f.approx, sub: f.sub });
  });
  return out;
}

/* ---- レシピの文字から材料を読み取る（貼り付け入力。端末の中だけで読む） ---- */

// 分量の数字：1と1/2・1・1/2・1 1/2・1/2・1.5
const QTY_NUM = '\\d+\\s*(?:と|・|\\s)\\s*\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?';
const QTY_RANGE = `(?:${QTY_NUM})(?:\\s*[~〜\\-]\\s*(?:${QTY_NUM}))?`; // 2〜3個 は 2 で読む
// 書き方のゆれ → このツールの単位（kg・L はあとで g・ml に直す）
const UNIT_ALIAS = {
  キログラム: 'kg', キロ: 'kg', kg: 'kg', グラム: 'g', g: 'g',
  ミリリットル: 'ml', ml: 'ml', cc: 'ml', リットル: 'L', l: 'L', カップ: 'カップ', cup: 'カップ',
  個: '個', こ: '個', コ: '個', 本: '本', 枚: '枚', 片: '片', かけ: '片', 合: '合',
  袋: '袋', パック: 'パック', 束: '束', 缶: '缶', 切れ: '切れ', 切: '切れ', 丁: '丁', 玉: '玉', 房: '房', 株: '株', 尾: '尾', 杯: '杯',
  センチ: 'cm', cm: 'cm',
};
const UNIT_ALT = Object.keys(UNIT_ALIAS).sort((a, b) => b.length - a.length).join('|');
const SPOON_RE = new RegExp(`(大さじ|小さじ|大匙|小匙|大|小)\\s*(${QTY_RANGE})(?!\\s*(?:個|本|枚|切れ|玉|房|株|尾|丁|袋|パック|缶|束))`);
const CUP_FIRST_RE = new RegExp(`(?:カップ|cup)\\s*(${QTY_RANGE})`);
const NUM_UNIT_RE = new RegExp(`(${QTY_RANGE})\\s*(${UNIT_ALT})`);
const FEW_RE = /(少々|少量|ひとつまみ|ひとつかみ|少し|適量|適宜|お好みで|お好み|好みで)/;
const PEOPLE_RE = /(\d+(?:\.\d+)?)\s*(?:[~〜-]\s*\d+(?:\.\d+)?)?\s*人\s*(?:分|前)/;
const STOP_RE = /^(作り方|つくり方|作りかた|手順|下ごしらえ|下準備|ポイント|コツ)/;
const CLOCK_RE = /\d{1,2}:\d{2}/;
const JA_NAME_RE = /[\u3040-\u30ff\u3400-\u9fff々]/;
const NOTE_RE = /です|ください|ます(。|$)|。.{0,2}$|は、/;
const HEADER_RE = /^(材料|調味料|合わせ調味料|下味|たれ|タレ|ソース|ドレッシング|トッピング|飾り|仕上げ|具|具材)$/;
const VULGAR = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4' };

/** 「1と1/2」「1/2」「2〜3」などを数字に */
function qtyValue(text) {
  const first = text.split(/[~〜-]/)[0].trim();
  const m = first.match(/^(\d+)\s*(?:と|・|\s)\s*(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  const f = first.match(/^(\d+)\/(\d+)$/);
  if (f) return Number(f[2]) > 0 ? Number(f[1]) / Number(f[2]) : NaN;
  return Number(first);
}

/** 1行を { name, amount, unit } に。分量が見つからなければ unit は null */
function readLine(line) {
  // かっこの中（「1枚（300g）」の 300g など）より、かっこの外の分量を先に使う
  const outside = line.replace(/[(（[【][^)）\]】]*[)）\]】]/g, (m) => ' '.repeat(m.length));
  const lower = (t) => t.toLowerCase();
  const find = (t) => {
    const hits = [];
    const sp = lower(t).match(SPOON_RE);
    if (sp) hits.push({ index: sp.index, len: sp[0].length, unit: sp[1].startsWith('大') ? '大さじ' : '小さじ', qty: sp[2] });
    const cf = lower(t).match(CUP_FIRST_RE);
    if (cf) hits.push({ index: cf.index, len: cf[0].length, unit: 'カップ', qty: cf[1] });
    const nu = lower(t).match(NUM_UNIT_RE);
    if (nu) hits.push({ index: nu.index, len: nu[0].length, unit: UNIT_ALIAS[nu[2]], qty: nu[1] });
    const fw = t.match(FEW_RE);
    if (fw) hits.push({ index: fw.index, len: fw[0].length, unit: /少|ひとつ/.test(fw[1]) ? '少々' : '適量', qty: null });
    return hits.sort((a, b) => a.index - b.index)[0];
  };
  const hit = find(outside) || find(line);
  if (!hit) return { name: line, amount: null, unit: null };
  let amount = hit.qty === null ? null : qtyValue(hit.qty);
  let unit = hit.unit;
  if (unit === 'kg') [amount, unit] = [amount * 1000, 'g'];
  if (unit === 'L') [amount, unit] = [amount * 1000, 'ml'];
  if (amount !== null) amount = Number(amount.toFixed(3));
  const name = line
    .slice(0, hit.index)
    .replace(/[「」『』®™©]/g, '') // 商品名のかぎかっこ・®（写真では「?」に読まれやすい）
    .replace(/^の(?=[\u30a0-\u30ff\u3400-\u9fff])/, '') // 黒い丸のⒶⒷは写真では「の」に読まれやすい（「のり」のようにひらがなが続くときはそのまま）
    .replace(/[\s…‥・.:：=＝\-─―~〜?？]+$/, '')
    .replace(/約$/, '')
    .trim();
  return { name, amount, unit };
}

/**
 * 貼り付けたレシピの文字から、人数と材料を読み取る
 * 「鶏もも肉 300g」の1行の形も、「鶏もも肉」「300g」が2行に分かれた形（レシピサイトをコピーしたとき）も読む
 * @returns {{ people: number|null, rows: {name:string, amount:number|null, unit:string}[], skipped: string[] }}
 */
export function parseRecipeText(text) {
  let people = null;
  const rows = [];
  const skipped = [];
  let pending = null; // 分量がまだ見つかっていない材料の名前（次の行が分量のことがある）
  const flush = () => {
    if (pending !== null && !isHeader(pending) && looksLikeName(pending)) skipped.push(pending);
    pending = null;
  };
  const push = (name, amount, unit) => {
    // 「しょうゆ・みりん 各大さじ1」→ 2つに分ける
    const names = /各$/.test(name) ? name.replace(/各$/, '').split(/[、,・/]/).map((x) => x.trim()).filter(Boolean) : [name];
    (names.length ? names : ['']).forEach((nm) => rows.push({ name: nm.slice(0, 20), amount, unit }));
  };
  const normalized = String(text)
    .replace(/(\d)([½⅓⅔¼¾])/g, '$1と$2')
    .replace(/[½⅓⅔¼¾]/g, (c) => VULGAR[c])
    .normalize('NFKC')
    .replace(/⁄/g, '/');
  for (const raw of normalized.split(/\r?\n/)) {
    if (/^\s*※/.test(raw)) { // 「※」で始まる注意書き（「＊」は箇条書きにも使うので、文の形かどうかで見る）
      flush();
      continue;
    }
    let line = raw
      .replace(/\t/g, ' ')
      .replace(/^[\s・●○◯◎◉◆◇■□★☆※＊*•▪\-–—>]+/, '')
      .replace(/^[(\[<〈【]\s*[a-z]\s*[)\]>〉】]\s*/i, '') // (A) 【B】 などの印
      .replace(/^[a-z]\s+(?=\S)/i, '')
      .trim();
    if (!line) continue;
    if (STOP_RE.test(line)) break; // ここから下は作り方
    if (NOTE_RE.test(line)) { // 「＊ 固形1個は、顆粒で小さじ2杯です。」のような注意書きは材料にしない
      flush();
      continue;
    }
    const pm = line.match(PEOPLE_RE);
    if (pm) {
      if (people === null) people = Number(pm[1]);
      flush();
      continue;
    }
    if (CLOCK_RE.test(line)) continue; // 時刻の入った行（スクショのいちばん上の時計など）
    const r = readLine(line);
    if (r.name && r.name.length < 4 && !JA_NAME_RE.test(r.name)) { // 日本語のない短い名前は、写真の読み取りのゴミ（「ml 4G」の ml など）
      flush();
      continue;
    }
    if (r.unit === null) {
      flush();
      pending = line;
      continue;
    }
    if (!r.name && pending !== null) {
      push(pending, r.amount, r.unit); // 「鶏もも肉」の次の行が「300g」
      pending = null;
      continue;
    }
    flush();
    push(r.name, r.amount, r.unit);
  }
  flush();
  return { people, rows, skipped };
}

/** 材料の名前らしい行（日本語が多くて短い）。写真の読み取りで出たゴミのような行は、読み取れなかった行として出さない */
function looksLikeName(line) {
  const ja = (line.match(/[\u3040-\u30ff\u3400-\u9fff々]/g) || []).length;
  return line.length <= 15 && ja >= Math.max(1, line.replace(/\s/g, '').length * 0.85);
}

/** 見出しの行（「調味料」「(A)」「【たれ】」など）は、読み取れなかった行に数えない */
function isHeader(line) {
  return line.length <= 1 || /^[(\[<〈【《「]/.test(line) || /[:：]$/.test(line) || HEADER_RE.test(line);
}

// 日本語の文字（ひらがな・カタカナ・漢字・全角の記号）
const JA_CHAR = '[\\u3000-\\u30ff\\u3400-\\u9fff\\uff00-\\uffef々〆]';
const JA_GAP_RE = new RegExp(`(${JA_CHAR})[ \\t]+(?=${JA_CHAR})`, 'g');

// 写真では「1/2」の「/」が「7」に読まれやすい（「172個」「小さじ172」）。家庭のレシピでは 172個 はまずないので分数にもどす
const SLASH7_RE = /(^|[^\d.\/])([1-3])7([2-4])(?=\s*(?:個|本|枚|片|カップ|袋|パック|束|缶|切れ|丁|玉|房|株|尾|杯|合))|((?:大さじ|小さじ)\s*)([1-3])7([2-4])(?!\d)/g;
// 黒い丸のⒶⒷ・①などの印（写真では「の⑳」「の」に読まれやすい）
const MARK_RE = /^(?:[の\u2460-\u24ff\u3251-\u32bf◎○●◯]{1,3}\s+)+/;

/** 写真から読み取った文字を整える（「鶏 も も 肉」のような日本語の間の空白を取る・続いた空白は1つに・空の行を取る・よくある読みまちがいを直す） */
export function cleanOcrText(text) {
  return String(text)
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(MARK_RE, '')
        .replace(/[\u2460-\u24ff$®™©]/g, '') // 丸の印・®（写真では「$」に読まれやすい）
        .replace(/([\u3040-\u30ff\u3400-\u9fff」』])[?？](?=\s|$)/g, '$1') // 「ほんじお®」の ® →「?」
        .replace(JA_GAP_RE, '$1')
        .replace(JA_GAP_RE, '$1')
        .replace(/[ \t\u3000]{2,}/g, ' ')
        .replace(SLASH7_RE, (m, a, n, d, sp, n2, d2) => (sp !== undefined ? `${sp}${n2}/${d2}` : `${a}${n}/${d}`))
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}
