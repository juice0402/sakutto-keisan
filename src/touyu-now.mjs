// 灯油代のページのはじめの値：scripts/fetch-touyu.mjs が取った .touyu/price.json の最新の週。なければ src/data/touyu.mjs の TOUYU_PRICE
// ビルドのときだけ使う（node:fs を使うので、ブラウザ用のスクリプトから読まない）
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOUYU_PRICE } from './data/touyu.mjs';

export const TOUYU_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '.touyu', 'price.json');

// → { can, date: '11月16日調査', line: ページの欄の下の1行 }。読めない・古い・おかしな値なら TOUYU_PRICE のまま
export function touyuNow(file = TOUYU_FILE, base = TOUYU_PRICE) {
  const keep = { ...base, line: `${base.date}・全国の店頭・18L` };
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return keep;
  }
  const w = Array.isArray(data?.weeks) ? data.weeks[data.weeks.length - 1] : null;
  if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(w.date) || !Number.isFinite(w.can) || w.can < 500 || w.can > 10000) return keep;
  if (w.date <= base.day) return keep;
  const [, m, d] = w.date.split('-').map(Number);
  const date = `${m}月${d}日調査`;
  return { ...base, can: Math.round(w.can), date, day: w.date, line: data.unit === '1L' ? `${date}・全国の店頭1Lの18倍` : `${date}・全国の店頭・18L` };
}
