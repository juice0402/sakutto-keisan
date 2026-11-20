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

// ---------- 灯油の値段の記録（灯油代のページの「灯油の値段の記録」の節。#180） ----------
const DAY_MS = 86400000;
const okWeek = (w) => w && /^\d{4}-\d{2}-\d{2}$/.test(w.date) && Number.isFinite(w.can) && w.can >= 500 && w.can <= 10000;

// 冬は10月から翌年3月まで。冬の名前は始まりの年（2026年10月〜2027年3月 → 2026）。4〜9月は null
export function winterOf(date) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  return m >= 10 ? y : m <= 3 ? y - 1 : null;
}
// その冬の10月1日から何日め（0〜182）
export const winterDay = (date, year) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${year}-10-01T00:00:00Z`)) / DAY_MS);

// 週ごとの値段（{ date, can } 18L）→ { cur, prev, rows }
//   cur・prev：この冬と前の冬 { year, weeks }（前の冬の週がなければ prev は null）
//   rows：直近 n 週（新しい順）{ date, can, diff }。diff は前の週からの差（前の週がなければ null）
// いちばん新しい週が冬（10月〜3月）でなければ null（節を出さない）
export function touyuRecord(weeks, n = 12) {
  const all = (Array.isArray(weeks) ? weeks : []).filter(okWeek).map((w) => ({ date: w.date, can: Math.round(w.can) })).sort((a, b) => a.date.localeCompare(b.date));
  const last = all[all.length - 1];
  if (!last) return null;
  const year = winterOf(last.date);
  if (year === null) return null;
  const of = (y) => all.filter((w) => winterOf(w.date) === y);
  const prevWeeks = of(year - 1);
  const rows = all.slice(-n).map((w, i, list) => {
    const before = i > 0 ? list[i - 1] : all[all.length - list.length - 1];
    return { date: w.date, can: w.can, diff: before ? w.can - before.can : null };
  });
  return { cur: { year, weeks: of(year) }, prev: prevWeeks.length ? { year: year - 1, weeks: prevWeeks } : null, rows: rows.reverse() };
}

// .touyu/price.json から記録。取れなかった・読めない・はじめの値より古いときは null（節を出さない）
export function touyuHistory(file = TOUYU_FILE, base = TOUYU_PRICE) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  const rec = touyuRecord(data?.weeks);
  if (!rec || rec.rows[0].date <= base.day) return null;
  return { ...rec, unit: data.unit === '1L' ? '1L' : '18L' };
}
